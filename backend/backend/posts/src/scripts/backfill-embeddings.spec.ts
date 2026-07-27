import fs from 'node:fs';
import path from 'node:path';
import {
  resolveBackfillMode,
  runEmbeddingBackfill,
} from './backfill-embeddings.runner';

const vector = () => Array.from({ length: 1536 }, () => 0.5);

describe('embedding backfill runner', () => {
  it('processes only null embeddings and never overlaps provider calls', async () => {
    let active = 0;
    let maxActive = 0;
    const embed = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return vector();
    });
    const updateEmbedding = jest.fn().mockResolvedValue(undefined);

    const result = await runEmbeddingBackfill({
      posts: [
        { id: 1, title: 'one', titleEmbedding: null },
        { id: 2, title: 'existing', titleEmbedding: vector() },
        { id: 3, title: 'three', titleEmbedding: null },
      ],
      forceAll: false,
      timeoutMs: 100,
      embed,
      updateEmbedding,
    });

    expect(embed).toHaveBeenCalledTimes(2);
    expect(maxActive).toBe(1);
    expect(updateEmbedding).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      total: 3,
      pending: 2,
      succeeded: 2,
      failed: 0,
    });
  });

  it('does not update an invalid vector', async () => {
    const updateEmbedding = jest.fn().mockResolvedValue(undefined);
    const result = await runEmbeddingBackfill({
      posts: [{ id: 1, title: 'bad', titleEmbedding: null }],
      forceAll: false,
      timeoutMs: 100,
      embed: jest.fn().mockResolvedValue([1, 2, 3]),
      updateEmbedding,
    });

    expect(updateEmbedding).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      succeeded: 0,
      failed: 1,
      failedPostIds: [1],
    });
  });

  it('keeps successful updates, leaves failures pending, and reports failure', async () => {
    const updateEmbedding = jest.fn().mockResolvedValue(undefined);
    const embed = jest
      .fn()
      .mockResolvedValueOnce(vector())
      .mockRejectedValueOnce(new Error('provider failed'));

    const result = await runEmbeddingBackfill({
      posts: [
        { id: 1, title: 'ok', titleEmbedding: null },
        { id: 2, title: 'fail', titleEmbedding: null },
      ],
      forceAll: false,
      timeoutMs: 100,
      embed,
      updateEmbedding,
    });

    expect(updateEmbedding).toHaveBeenCalledTimes(1);
    expect(updateEmbedding).toHaveBeenCalledWith(1, expect.any(Array));
    expect(result).toMatchObject({
      succeeded: 1,
      failed: 1,
      failedPostIds: [2],
    });
  });

  it('rejects production --all before any database or provider work', () => {
    expect(() => resolveBackfillMode(['--all'], 'production')).toThrow(
      /--all.*production/i,
    );
  });

  it('places the production guard before database and provider setup', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'backfill-embeddings.ts'),
      'utf8',
    );
    const guard = source.indexOf('const forceAll = resolveBackfillMode(');

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(source.indexOf('new PrismaClient()'));
    expect(guard).toBeLessThan(source.indexOf('new OpenAIEmbeddings('));
    expect(guard).toBeLessThan(source.indexOf('prisma.post.findMany('));
  });

  it('retains explicit --all for non-production maintenance', () => {
    expect(resolveBackfillMode(['--all'], 'development')).toBe(true);
    expect(resolveBackfillMode([], 'production')).toBe(false);
  });

  it('does not instruct operators to run demo backfill with --all', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'seed-demo-posts.ts'),
      'utf8',
    );
    expect(source).not.toContain('embedding:backfill -- --all');
    expect(source).toContain('pnpm embedding:backfill');
  });
});
