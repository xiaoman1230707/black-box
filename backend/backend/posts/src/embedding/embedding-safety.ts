import { AsyncLocalStorage } from 'node:async_hooks';
import { AIRequestTimeoutError, withTimeout } from '../ai/ai-timeout';

const EMBEDDING_DIMENSIONS = 1536;

type EmbeddingRequest = () => Promise<unknown>;
type EmbeddingAssertion = (value: unknown) => asserts value is number[];

const embeddingDeadlineStorage = new AsyncLocalStorage<AbortSignal>();

const assertPositiveTimeout = (timeoutMs: number) => {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('embedding timeout must be a positive integer');
  }
};

const createEmbeddingDeadlineFetch = (
  timeoutMs: number,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch => {
  assertPositiveTimeout(timeoutMs);

  return async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const deadlineSignal =
      embeddingDeadlineStorage.getStore() ?? AbortSignal.timeout(timeoutMs);
    const callerSignal = init?.signal;
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, deadlineSignal])
      : deadlineSignal;

    return fetchImpl(input, { ...init, signal });
  };
};

const assertEmbeddingVector: EmbeddingAssertion = (value) => {
  if (!Array.isArray(value)) {
    throw new Error('embedding must be an array');
  }
  if (value.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedding dimension must be ${EMBEDDING_DIMENSIONS}`);
  }
  if (
    !value.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    throw new Error('embedding must contain only finite numbers');
  }
};

const requestValidatedEmbedding = async (
  request: EmbeddingRequest,
  timeoutMs: number,
): Promise<number[]> => {
  assertPositiveTimeout(timeoutMs);
  const deadlineSignal = AbortSignal.timeout(timeoutMs);
  let value: unknown;
  try {
    value = await embeddingDeadlineStorage.run(deadlineSignal, () =>
      withTimeout(Promise.resolve().then(request), timeoutMs, 'embedding'),
    );
  } catch (error) {
    if (deadlineSignal.aborted) {
      throw new AIRequestTimeoutError('embedding');
    }
    throw error;
  }
  assertEmbeddingVector(value);
  return value;
};

export {
  EMBEDDING_DIMENSIONS,
  assertEmbeddingVector,
  createEmbeddingDeadlineFetch,
  requestValidatedEmbedding,
};
export type { EmbeddingRequest };
