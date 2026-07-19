import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

jest.mock('../config/public-url', () => ({
  publicMediaUrl: (path: string) => `https://cdn.test/${path}`,
}));

type PrismaMock = {
  post: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  userLikePost: {
    findMany: jest.Mock;
  };
};

type PersonalPostsService = PostsService & {
  findMine(
    query: { page?: number; limit?: number },
    userId: number,
  ): Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  findLiked(
    query: { page?: number; limit?: number },
    userId: number,
  ): Promise<{ items: Array<Record<string, unknown>>; total: number }>;
};

const rawPosts = [
  {
    id: 12,
    title: '玛莲妮亚无伤路线',
    content: '保持中距离，水鸟乱舞后再反击。',
    createdAt: new Date('2026-07-10T08:00:00.000Z'),
    viewCount: 3560,
    user: {
      id: 8,
      name: '星海攻略组',
      avatars: [{ filename: 'guide-avatar' }],
    },
    tags: [{ tag: { id: 2, name: '攻略' } }],
    _count: { likes: 3, comments: 2 },
    files: [{ filename: 'malenia-cover' }],
  },
  {
    id: 11,
    title: '匿名作者保留帖',
    content: null,
    createdAt: new Date('2026-07-09T08:00:00.000Z'),
    viewCount: 18,
    user: null,
    tags: [],
    _count: { likes: 0, comments: 0 },
    files: [],
  },
];

describe('PostsService personal lists', () => {
  let prisma: PrismaMock;
  let service: PostsService;
  let personalService: PersonalPostsService;

  beforeEach(() => {
    prisma = {
      post: {
        count: jest.fn().mockResolvedValue(rawPosts.length),
        findMany: jest.fn().mockResolvedValue(rawPosts),
      },
      userLikePost: {
        findMany: jest.fn().mockResolvedValue([{ postId: 12 }]),
      },
    };

    service = new PostsService(
      prisma as unknown as PrismaService,
      {} as EmbeddingService,
    );
    personalService = service as PersonalPostsService;
  });

  it('公共列表保持 tag×game、分页、字段映射与单次 likedByMe 批量查询', async () => {
    const result = await service.findAll(
      { page: 2, limit: 2, tag: '攻略', gameId: 3 },
      7,
    );

    const where = {
      tags: { some: { tag: { name: '攻略' } } },
      gameId: 3,
    };
    expect(prisma.post.count).toHaveBeenCalledWith({ where });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 2,
        take: 2,
        orderBy: { id: 'desc' },
      }),
    );
    expect(prisma.userLikePost.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.userLikePost.findMany).toHaveBeenCalledWith({
      where: { userId: 7, postId: { in: [12, 11] } },
      select: { postId: true },
    });
    expect(result).toEqual({
      total: 2,
      items: [
        {
          id: 12,
          title: '玛莲妮亚无伤路线',
          brief: '保持中距离，水鸟乱舞后再反击。',
          publishedAt: '2026-07-10T08:00:00.000Z',
          viewCount: 3560,
          user: {
            id: 8,
            name: '星海攻略组',
            avatar: 'https://cdn.test/avatar/resized/guide-avatar-small.jpg',
          },
          tags: ['攻略'],
          totalLikes: 3,
          totalComments: 2,
          likedByMe: true,
          thumbnail: 'https://cdn.test/resized/malenia-cover-thumbnail.jpg',
        },
        {
          id: 11,
          title: '匿名作者保留帖',
          brief: '',
          publishedAt: '2026-07-09T08:00:00.000Z',
          viewCount: 18,
          user: { id: undefined, name: '', avatar: '' },
          tags: [],
          totalLikes: 0,
          totalComments: 0,
          likedByMe: false,
          thumbnail: '',
        },
      ],
    });
  });

  it('匿名公共列表不查询点赞关系且全部映射为未点赞', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });

    expect(prisma.userLikePost.findMany).not.toHaveBeenCalled();
    expect(result.items.every((post) => !post.likedByMe)).toBe(true);
  });

  it('我的发布只按 JWT 用户过滤并沿用默认分页', async () => {
    await personalService.findMine({}, 7);

    expect(prisma.post.count).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        skip: 0,
        take: 10,
        orderBy: { id: 'desc' },
      }),
    );
  });

  it('我的收藏通过 UserLikePost 关系过滤并使用帖子 id 倒序', async () => {
    await personalService.findLiked({ page: 3, limit: 5 }, 7);

    const where = { likes: { some: { userId: 7 } } };
    expect(prisma.post.count).toHaveBeenCalledWith({ where });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 10,
        take: 5,
        orderBy: { id: 'desc' },
      }),
    );
  });

  it('同页多帖仅执行一次 likedByMe 查询而不是逐帖查询', async () => {
    await personalService.findMine({ page: 1, limit: 10 }, 7);

    expect(prisma.userLikePost.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.userLikePost.findMany).toHaveBeenCalledWith({
      where: { userId: 7, postId: { in: [12, 11] } },
      select: { postId: true },
    });
  });
});
