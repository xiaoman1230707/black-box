import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getRuntimeEnv } from '../config/env';
import { withTimeout } from '../ai/ai-timeout';

// 三期·标题向量基建:统一的 embedding 能力(发帖写入向量 + AI 语义检索共用)。
// 模型可配置常量(03 §3.5):可由 env 覆盖;改这一处即换模型(backfill 脚本也引此常量,单一事实来源)。
// 选型留痕:ada-002 中文区分度不足——相关/不相关余弦仅差 ~0.007、跨游戏帖挤一起,致 chat 引用「不对版」;
//          text-embedding-3-small 区分度质变(相关 0.5~0.7、无关 <0.33,间隔 ~0.13 断崖分明),三期实测选定。
//          换模型需对存量帖全量重 backfill(旧向量空间不可比);维度同 1536,schema 不变。详见 §三/§五实现状态。
@Injectable()
export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private timeoutMs: number;

  constructor() {
    const { openai, aiTimeouts } = getRuntimeEnv();
    this.timeoutMs = aiTimeouts.embedding;
    this.embeddings = new OpenAIEmbeddings({
      configuration: {
        apiKey: openai.apiKey,
        baseURL: openai.baseUrl,
        timeout: this.timeoutMs,
        maxRetries: 0,
      },
      model: openai.embeddingModel,
      timeout: this.timeoutMs,
      maxRetries: 0,
    });
  }

  // 文本 → 向量(3-small 为 1536 维)。
  // 不在此吞错:容错策略由调用方决定(发帖侧 catch 留 null 不阻塞;检索侧返回空)。
  async embed(text: string): Promise<number[]> {
    return withTimeout(
      this.embeddings.embedQuery(text),
      this.timeoutMs,
      'embedding',
    );
  }
}
