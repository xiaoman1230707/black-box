import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { validateEnvironment } from '../config/env';

validateEnvironment('database');
const prisma = new PrismaClient();

// 一期 Tag 语义重建:把 Tag 从"游戏名"改为"内容类型"。
// 内容类型五类已定(概要 11.5,对齐原型 pill news/guide/help/review/event)。
// 本脚本幂等:清失效 PostTag 关联 + 旧 tag → 灌入五类。仅灌 tag,不灌演示帖子/评论(演示 seed 属四期)。
const CONTENT_TYPES = ['资讯', '攻略', '求助', '评测', '活动'];

async function main() {
  // 1) 清空旧的 post-tag 关联与旧 tag(当前空库则清除 0 行)
  await prisma.postTag.deleteMany({});
  await prisma.tag.deleteMany({});

  // 2) 灌入内容类型五类
  await prisma.tag.createMany({
    data: CONTENT_TYPES.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const tags = await prisma.tag.findMany({ orderBy: { id: 'asc' } });
  console.log('Tag 重建完成:', tags);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
