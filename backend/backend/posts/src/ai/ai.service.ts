import { Injectable } from '@nestjs/common';
import type { Message } from './dto/chat.dto';
import { ChatDeepSeek } from '@langchain/deepseek';
import { SystemMessage, HumanMessage, AIMessage } from 'langchain';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { getRuntimeEnv } from '../config/env';
import { publicMediaUrl } from '../config/public-url';
import { AIRequestTimeoutError, withTimeout } from './ai-timeout';

// 三期·语义搜索返回条数(可调)
const SEARCH_TOP_K = 3;
// 三期·chat 引用相似度阈值(§5.4):仅 sim≥此值的帖才算「相关引用」,宁缺毋滥、避免跨游戏凑数。
//   3-small 实测:对版相关帖 0.5~0.7、无关 query 最高 ~0.33(断崖在 0.33~0.45 之间),取 0.5 偏严;验收可微调。
//   只作用于 chat 引用(retrieveCitations);search 不用阈值(搜索结果看排序、容忍度高)。
const CITATION_MIN_SIM = 0.5;

export function convertToLangChainMessages(
  messages: Message[],
): (HumanMessage | AIMessage | SystemMessage)[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      case 'system':
        return new SystemMessage(msg.content);
      default:
        throw new Error(`Unsupported role: ${msg.role}`);
    }
  });
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  const normV1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
  const normV2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normV1 * normV2);
}

@Injectable()
export class AIService {
  private chatModel: ChatDeepSeek;
  private chatTimeoutMs: number;
  constructor(
    private prisma: PrismaService,
    private embedding: EmbeddingService,
  ) {
    const { deepseek, aiTimeouts } = getRuntimeEnv();
    this.chatTimeoutMs = aiTimeouts.chat;
    this.chatModel = new ChatDeepSeek({
      configuration: {
        apiKey: deepseek.apiKey,
        baseURL: deepseek.baseUrl,
        timeout: this.chatTimeoutMs,
        maxRetries: 0,
      },
      model: deepseek.model,
      temperature: 0.7,
      streaming: true,
      timeout: this.chatTimeoutMs,
      maxRetries: 0,
    });
  }

  // 三期·站内检索增强(§5.2 RAG-lite,只用标题向量):
  //   取最新 user 消息 → 标题向量检索 topK → 命中拼 SystemMessage 作上下文 → DeepSeek 流式回答。
  //   onCite 把命中帖子({id,title})回传 controller 做可点引用(§5.4)。
  //   检索失败降级为「无检索普通聊天」、绝不阻塞 chat(retrieveCitations 内部已 catch)。
  async chat(
    messages: Message[],
    onToken: (token: string) => void,
    onCite?: (citations: { id: number; title: string }[]) => void,
  ) {
    const citations = await this.retrieveCitations(messages);

    // 命中则在最前插入 system prompt(convertToLangChainMessages 已支持 system 角色)
    const finalMessages: Message[] = citations.length
      ? [
          { role: 'system', content: this.buildRagSystemPrompt(citations) },
          ...messages,
        ]
      : messages;

    // 引用回传(流式前发,annotation 早于 text part;无命中则不发)
    if (onCite && citations.length) {
      onCite(citations.map((c) => ({ id: c.id, title: c.title })));
    }

    const langChainMessages = convertToLangChainMessages(finalMessages);
    const controller = new AbortController();
    const abortTimer = setTimeout(
      () => controller.abort(new AIRequestTimeoutError('chat')),
      this.chatTimeoutMs,
    );
    try {
      await withTimeout(
        (async () => {
          const stream = await this.chatModel.stream(langChainMessages, {
            signal: controller.signal,
          });
          for await (const chunk of stream) {
            const content = chunk.content as string; // 断言 内容一定为字符串
            if (content) {
              onToken(content);
            }
          }
        })(),
        this.chatTimeoutMs,
        'chat',
      );
    } finally {
      clearTimeout(abortTimer);
    }
  }

  // §5.2:对最新 user 消息做标题向量检索,返回命中帖子(id/title/brief);失败降级空数组、不抛(不阻塞 chat)。
  private async retrieveCitations(
    messages: Message[],
  ): Promise<{ id: number; title: string; brief: string }[]> {
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser || !lastUser.content) {
        return [];
      }

      // 检索 topK 后按阈值过滤:仅保留 sim≥CITATION_MIN_SIM 的「真相关」帖(§5.4 宁缺毋滥)
      const ids = (await this.retrieveTopK(lastUser.content))
        .filter((r) => r.sim >= CITATION_MIN_SIM)
        .map((r) => r.id);
      if (ids.length === 0) {
        return [];
      }

      const hits = await this.prisma.post.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, content: true },
      });
      const byId = new Map(hits.map((p) => [p.id, p]));
      return ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          id: p.id,
          title: p.title,
          brief: p.content ? p.content.substring(0, 100) : '',
        }));
    } catch (err) {
      console.error('Chat retrieval error (降级为无检索普通聊天):', err);
      return [];
    }
  }

  // §5.2:命中帖子拼 system prompt(形态示意,可调;含 id 供模型在文中引用)
  private buildRagSystemPrompt(
    citations: { id: number; title: string; brief: string }[],
  ): string {
    const ctx = citations
      .map((c, i) => `[${i + 1}] ${c.title} — ${c.brief} (id:${c.id})`)
      .join('\n');
    return [
      '你是游戏社区的攻略助手。下面是站内可能相关的帖子,请优先基于它们回答并在合适处引用;不相关则正常回答。',
      '相关帖子:',
      ctx,
    ].join('\n');
  }

  // §四/§五 共用检索核心:embedding 向量化 → 库内全量余弦 → topK 帖子 {id,sim}(按相似度降序)。
  //   返回 sim 供 chat 引用按阈值过滤(search 忽略 sim、只取 id);查全量 + JS 过滤 null(绕 Prisma Json-null 坑)。
  private async retrieveTopK(
    text: string,
    topK: number = SEARCH_TOP_K,
  ): Promise<{ id: number; sim: number }[]> {
    const vector = await this.embedding.embed(text);
    const candidates = await this.prisma.post.findMany({
      select: { id: true, titleEmbedding: true },
    });
    return candidates
      .filter((p) => p.titleEmbedding != null)
      .map((p) => ({
        id: p.id,
        sim: cosineSimilarity(vector, p.titleEmbedding as unknown as number[]),
      }))
      .filter((r) => Number.isFinite(r.sim))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topK);
  }

  async search(keyword: string, topK: number = SEARCH_TOP_K) {
    try {
      // §四:复用 retrieveTopK(与 chat 同一套检索);search 不加阈值,取全部 topK(看排序、容忍度高)
      const ids = (await this.retrieveTopK(keyword, topK)).map((r) => r.id);

      if (ids.length === 0) {
        return { code: 0, message: 'success', data: [] };
      }

      const dbPosts = await this.prisma.post.findMany({
        where: { id: { in: ids } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatars: {
                select: { filename: true },
              },
            },
          },
          tags: {
            select: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
          files: {
            where: { mimetype: { startsWith: 'image/' } },
            select: { filename: true },
          },
        },
      });

      // 按余弦相似度序(ids 顺序)排列,映射为列表项
      const byId = new Map(dbPosts.map((p) => [p.id, p]));
      const orderedPosts = ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((post) => ({
          id: post.id,
          title: post.title,
          brief: post.content ? post.content.substring(0, 100) : '',
          publishedAt: post.createdAt.toISOString(), // §四:真实时间(原 new Date() 伪造)
          user: {
            id: post.user?.id,
            name: post.user?.name || '',
            avatar: post.user?.avatars[0]
              ? publicMediaUrl(
                  `avatar/resized/${post.user.avatars[0].filename}-small.jpg`,
                )
              : '',
          },
          tags: post.tags.map((t) => t.tag.name),
          totalLikes: post._count.likes,
          totalComments: post._count.comments,
          thumbnail: post.files[0]
            ? publicMediaUrl(`resized/${post.files[0].filename}-thumbnail.jpg`)
            : '',
        }));

      return {
        code: 0,
        message: 'success',
        data: orderedPosts,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        code: 1,
        message: 'search failed',
        data: [],
      };
    }
  }
}
