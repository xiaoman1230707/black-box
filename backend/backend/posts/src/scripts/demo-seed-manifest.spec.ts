import {
  DEMO_AUTHORS,
  DEMO_IMAGE_FIXTURES,
  DEMO_POSTS,
} from './demo-seed-manifest';
import { join } from 'node:path';
import sharp from 'sharp';

const LEGACY_TITLES = [
  '黑神话悟空：广智广谋速通打法与变身时机详解',
  '通关黑神话后聊聊：国产3A的里程碑与那些遗憾',
  '黑神话悟空全球销量破2500万，开发商透露DLC方向',
  '原神枫丹水神boss机制拆解与低练度配队推荐',
  '新手求助：原神前期抽卡资源优先给谁比较稳？',
  '原神4.6版本限时活动「神腾月跃」奖励与玩法一览',
  '艾尔登法环：女武神玛莲妮亚无伤打法思路',
  '黄金树幽影DLC评测：难度与诚意并存的封神之作',
  '王国之泪「究极手」妙用：10个实用载具搭建思路',
  '王国之泪斩获多项年度提名，开放世界再次封神',
  '赛博朋克2077往日之影：隐藏结局达成条件梳理',
  '2.0版本重做后的夜之城，值得老玩家回归吗',
  '求助：赛博朋克2077义体怎么搭配输出最高？',
  '艾尔登法环联机互助周：组队过boss免费送符文',
];

const GAMES = [
  '黑神话:悟空',
  '原神',
  '艾尔登法环',
  '塞尔达传说:王国之泪',
  '赛博朋克2077',
];
const CONTENT_TYPES = ['资讯', '攻略', '求助', '评测', '活动'];

describe('phase 4 demo seed manifest', () => {
  it('固定五名作者、35 帖和每游戏 7 帖', () => {
    expect(DEMO_AUTHORS).toHaveLength(5);
    expect(new Set(DEMO_AUTHORS.map((author) => author.name)).size).toBe(5);
    expect(DEMO_POSTS).toHaveLength(35);

    for (const game of GAMES) {
      expect(DEMO_POSTS.filter((post) => post.game === game)).toHaveLength(7);
    }
  });

  it('每个游戏覆盖五种内容类型且保留三期 14 个标题', () => {
    for (const game of GAMES) {
      const tags = new Set(
        DEMO_POSTS.filter((post) => post.game === game).map((post) => post.tag),
      );
      expect(tags).toEqual(new Set(CONTENT_TYPES));
    }

    expect(DEMO_POSTS.map((post) => post.title)).toEqual(
      expect.arrayContaining(LEGACY_TITLES),
    );
  });

  it('标题唯一，正文、摘要、浏览量和引用作者均有效', () => {
    const authorNames = new Set(DEMO_AUTHORS.map((author) => author.name));
    const titles = DEMO_POSTS.map((post) => post.title);

    expect(new Set(titles).size).toBe(titles.length);
    for (const post of DEMO_POSTS) {
      expect(post.title.trim()).not.toBe('');
      expect(post.brief.trim()).not.toBe('');
      expect(post.content.trim()).not.toBe('');
      expect(post.viewCount).toBeGreaterThanOrEqual(0);
      expect(authorNames.has(post.author)).toBe(true);
      expect(GAMES).toContain(post.game);
      expect(CONTENT_TYPES).toContain(post.tag);
    }
  });

  it('固定 10 张唯一图片且帖子只引用已登记 fixture', () => {
    const fixtureKeys = DEMO_IMAGE_FIXTURES.map((fixture) => fixture.key);
    const imagePosts = DEMO_POSTS.filter((post) => post.imageKey !== undefined);

    expect(DEMO_IMAGE_FIXTURES).toHaveLength(10);
    expect(new Set(fixtureKeys).size).toBe(10);
    expect(
      new Set(DEMO_IMAGE_FIXTURES.map((fixture) => fixture.fileName)).size,
    ).toBe(10);
    expect(imagePosts).toHaveLength(10);
    for (const post of imagePosts) expect(fixtureKeys).toContain(post.imageKey);
  });

  it('仓库内 fixture 均为 1600x900 JPEG', async () => {
    const fixturesDir = join(__dirname, 'fixtures', 'phase4-demo-images');
    for (const fixture of DEMO_IMAGE_FIXTURES) {
      const metadata = await sharp(
        join(fixturesDir, fixture.fileName),
      ).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(1600);
      expect(metadata.height).toBe(900);
    }
  });

  it('评论 parent 只指向同帖顶层评论，点赞不重复且不伪造评论时间', () => {
    const authorNames = new Set(DEMO_AUTHORS.map((author) => author.name));

    for (const post of DEMO_POSTS) {
      const comments = post.comments ?? [];
      const byKey = new Map(comments.map((comment) => [comment.key, comment]));
      expect(byKey.size).toBe(comments.length);

      for (const comment of comments) {
        expect(authorNames.has(comment.author)).toBe(true);
        expect(comment.content.trim()).not.toBe('');
        expect('createdAt' in comment).toBe(false);
        if (comment.parentKey) {
          const parent = byKey.get(comment.parentKey);
          expect(parent).toBeDefined();
          expect(parent?.parentKey).toBeUndefined();
        }
      }

      expect(new Set(post.likes ?? []).size).toBe((post.likes ?? []).length);
      for (const liker of post.likes ?? [])
        expect(authorNames.has(liker)).toBe(true);
    }
  });
});
