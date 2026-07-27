import '../config/load-env';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcryptModule from 'bcrypt';
import { validateEnvironment } from '../config/env';
import {
  compensateCreatedFiles,
  createDemoImageOutputs,
} from './demo-seed-files';
import {
  DEMO_AUTHORS,
  DEMO_IMAGE_FIXTURES,
  DEMO_POSTS,
} from './demo-seed-manifest';

const prisma = new PrismaClient();
const bcrypt = bcryptModule as unknown as {
  hash(value: string, rounds: number): Promise<string>;
};
const { demoUserPassword: DEMO_PASSWORD } = validateEnvironment('demoSeed');
const FIXTURES_DIR = join(__dirname, 'fixtures', 'phase4-demo-images');
const UPLOADS_ROOT = join(process.cwd(), 'uploads');

function assertManifestIntegrity() {
  const authorNames = new Set(DEMO_AUTHORS.map((author) => author.name));
  const fixtureKeys = new Set(
    DEMO_IMAGE_FIXTURES.map((fixture) => fixture.key),
  );
  const titles = new Set<string>();

  for (const post of DEMO_POSTS) {
    if (!authorNames.has(post.author))
      throw new Error(`manifest 作者不存在: ${post.author}`);
    if (titles.has(post.title))
      throw new Error(`manifest 标题重复: ${post.title}`);
    if (post.imageKey && !fixtureKeys.has(post.imageKey))
      throw new Error(`manifest 图片不存在: ${post.imageKey}`);
    titles.add(post.title);

    const commentKeys = new Set(
      post.comments?.map((comment) => comment.key) ?? [],
    );
    for (const comment of post.comments ?? []) {
      if (!authorNames.has(comment.author))
        throw new Error(`评论作者不存在: ${comment.author}`);
      if (comment.parentKey && !commentKeys.has(comment.parentKey)) {
        throw new Error(
          `评论 parent 不存在: ${post.title}/${comment.parentKey}`,
        );
      }
    }
    for (const liker of post.likes ?? []) {
      if (!authorNames.has(liker)) throw new Error(`点赞作者不存在: ${liker}`);
    }
  }
}

async function loadDatabaseReferences() {
  const gameNames = [...new Set(DEMO_POSTS.map((post) => post.game))];
  const tagNames = [...new Set(DEMO_POSTS.map((post) => post.tag))];
  const [games, tags] = await Promise.all([
    prisma.game.findMany({
      where: { name: { in: gameNames } },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({
      where: { name: { in: tagNames } },
      select: { id: true, name: true },
    }),
  ]);
  const gameIdByName = new Map(games.map((game) => [game.name, game.id]));
  const tagIdByName = new Map(tags.map((tag) => [tag.name, tag.id]));
  const missingGames = gameNames.filter((name) => !gameIdByName.has(name));
  const missingTags = tagNames.filter((name) => !tagIdByName.has(name));

  if (missingGames.length || missingTags.length) {
    throw new Error(
      [
        missingGames.length ? `缺少游戏: ${missingGames.join('、')}` : '',
        missingTags.length ? `缺少标签: ${missingTags.join('、')}` : '',
        '请先运行 seed-games 与 rebuild-tags。',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  return { gameIdByName, tagIdByName };
}

async function main() {
  assertManifestIntegrity();
  const { gameIdByName, tagIdByName } = await loadDatabaseReferences();
  const createdPaths: string[] = [];

  try {
    const { outputs } = await createDemoImageOutputs({
      fixturesDir: FIXTURES_DIR,
      uploadsRoot: UPLOADS_ROOT,
      fixtures: DEMO_IMAGE_FIXTURES,
      createdPaths,
    });
    const imageByKey = new Map(outputs.map((output) => [output.key, output]));
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const result = await prisma.$transaction(
      async (tx) => {
        const userIdByName = new Map<string, number>();
        for (const author of DEMO_AUTHORS) {
          const user = await tx.user.upsert({
            where: { name: author.name },
            update: { password: passwordHash },
            create: { name: author.name, password: passwordHash },
          });
          userIdByName.set(author.name, user.id);
        }

        const manifestPairs = DEMO_POSTS.map((post) => {
          const userId = userIdByName.get(post.author);
          if (!userId) throw new Error(`定向清理作者解析失败: ${post.author}`);
          return { title: post.title, userId };
        });
        const deletedPosts = await tx.post.deleteMany({
          where: { OR: manifestPairs },
        });
        const deletedFiles = await tx.file.deleteMany({
          where: {
            originalname: {
              in: DEMO_IMAGE_FIXTURES.map((fixture) => fixture.fileName),
            },
            userId: { in: [...userIdByName.values()] },
          },
        });

        let commentCount = 0;
        let likeCount = 0;
        let fileCount = 0;
        for (const definition of DEMO_POSTS) {
          const userId = userIdByName.get(definition.author);
          const gameId = gameIdByName.get(definition.game);
          const tagId = tagIdByName.get(definition.tag);
          if (!userId || !gameId || !tagId)
            throw new Error(`关联解析失败: ${definition.title}`);

          const post = await tx.post.create({
            data: {
              title: definition.title,
              content: definition.content,
              viewCount: definition.viewCount,
              userId,
              gameId,
              tags: { create: [{ tagId }] },
            },
          });

          if (definition.imageKey) {
            const image = imageByKey.get(definition.imageKey);
            if (!image) throw new Error(`图片输出缺失: ${definition.imageKey}`);
            await tx.file.create({
              data: {
                originalname: image.originalname,
                mimetype: 'image/jpeg',
                filename: image.filename,
                size: image.size,
                width: image.width,
                height: image.height,
                metadata: { seed: 'phase4', imageKey: definition.imageKey },
                postId: post.id,
                userId,
              },
            });
            fileCount++;
          }

          const commentIdByKey = new Map<string, number>();
          for (const comment of (definition.comments ?? []).filter(
            (item) => !item.parentKey,
          )) {
            const commentAuthorId = userIdByName.get(comment.author);
            if (!commentAuthorId)
              throw new Error(`评论作者解析失败: ${comment.author}`);
            const created = await tx.comment.create({
              data: {
                content: comment.content,
                postId: post.id,
                userId: commentAuthorId,
              },
            });
            commentIdByKey.set(comment.key, created.id);
            commentCount++;
          }
          for (const comment of (definition.comments ?? []).filter(
            (item) => item.parentKey,
          )) {
            const commentAuthorId = userIdByName.get(comment.author);
            const parentId = comment.parentKey
              ? commentIdByKey.get(comment.parentKey)
              : undefined;
            if (!commentAuthorId || !parentId)
              throw new Error(`回复关联解析失败: ${comment.key}`);
            const created = await tx.comment.create({
              data: {
                content: comment.content,
                postId: post.id,
                userId: commentAuthorId,
                parentId,
              },
            });
            commentIdByKey.set(comment.key, created.id);
            commentCount++;
          }

          const likes = (definition.likes ?? []).map((name) => {
            const likerId = userIdByName.get(name);
            if (!likerId) throw new Error(`点赞作者解析失败: ${name}`);
            return { postId: post.id, userId: likerId };
          });
          if (likes.length) {
            await tx.userLikePost.createMany({ data: likes });
            likeCount += likes.length;
          }
        }

        return {
          users: userIdByName.size,
          posts: DEMO_POSTS.length,
          comments: commentCount,
          likes: likeCount,
          files: fileCount,
          deletedPosts: deletedPosts.count,
          deletedFiles: deletedFiles.count,
        };
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    console.log(
      `演示 seed 完成: 用户 ${result.users}, 帖子 ${result.posts}, 评论 ${result.comments}, 点赞 ${result.likes}, 图片 ${result.files}; ` +
        `定向替换旧帖子 ${result.deletedPosts}, 旧文件记录 ${result.deletedFiles}。`,
    );
    console.log(
      'titleEmbedding 暂为空；需要向量时运行 pnpm embedding:backfill。',
    );
  } catch (error) {
    const compensation = await compensateCreatedFiles(createdPaths);
    if (compensation.failedPaths.length) {
      console.error(
        '演示 seed 失败，数据库事务已回滚，但以下本次新建图片补偿删除失败：',
      );
      for (const path of compensation.failedPaths) console.error(`  - ${path}`);
      throw new Error('演示 seed 未完全回滚：存在补偿删除失败的图片。', {
        cause: error,
      });
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('演示 seed 失败：', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
