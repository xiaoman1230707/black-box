import { access, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { DemoImageFixture } from './demo-seed-manifest';

export type DemoImageOutput = {
  key: string;
  originalname: string;
  filename: string;
  size: number;
  width: number;
  height: number;
};

type CreateDemoImageOutputsOptions = {
  fixturesDir: string;
  uploadsRoot: string;
  fixtures: readonly DemoImageFixture[];
  createdPaths?: string[];
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function createDemoImageOutputs({
  fixturesDir,
  uploadsRoot,
  fixtures,
  createdPaths = [],
}: CreateDemoImageOutputsOptions): Promise<{
  outputs: DemoImageOutput[];
  createdPaths: string[];
}> {
  const resizedDir = join(uploadsRoot, 'resized');
  await mkdir(uploadsRoot, { recursive: true });
  await mkdir(resizedDir, { recursive: true });

  const outputs: DemoImageOutput[] = [];
  for (const fixture of fixtures) {
    const sourcePath = join(fixturesDir, fixture.fileName);
    const metadata = await sharp(sourcePath).metadata();
    if (
      metadata.format !== 'jpeg' ||
      metadata.width !== 1600 ||
      metadata.height !== 900
    ) {
      throw new Error(`演示图片必须是 1600x900 JPEG: ${fixture.fileName}`);
    }

    const filename = `phase4-${fixture.key}`;
    const originalPath = join(uploadsRoot, `${filename}.jpg`);
    const thumbnailPath = join(resizedDir, `${filename}-thumbnail.jpg`);

    if (!(await pathExists(originalPath))) {
      createdPaths.push(originalPath);
      await sharp(sourcePath).jpeg({ quality: 90 }).toFile(originalPath);
    }
    if (!(await pathExists(thumbnailPath))) {
      createdPaths.push(thumbnailPath);
      await sharp(sourcePath)
        .resize({ width: 400 })
        .jpeg({ quality: 84 })
        .toFile(thumbnailPath);
    }

    const outputMetadata = await sharp(originalPath).metadata();
    outputs.push({
      key: fixture.key,
      originalname: fixture.fileName,
      filename,
      size: outputMetadata.size ?? 0,
      width: outputMetadata.width ?? 1600,
      height: outputMetadata.height ?? 900,
    });
  }

  return { outputs, createdPaths };
}

export async function compensateCreatedFiles(
  createdPaths: readonly string[],
  remove: (path: string) => Promise<void> = unlink,
): Promise<{ failedPaths: string[] }> {
  const failedPaths: string[] = [];
  for (const path of [...createdPaths].reverse()) {
    try {
      await remove(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      failedPaths.push(path);
    }
  }
  return { failedPaths };
}
