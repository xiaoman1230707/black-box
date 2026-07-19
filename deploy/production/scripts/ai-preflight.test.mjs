import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPreflightResult, runAiPreflight } from './ai-preflight.mjs';

const validEnv = {
  DEEPSEEK_API_KEY: 'deepseek-sensitive-value',
  DEEPSEEK_BASE_URL: 'https://deepseek.invalid/v1',
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  OPENAI_API_KEY: 'embedding-sensitive-value',
  OPENAI_BASE_URL: 'https://embedding.invalid/v1',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  AI_CHAT_TIMEOUT_MS: '1000',
  AI_EMBEDDING_TIMEOUT_MS: '1000',
};

const chatResponse = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );

const embeddingResponse = (embedding = Array.from({ length: 1536 }, () => 0.1)) =>
  new Response(JSON.stringify({ data: [{ embedding }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

test('completes a streaming chat and validates a 1536-dimensional embedding', async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url: String(url), init });
    return requests.length === 1 ? chatResponse() : embeddingResponse();
  };

  const result = await runAiPreflight({ env: validEnv, fetchImpl });

  assert.equal(result.chat.completed, true);
  assert.equal(result.embedding.dimensions, 1536);
  assert.equal(result.embedding.allFinite, true);
  assert.equal(requests.length, 2);
  assert.equal(JSON.parse(requests[0].init.body).stream, true);
});

test('fails without exposing an upstream error body', async () => {
  const fetchImpl = async () =>
    new Response('provider-secret-response', { status: 429 });

  await assert.rejects(
    runAiPreflight({ env: validEnv, fetchImpl }),
    /chat provider returned HTTP 429/,
  );
});

test('fails with a bounded timeout', async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError')),
      );
    });

  await assert.rejects(
    runAiPreflight({
      env: { ...validEnv, AI_CHAT_TIMEOUT_MS: '10' },
      fetchImpl,
    }),
    /chat provider timed out/,
  );
});

test('keeps the chat deadline active while consuming the response body', async () => {
  const fetchImpl = async () => ({
    ok: true,
    text: () => new Promise(() => {}),
  });
  const safetyTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('test safety timeout')), 100);
  });

  await assert.rejects(
    Promise.race([
      runAiPreflight({
        env: { ...validEnv, AI_CHAT_TIMEOUT_MS: '10' },
        fetchImpl,
      }),
      safetyTimeout,
    ]),
    /chat provider timed out/,
  );
});

test('keeps the embedding deadline active while consuming JSON', async () => {
  let call = 0;
  const fetchImpl = async () => {
    if (call++ === 0) return chatResponse();
    return {
      ok: true,
      json: () => new Promise(() => {}),
    };
  };
  const safetyTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('test safety timeout')), 100);
  });

  await assert.rejects(
    Promise.race([
      runAiPreflight({
        env: { ...validEnv, AI_EMBEDDING_TIMEOUT_MS: '10' },
        fetchImpl,
      }),
      safetyTimeout,
    ]),
    /embedding provider timed out/,
  );
});

test('rejects an embedding with the wrong dimension', async () => {
  let call = 0;
  const fetchImpl = async () =>
    call++ === 0 ? chatResponse() : embeddingResponse([0.1, 0.2]);

  await assert.rejects(
    runAiPreflight({ env: validEnv, fetchImpl }),
    /embedding dimension must be 1536/,
  );
});

test('rejects an embedding containing non-finite values', async () => {
  const vector = Array.from({ length: 1536 }, () => 0.1);
  vector[100] = null;
  let call = 0;
  const fetchImpl = async () =>
    call++ === 0 ? chatResponse() : embeddingResponse(vector);

  await assert.rejects(
    runAiPreflight({ env: validEnv, fetchImpl }),
    /embedding must contain only finite numbers/,
  );
});

test('formats only non-sensitive status metadata', () => {
  const output = formatPreflightResult({
    chat: { completed: true, durationMs: 12 },
    embedding: { dimensions: 1536, allFinite: true, durationMs: 18 },
  });

  assert.match(output, /"dimensions":1536/);
  assert.doesNotMatch(output, /sensitive|prompt|response|vector|baseUrl/i);
});
