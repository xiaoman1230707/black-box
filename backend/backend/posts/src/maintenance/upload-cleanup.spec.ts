import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import {
  executeUploadCleanup,
  parseCleanupArguments,
  planUploadCleanup,
} from './upload-cleanup';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 16, 0, 0, 0);

describe('upload cleanup', () => {
  let root = '';

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'black-box-upload-cleanup-'));
    await fs.mkdir(join(root, 'avatar', 'resized'), { recursive: true });
    await fs.mkdir(join(root, 'resized'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const writeAt = async (relativePath: string, mtimeMs: number) => {
    const path = join(root, relativePath);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, relativePath);
    const date = new Date(mtimeMs);
    await fs.utimes(path, date, date);
  };

  it('keeps referenced groups and only plans old exact orphan derivatives', async () => {
    await writeAt('avatar/resized/current-small.jpg', NOW - 2 * DAY);
    await writeAt('avatar/resized/current-large.jpg', NOW - 2 * DAY);
    await writeAt('orphan.jpg', NOW - 2 * DAY);
    await writeAt('resized/orphan-thumbnail.jpg', NOW - 2 * DAY);
    await writeAt('notes.txt', NOW - 2 * DAY);
    await writeAt('.gitkeep', NOW - 2 * DAY);

    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [{ id: 1, filename: 'current' }],
      files: [],
      nowMs: NOW,
      protectHours: 24,
    });

    expect(plan.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'avatar:current', action: 'keep' }),
        expect.objectContaining({ key: 'post:orphan', action: 'delete-files' }),
      ]),
    );
    expect(plan.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: 'notes.txt',
          category: 'unknown',
        }),
        expect.objectContaining({
          relativePath: '.gitkeep',
          category: 'control',
        }),
      ]),
    );
  });

  it('keeps files at the protection boundary and candidates newer than it', async () => {
    await writeAt('boundary.jpg', NOW - DAY);
    await writeAt('resized/boundary-thumbnail.jpg', NOW - DAY);

    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [],
      files: [],
      nowMs: NOW,
      protectHours: 24,
    });

    expect(plan.groups).toContainEqual(
      expect.objectContaining({ key: 'post:boundary', action: 'protect' }),
    );
  });

  it('reports unsafe DB filenames, missing derivatives, and symlinks without following them', async () => {
    const targetDirectory = join(root, 'linked-target');
    await fs.mkdir(targetDirectory);
    const linkPath = join(root, 'resized', 'external-link');
    await fs.symlink(targetDirectory, linkPath, 'junction');

    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [{ id: 1, filename: '../escape' }],
      files: [{ id: 2, filename: 'missing', postId: 10 }],
      nowMs: NOW,
      protectHours: 24,
    });

    expect(plan.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'unsafe-record' }),
        expect.objectContaining({ category: 'missing' }),
        expect.objectContaining({
          relativePath: 'resized/external-link',
          category: 'symlink',
        }),
      ]),
    );
  });

  it('requires apply confirmation and rejects a negative protection window', () => {
    expect(() => parseCleanupArguments(['--protect-hours=-1'])).toThrow(
      'protect-hours',
    );
    expect(() => parseCleanupArguments(['--apply'])).toThrow(
      'backup-confirmed',
    );
    expect(parseCleanupArguments(['--apply', '--backup-confirmed'])).toEqual({
      apply: true,
      backupConfirmed: true,
      protectHours: 24,
    });
  });

  it('dry-run never calls file or database deletion', async () => {
    await writeAt('orphan.jpg', NOW - 2 * DAY);
    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [],
      files: [],
      nowMs: NOW,
      protectHours: 24,
    });
    const removeFile = jest.fn();
    const deleteFileRecord = jest.fn();

    const result = await executeUploadCleanup(plan, {
      apply: false,
      backupConfirmed: false,
      removeFile,
      deleteFileRecord,
    });

    expect(result.exitCode).toBe(0);
    expect(removeFile).not.toHaveBeenCalled();
    expect(deleteFileRecord).not.toHaveBeenCalled();
  });

  it('continues after file failures and only deletes a detached DB record after its complete group', async () => {
    await writeAt('detached.jpg', NOW - 2 * DAY);
    await writeAt('resized/detached-thumbnail.jpg', NOW - 2 * DAY);
    await writeAt('other.jpg', NOW - 2 * DAY);
    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [],
      files: [{ id: 7, filename: 'detached', postId: null }],
      nowMs: NOW,
      protectHours: 24,
    });
    const removed: string[] = [];
    const removeFile = jest.fn((path: string) => {
      if (path.endsWith('detached-thumbnail.jpg')) {
        return Promise.reject(new Error('locked'));
      }
      removed.push(path);
      return Promise.resolve();
    });
    const deleteFileRecord = jest.fn();

    const result = await executeUploadCleanup(plan, {
      apply: true,
      backupConfirmed: true,
      removeFile,
      deleteFileRecord,
    });

    expect(result.exitCode).toBe(1);
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.stringContaining('detached.jpg'),
        expect.stringContaining('other.jpg'),
      ]),
    );
    expect(deleteFileRecord).not.toHaveBeenCalledWith(7);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: 'resized/detached-thumbnail.jpg',
        }),
      ]),
    );
  });

  it('keeps a filename group when any duplicate File record is still attached', async () => {
    await writeAt('shared.jpg', NOW - 2 * DAY);
    await writeAt('resized/shared-thumbnail.jpg', NOW - 2 * DAY);

    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [],
      files: [
        { id: 11, filename: 'shared', postId: 42 },
        { id: 12, filename: 'shared', postId: null },
      ],
      nowMs: NOW,
      protectHours: 24,
    });

    expect(plan.groups).toContainEqual(
      expect.objectContaining({
        key: 'post:shared',
        action: 'keep',
        fileRecordIds: [11, 12],
      }),
    );
    expect(plan.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'referenced',
          relativePath: 'shared.jpg',
        }),
      ]),
    );
  });

  it('deletes all duplicate detached File records only after the complete group succeeds', async () => {
    await writeAt('detached-shared.jpg', NOW - 2 * DAY);
    await writeAt('resized/detached-shared-thumbnail.jpg', NOW - 2 * DAY);
    const plan = await planUploadCleanup({
      uploadsRoot: root,
      avatars: [],
      files: [
        { id: 21, filename: 'detached-shared', postId: null },
        { id: 22, filename: 'detached-shared', postId: null },
      ],
      nowMs: NOW,
      protectHours: 24,
    });
    const removeFile = jest.fn(() => Promise.resolve());
    const deleteFileRecord = jest.fn(() => Promise.resolve());

    const result = await executeUploadCleanup(plan, {
      apply: true,
      backupConfirmed: true,
      removeFile,
      deleteFileRecord,
    });

    expect(result.exitCode).toBe(0);
    expect(removeFile).toHaveBeenCalledTimes(2);
    expect(deleteFileRecord.mock.calls.map(([id]) => id)).toEqual([21, 22]);
  });
});
