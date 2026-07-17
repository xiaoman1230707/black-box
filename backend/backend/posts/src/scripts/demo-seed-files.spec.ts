import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  compensateCreatedFiles,
  createDemoImageOutputs,
} from './demo-seed-files';

describe('demo seed image file boundary', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'phase4-demo-seed-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('只记录本次新建路径，补偿不删除运行前已存在文件', async () => {
    const fixturesDir = join(root, 'fixtures');
    const uploadsRoot = join(root, 'uploads');
    const resizedDir = join(uploadsRoot, 'resized');
    await mkdir(fixturesDir, { recursive: true });
    await mkdir(resizedDir, { recursive: true });
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toFile(join(fixturesDir, 'sample.jpg'));

    const existingOriginal = join(uploadsRoot, 'phase4-sample.jpg');
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: '#663399' },
    })
      .jpeg()
      .toFile(existingOriginal);
    const existingBytes = await readFile(existingOriginal);

    const result = await createDemoImageOutputs({
      fixturesDir,
      uploadsRoot,
      fixtures: [{ key: 'sample', fileName: 'sample.jpg' }],
    });

    expect(result.createdPaths).toEqual([
      join(resizedDir, 'phase4-sample-thumbnail.jpg'),
    ]);
    expect(result.outputs).toHaveLength(1);

    const compensation = await compensateCreatedFiles(result.createdPaths);
    expect(compensation.failedPaths).toEqual([]);
    expect(await readFile(existingOriginal)).toEqual(existingBytes);
    await expect(
      readFile(join(resizedDir, 'phase4-sample-thumbnail.jpg')),
    ).rejects.toThrow();
  });

  it('补偿删除失败时返回残留路径而不声称完全回滚', async () => {
    const createdPath = join(root, 'cannot-delete.jpg');
    await writeFile(createdPath, 'new');

    const result = await compensateCreatedFiles([createdPath], () =>
      Promise.reject(new Error('permission denied')),
    );

    expect(result.failedPaths).toEqual([createdPath]);
    expect(await readFile(createdPath, 'utf8')).toBe('new');
  });
});
