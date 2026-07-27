import { requestValidatedEmbedding } from '../embedding/embedding-safety';

type NodeEnvironment = 'development' | 'test' | 'production';

interface BackfillPost {
  id: number;
  title: string;
  titleEmbedding: unknown;
}

interface BackfillDependencies {
  posts: BackfillPost[];
  forceAll: boolean;
  timeoutMs: number;
  embed: (title: string) => Promise<unknown>;
  updateEmbedding: (postId: number, vector: number[]) => Promise<void>;
  onSuccess?: (post: BackfillPost) => void;
  onFailure?: (post: BackfillPost, error: unknown) => void;
}

interface BackfillResult {
  total: number;
  pending: number;
  succeeded: number;
  failed: number;
  failedPostIds: number[];
}

const resolveBackfillMode = (
  args: readonly string[],
  nodeEnv: NodeEnvironment,
): boolean => {
  const forceAll = args.includes('--all');
  if (forceAll && nodeEnv === 'production') {
    throw new Error('--all is forbidden in production');
  }
  return forceAll;
};

const runEmbeddingBackfill = async ({
  posts,
  forceAll,
  timeoutMs,
  embed,
  updateEmbedding,
  onSuccess,
  onFailure,
}: BackfillDependencies): Promise<BackfillResult> => {
  const pending = forceAll
    ? posts
    : posts.filter((post) => post.titleEmbedding == null);
  const failedPostIds: number[] = [];
  let succeeded = 0;

  for (const post of pending) {
    try {
      const vector = await requestValidatedEmbedding(
        () => embed(post.title),
        timeoutMs,
      );
      await updateEmbedding(post.id, vector);
      succeeded += 1;
      onSuccess?.(post);
    } catch (error) {
      failedPostIds.push(post.id);
      onFailure?.(post, error);
    }
  }

  return {
    total: posts.length,
    pending: pending.length,
    succeeded,
    failed: failedPostIds.length,
    failedPostIds,
  };
};

export { resolveBackfillMode, runEmbeddingBackfill };
export type { BackfillDependencies, BackfillPost, BackfillResult };
