import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { validateEnvironment } from '../config/env';
import { createEmbeddingDeadlineFetch } from '../embedding/embedding-safety';
import {
  resolveBackfillMode,
  runEmbeddingBackfill,
} from './backfill-embeddings.runner';

// 默认模式只补 titleEmbedding 为 null 的帖子。非生产维护可显式使用 --all；
// production 在读取数据库和调用供应商前拒绝 --all。
const embeddingEnv = validateEnvironment('embedding');
const forceAll = resolveBackfillMode(
  process.argv.slice(2),
  embeddingEnv.nodeEnv,
);
const timeoutMs = embeddingEnv.aiTimeouts.embedding;
const prisma = new PrismaClient();
const embeddings = new OpenAIEmbeddings({
  configuration: {
    apiKey: embeddingEnv.openai.apiKey,
    baseURL: embeddingEnv.openai.baseUrl,
    timeout: timeoutMs,
    maxRetries: 0,
    fetch: createEmbeddingDeadlineFetch(timeoutMs),
  },
  model: embeddingEnv.openai.embeddingModel,
  timeout: timeoutMs,
  maxRetries: 0,
});

async function main() {
  console.log(
    `模型=${embeddingEnv.openai.embeddingModel}  模式=${forceAll ? '--all 全量重生成' : '只补 null'}`,
  );
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, titleEmbedding: true },
  });
  const result = await runEmbeddingBackfill({
    posts,
    forceAll,
    timeoutMs,
    embed: (title) => embeddings.embedQuery(title),
    updateEmbedding: async (postId, vector) => {
      await prisma.post.update({
        where: { id: postId },
        data: { titleEmbedding: vector },
      });
    },
    onSuccess: (post) => console.log(`  ✓ [${post.id}] ${post.title}`),
    onFailure: (post, error) =>
      console.error(
        `  ✗ [${post.id}] ${post.title} —— embedding 失败,跳过:`,
        error,
      ),
  });

  console.log(`帖子总数 ${result.total},待处理 ${result.pending}`);
  console.log(
    `回填完成:成功 ${result.succeeded},失败 ${result.failed}(失败项保持 null,可重跑)`,
  );
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
