import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

describe('PostsService embedding persistence boundary', () => {
  it('keeps the post and leaves embedding null when embedding rejects', async () => {
    const prisma = {
      post: {
        create: jest.fn().mockResolvedValue({ id: 42 }),
        update: jest.fn(),
      },
      file: { updateMany: jest.fn() },
      game: { findUnique: jest.fn() },
      tag: { findMany: jest.fn() },
    };
    const embedding = {
      embed: jest.fn().mockRejectedValue(new Error('invalid embedding')),
    };
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = new PostsService(
      prisma as unknown as PrismaService,
      embedding as unknown as EmbeddingService,
    );

    await expect(
      service.create({ title: 'title', content: 'content' }, 7),
    ).resolves.toEqual({ id: 42 });
    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(embedding.embed).toHaveBeenCalledTimes(1);

    error.mockRestore();
  });
});
