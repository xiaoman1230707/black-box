import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { validateEnvironment } from '../config/env';

// 三期·标题向量基建:回填帖子标题向量。两种模式:
//   - 默认(无参):只补 titleEmbedding 为 null 的(幂等补缺,如发帖时 embedding 失败留的 null)。
//   - --all:全量重生成所有帖(换 embedding 模型时用——新旧向量空间不可比、必须全部重算)。
// 运行:npx ts-node src/scripts/backfill-embeddings.ts        (补缺)
//       npx ts-node src/scripts/backfill-embeddings.ts --all  (换模型后全量重生成)
// 模型须与 embedding.service 的 EMBEDDING_MODEL 一致(此处独立定义,避免运维脚本耦合 Nest 模块/装饰器)。
// 稳健点:避开 Prisma 对 Json? 字段 null 查询的 DbNull/JsonNull 坑——查全量后在 JS 过滤 == null。
const prisma = new PrismaClient();
const FORCE_ALL = process.argv.includes('--all');
const { openai, aiTimeouts } = validateEnvironment('embedding');
const EMBEDDING_MODEL = openai.embeddingModel;
const embeddings = new OpenAIEmbeddings({
  configuration: {
    apiKey: openai.apiKey,
    baseURL: openai.baseUrl,
    timeout: aiTimeouts.embedding,
    maxRetries: 0,
  },
  model: EMBEDDING_MODEL,
  timeout: aiTimeouts.embedding,
  maxRetries: 0,
});

async function main() {
  console.log(
    `模型=${EMBEDDING_MODEL}  模式=${FORCE_ALL ? '--all 全量重生成' : '只补 null'}`,
  );
  const all = await prisma.post.findMany({
    select: { id: true, title: true, titleEmbedding: true },
  });
  const todo = FORCE_ALL ? all : all.filter((p) => p.titleEmbedding == null);
  console.log(`帖子总数 ${all.length},待处理 ${todo.length}`);

  let ok = 0;
  let fail = 0;
  // 单条失败跳过(留 null、可重跑),不中断整个脚本
  for (const p of todo) {
    try {
      const vec = await embeddings.embedQuery(p.title);
      await prisma.post.update({
        where: { id: p.id },
        data: { titleEmbedding: vec },
      });
      ok++;
      console.log(`  ✓ [${p.id}] ${p.title}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ [${p.id}] ${p.title} —— embedding 失败,跳过:`, e);
    }
  }
  console.log(`回填完成:成功 ${ok},失败 ${fail}(失败项保持 null,可重跑)`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
