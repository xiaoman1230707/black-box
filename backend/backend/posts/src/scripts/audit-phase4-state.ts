import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    const [posts, comments, likes, files, avatars, games, rows] =
      await Promise.all([
        prisma.post.count(),
        prisma.comment.count(),
        prisma.userLikePost.count(),
        prisma.file.count(),
        prisma.avatar.count(),
        prisma.game.findMany({
          select: { name: true, _count: { select: { posts: true } } },
          orderBy: { name: 'asc' },
        }),
        prisma.post.findMany({
          select: { title: true, content: true, titleEmbedding: true },
        }),
      ]);

    const embeddingDimensions: Record<number, number> = {};
    for (const row of rows) {
      const dimension = Array.isArray(row.titleEmbedding)
        ? row.titleEmbedding.length
        : 0;
      embeddingDimensions[dimension] =
        (embeddingDimensions[dimension] ?? 0) + 1;
    }

    console.log(
      JSON.stringify(
        {
          posts,
          comments,
          likes,
          files,
          avatars,
          games: games.map((game) => ({
            name: game.name,
            posts: game._count.posts,
          })),
          emptyContent: rows.filter((row) => !row.content?.trim()).length,
          duplicateTitles:
            rows.length - new Set(rows.map((row) => row.title)).size,
          embeddingNonNull: rows.filter((row) =>
            Array.isArray(row.titleEmbedding),
          ).length,
          embeddingDimensions,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`phase4 data audit failed: ${message}`);
  process.exitCode = 1;
});
