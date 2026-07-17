import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { validateEnvironment } from '../config/env';
import {
  executeUploadCleanup,
  parseCleanupArguments,
  planUploadCleanup,
} from '../maintenance/upload-cleanup';

const prisma = new PrismaClient();

const main = async () => {
  validateEnvironment('database');
  const options = parseCleanupArguments(process.argv.slice(2));
  const [avatars, files] = await Promise.all([
    prisma.avatar.findMany({ select: { id: true, filename: true } }),
    prisma.file.findMany({
      select: { id: true, filename: true, postId: true },
    }),
  ]);
  const plan = await planUploadCleanup({
    uploadsRoot: join(process.cwd(), 'uploads'),
    avatars,
    files,
    protectHours: options.protectHours,
  });

  console.log(options.apply ? 'MODE apply' : 'MODE dry-run');
  for (const [category, count] of Object.entries(plan.counts)) {
    console.log(`COUNT ${category} ${count}`);
  }
  for (const entry of plan.entries) {
    console.log(`${entry.category} ${entry.relativePath} ${entry.reason}`);
  }

  const result = await executeUploadCleanup(plan, {
    apply: options.apply,
    backupConfirmed: options.backupConfirmed,
    deleteFileRecord: (id) => prisma.file.delete({ where: { id } }),
  });
  for (const failure of result.failures) {
    console.error(
      `FAILED ${failure.operation} ${failure.relativePath} ${failure.reason}`,
    );
  }
  process.exitCode = result.exitCode;
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
