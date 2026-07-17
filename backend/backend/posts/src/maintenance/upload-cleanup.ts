import { promises as fs } from 'fs';
import { basename, relative, resolve, sep } from 'path';

type CleanupCategory =
  | 'control'
  | 'missing'
  | 'orphan'
  | 'protected'
  | 'referenced'
  | 'symlink'
  | 'unknown'
  | 'unsafe-record';
type CleanupAction =
  | 'delete-files'
  | 'delete-files-and-record'
  | 'keep'
  | 'protect'
  | 'report';

interface AvatarReference {
  id: number;
  filename: string;
}

interface FileReference {
  id: number;
  filename: string;
  postId: number | null;
}

interface CleanupEntry {
  category: CleanupCategory;
  relativePath: string;
  reason: string;
}

interface CleanupFile {
  absolutePath: string;
  mtimeMs: number;
  relativePath: string;
}

interface CleanupGroup {
  action: CleanupAction;
  fileRecordIds?: number[];
  files: CleanupFile[];
  key: string;
  reason: string;
}

interface CleanupPlan {
  counts: Record<CleanupCategory, number>;
  entries: CleanupEntry[];
  groups: CleanupGroup[];
  uploadsRoot: string;
}

interface PlanOptions {
  avatars: AvatarReference[];
  files: FileReference[];
  nowMs?: number;
  protectHours: number;
  uploadsRoot: string;
}

interface ExecuteOptions {
  apply: boolean;
  backupConfirmed: boolean;
  deleteFileRecord?: (id: number) => Promise<unknown>;
  removeFile?: (path: string) => Promise<unknown>;
}

interface CleanupFailure {
  operation: 'delete-file' | 'delete-record';
  reason: string;
  relativePath: string;
}

const categories: CleanupCategory[] = [
  'control',
  'missing',
  'orphan',
  'protected',
  'referenced',
  'symlink',
  'unknown',
  'unsafe-record',
];

const isInsideRoot = (root: string, candidate: string) =>
  candidate === root || candidate.startsWith(`${root}${sep}`);

const isSafeFilename = (filename: string) => /^[A-Za-z0-9_-]+$/.test(filename);

const expectedPaths = (kind: 'avatar' | 'post', filename: string) =>
  kind === 'avatar'
    ? [
        `avatar/resized/${filename}-small.jpg`,
        `avatar/resized/${filename}-large.jpg`,
      ]
    : [`${filename}.jpg`, `resized/${filename}-thumbnail.jpg`];

const classifyKnownPath = (
  relativePath: string,
): { key: string; kind: 'avatar' | 'post' } | undefined => {
  const avatar = relativePath.match(
    /^avatar\/resized\/([A-Za-z0-9_-]+)-(?:small|large)\.jpg$/,
  );
  if (avatar) return { key: `avatar:${avatar[1]}`, kind: 'avatar' };

  const thumbnail = relativePath.match(
    /^resized\/([A-Za-z0-9_-]+)-thumbnail\.jpg$/,
  );
  if (thumbnail) return { key: `post:${thumbnail[1]}`, kind: 'post' };

  const original = relativePath.match(/^([A-Za-z0-9_-]+)\.jpg$/);
  if (original) return { key: `post:${original[1]}`, kind: 'post' };
  return undefined;
};

const parseCleanupArguments = (args: string[]) => {
  let apply = false;
  let backupConfirmed = false;
  let protectHours = 24;

  for (const argument of args) {
    if (argument === '--apply') apply = true;
    else if (argument === '--backup-confirmed') backupConfirmed = true;
    else if (argument.startsWith('--protect-hours=')) {
      protectHours = Number(argument.slice('--protect-hours='.length));
      if (!Number.isFinite(protectHours) || protectHours < 0) {
        throw new Error('protect-hours must be a non-negative number');
      }
    } else {
      throw new Error(`Unknown cleanup argument: ${argument}`);
    }
  }

  if (apply && !backupConfirmed) {
    throw new Error('--apply requires --backup-confirmed');
  }
  return { apply, backupConfirmed, protectHours };
};

const planUploadCleanup = async ({
  avatars,
  files,
  nowMs = Date.now(),
  protectHours,
  uploadsRoot,
}: PlanOptions): Promise<CleanupPlan> => {
  if (!Number.isFinite(protectHours) || protectHours < 0) {
    throw new Error('protectHours must be a non-negative number');
  }

  const root = resolve(uploadsRoot);
  const rootStat = await fs.lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('uploads root must be a real directory');
  }

  const entries: CleanupEntry[] = [];
  const diskGroups = new Map<
    string,
    { files: CleanupFile[]; kind: 'avatar' | 'post' }
  >();

  const walk = async (directory: string): Promise<void> => {
    const children = await fs.readdir(directory);
    for (const child of children) {
      const absolutePath = resolve(directory, child);
      if (!isInsideRoot(root, absolutePath)) {
        entries.push({
          category: 'unknown',
          relativePath: relative(root, absolutePath).replaceAll('\\', '/'),
          reason: 'resolved path escapes uploads root',
        });
        continue;
      }

      const relativePath = relative(root, absolutePath).replaceAll('\\', '/');
      const stat = await fs.lstat(absolutePath);
      if (stat.isSymbolicLink()) {
        entries.push({
          category: 'symlink',
          relativePath,
          reason: 'symbolic link is reported and never followed',
        });
        continue;
      }
      if (stat.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      const name = basename(relativePath);
      if (name === '.gitkeep' || name === '.gitignore') {
        entries.push({
          category: 'control',
          relativePath,
          reason: 'repository control file',
        });
        continue;
      }

      const known = classifyKnownPath(relativePath);
      if (!known) {
        entries.push({
          category: 'unknown',
          relativePath,
          reason: 'file does not match a known upload derivative',
        });
        continue;
      }
      const group = diskGroups.get(known.key) ?? {
        files: [],
        kind: known.kind,
      };
      group.files.push({ absolutePath, mtimeMs: stat.mtimeMs, relativePath });
      diskGroups.set(known.key, group);
    }
  };
  await walk(root);

  const records = new Map<
    string,
    { expected: string[]; fileRecordIds: number[]; referenced: boolean }
  >();
  const registerRecord = (
    kind: 'avatar' | 'post',
    id: number,
    filename: string,
    referenced: boolean,
  ) => {
    if (!isSafeFilename(filename)) {
      entries.push({
        category: 'unsafe-record',
        relativePath: `${kind}-record:${id}`,
        reason: 'database filename is not a safe upload basename',
      });
      return;
    }
    const key = `${kind}:${filename}`;
    const record = records.get(key) ?? {
      expected: expectedPaths(kind, filename),
      fileRecordIds: [],
      referenced: false,
    };
    if (kind === 'post') record.fileRecordIds.push(id);
    record.referenced ||= referenced;
    records.set(key, record);
  };

  for (const avatar of avatars) {
    registerRecord('avatar', avatar.id, avatar.filename, true);
  }
  for (const file of files) {
    registerRecord('post', file.id, file.filename, file.postId !== null);
  }

  const cutoff = nowMs - protectHours * 60 * 60 * 1000;
  const groups: CleanupGroup[] = [];
  const keys = new Set([...diskGroups.keys(), ...records.keys()]);
  for (const key of [...keys].sort()) {
    const disk = diskGroups.get(key);
    const record = records.get(key);
    const diskFiles = [...(disk?.files ?? [])].sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath),
    );

    if (record) {
      const present = new Set(diskFiles.map((file) => file.relativePath));
      const missing = record.expected.filter((path) => !present.has(path));
      if (missing.length > 0) {
        for (const path of missing) {
          entries.push({
            category: 'missing',
            relativePath: path,
            reason: `${key} has a database record but a derivative is missing`,
          });
        }
        groups.push({
          action: 'report',
          fileRecordIds: record.fileRecordIds,
          files: diskFiles,
          key,
          reason: 'database-backed derivative group is incomplete',
        });
        continue;
      }

      if (record.referenced) {
        for (const file of diskFiles) {
          entries.push({
            category: 'referenced',
            relativePath: file.relativePath,
            reason: `${key} is referenced by the database`,
          });
        }
        groups.push({
          action: 'keep',
          fileRecordIds: record.fileRecordIds,
          files: diskFiles,
          key,
          reason: 'database record is attached',
        });
        continue;
      }
    }

    const oldEnough =
      diskFiles.length > 0 && diskFiles.every((file) => file.mtimeMs < cutoff);
    const action: CleanupAction = oldEnough
      ? record?.fileRecordIds.length
        ? 'delete-files-and-record'
        : 'delete-files'
      : 'protect';
    for (const file of diskFiles) {
      entries.push({
        category: oldEnough ? 'orphan' : 'protected',
        relativePath: file.relativePath,
        reason: oldEnough
          ? `${key} is an unreferenced group older than the protection window`
          : `${key} is inside or on the protection window`,
      });
    }
    groups.push({
      action,
      fileRecordIds: record?.fileRecordIds,
      files: diskFiles,
      key,
      reason: oldEnough ? 'eligible orphan group' : 'protected by mtime',
    });
  }

  const counts = Object.fromEntries(
    categories.map((category) => [
      category,
      entries.filter((entry) => entry.category === category).length,
    ]),
  ) as Record<CleanupCategory, number>;
  return { counts, entries, groups, uploadsRoot: root };
};

const executeUploadCleanup = async (
  plan: CleanupPlan,
  {
    apply,
    backupConfirmed,
    deleteFileRecord = () => Promise.resolve(undefined),
    removeFile = fs.unlink,
  }: ExecuteOptions,
) => {
  if (apply && !backupConfirmed) {
    throw new Error('--apply requires --backup-confirmed');
  }
  if (!apply) return { exitCode: 0, failures: [] as CleanupFailure[] };

  const failures: CleanupFailure[] = [];
  for (const group of plan.groups) {
    if (
      group.action !== 'delete-files' &&
      group.action !== 'delete-files-and-record'
    ) {
      continue;
    }

    let groupFailed = false;
    for (const file of group.files) {
      try {
        await removeFile(file.absolutePath);
      } catch (error) {
        groupFailed = true;
        failures.push({
          operation: 'delete-file',
          reason: error instanceof Error ? error.message : String(error),
          relativePath: file.relativePath,
        });
      }
    }

    if (!groupFailed && group.action === 'delete-files-and-record') {
      for (const fileRecordId of group.fileRecordIds ?? []) {
        try {
          await deleteFileRecord(fileRecordId);
        } catch (error) {
          failures.push({
            operation: 'delete-record',
            reason: error instanceof Error ? error.message : String(error),
            relativePath: `file-record:${fileRecordId}`,
          });
        }
      }
    }
  }
  return { exitCode: failures.length > 0 ? 1 : 0, failures };
};

export {
  executeUploadCleanup,
  parseCleanupArguments,
  planUploadCleanup,
  type AvatarReference,
  type CleanupEntry,
  type CleanupGroup,
  type CleanupPlan,
  type FileReference,
};
