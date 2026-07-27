import { OpenAIEmbeddings } from '@langchain/openai';
import {
  EMBEDDING_DIMENSIONS,
  assertEmbeddingVector,
  createEmbeddingDeadlineFetch,
  requestValidatedEmbedding,
} from './embedding-safety';

const validVector = () => Array.from({ length: 1536 }, () => 0.25);

describe('embedding safety contract', () => {
  it('accepts exactly 1536 finite numbers', async () => {
    const vector = validVector();
    await expect(
      requestValidatedEmbedding(() => Promise.resolve(vector), 100),
    ).resolves.toBe(vector);
  });

  it.each([
    ['non-array', { value: 1 }],
    ['1535 dimensions', validVector().slice(1)],
    ['1537 dimensions', [...validVector(), 0]],
    ['non-number', [...validVector().slice(0, -1), null]],
    ['NaN', [...validVector().slice(0, -1), Number.NaN]],
    ['positive infinity', [...validVector().slice(0, -1), Infinity]],
    ['negative infinity', [...validVector().slice(0, -1), -Infinity]],
  ])('rejects %s before it can be persisted', (_label, value) => {
    expect(() => assertEmbeddingVector(value)).toThrow(
      /embedding.*(array|1536|finite)/i,
    );
  });

  it('covers SDK response body consumption after headers arrive', async () => {
    let bodyAborted = false;
    const fetchImpl: typeof globalThis.fetch = jest.fn((_input, init) => {
      const signal = init?.signal;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"data":['));
          signal?.addEventListener(
            'abort',
            () => {
              bodyAborted = true;
              controller.error(new DOMException('aborted', 'AbortError'));
            },
            { once: true },
          );
        },
      });
      return Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      timeout: 1_000,
      maxRetries: 0,
      configuration: {
        apiKey: 'test-key',
        baseURL: 'https://provider.invalid/v1',
        timeout: 1_000,
        maxRetries: 0,
        fetch: createEmbeddingDeadlineFetch(30, fetchImpl),
      },
    });

    await expect(
      requestValidatedEmbedding(() => embeddings.embedQuery('title'), 30),
    ).rejects.toMatchObject({ name: 'AIRequestTimeoutError' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(bodyAborted).toBe(true);
  });

  it('propagates a caller abort to the underlying fetch', async () => {
    const caller = new AbortController();
    let receivedSignal: AbortSignal | null = null;
    const fetchImpl: typeof globalThis.fetch = jest.fn((_input, init) => {
      receivedSignal = init?.signal ?? null;
      return new Promise((_resolve, reject) => {
        receivedSignal?.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true },
        );
      });
    });
    const deadlineFetch = createEmbeddingDeadlineFetch(1_000, fetchImpl);

    const request = deadlineFetch('https://provider.invalid/v1/embeddings', {
      signal: caller.signal,
    });
    caller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('exports the fixed production dimension', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });
});
