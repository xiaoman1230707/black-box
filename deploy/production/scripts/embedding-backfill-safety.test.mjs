import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const appRoot = process.env.APP_ROOT || '/app';
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const { OpenAIEmbeddings } = appRequire('@langchain/openai');
const {
  createEmbeddingDeadlineFetch,
  requestValidatedEmbedding,
} = appRequire('./dist/src/embedding/embedding-safety.js');
const {
  runEmbeddingBackfill,
} = appRequire('./dist/src/scripts/backfill-embeddings.runner.js');

const validVector = () => Array.from({ length: 1536 }, () => 0.25);

test('production Compose runs null-only backfill', () => {
  const productionDir =
    process.env.PRODUCTION_DIR || path.resolve(import.meta.dirname, '..');
  const compose = fs.readFileSync(path.join(productionDir, 'compose.yaml'), 'utf8');
  const databaseEnv = fs.readFileSync(
    path.join(productionDir, 'database.env.example'),
    'utf8',
  );
  const embeddingService = compose.slice(
    compose.indexOf('  embedding-backfill:'),
    compose.indexOf('\n  ai-preflight:'),
  );

  assert.match(embeddingService, /DATABASE_ENV_FILE/);
  assert.match(databaseEnv, /^NODE_ENV=production$/m);
  assert.match(
    embeddingService,
    /command: \["node", "dist\/src\/scripts\/backfill-embeddings\.js"\]/,
  );
  assert.doesNotMatch(embeddingService, /--all/);
});

const sdk = (fetchImpl, timeoutMs = 40) =>
  new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    encodingFormat: 'float',
    timeout: 1_000,
    maxRetries: 0,
    configuration: {
      apiKey: 'container-fixture-key',
      baseURL: 'https://provider.invalid/v1',
      timeout: 1_000,
      maxRetries: 0,
      fetch: createEmbeddingDeadlineFetch(timeoutMs, fetchImpl),
    },
  });

const jsonFetch = (embedding, calls) => async () => {
  calls.count += 1;
  return new Response(JSON.stringify({ data: [{ embedding }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

test('headers followed by a stalled body abort once and never updates', async () => {
  const calls = { count: 0 };
  let aborted = false;
  const fetchImpl = async (_input, init) => {
    calls.count += 1;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":['));
        init.signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            controller.error(new DOMException('aborted', 'AbortError'));
          },
          { once: true },
        );
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const model = sdk(fetchImpl);
  const updates = [];
  const result = await runEmbeddingBackfill({
    posts: [{ id: 1, title: 'stalled', titleEmbedding: null }],
    forceAll: false,
    timeoutMs: 40,
    embed: (title) => model.embedQuery(title),
    updateEmbedding: async (id) => updates.push(id),
  });
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(calls.count, 1);
  assert.equal(aborted, true);
  assert.deepEqual(updates, []);
  assert.equal(result.failed, 1);
});

test('wrong dimensions make one request and never update', async () => {
  const calls = { count: 0 };
  const model = sdk(jsonFetch([1, 2, 3], calls));
  const updates = [];
  const result = await runEmbeddingBackfill({
    posts: [{ id: 1, title: 'bad-size', titleEmbedding: null }],
    forceAll: false,
    timeoutMs: 100,
    embed: (title) => model.embedQuery(title),
    updateEmbedding: async (id) => updates.push(id),
  });

  assert.equal(calls.count, 1);
  assert.deepEqual(updates, []);
  assert.equal(result.failed, 1);
});

test('non-number values make one request and never update', async () => {
  const calls = { count: 0 };
  const invalid = [...validVector().slice(0, -1), null];
  const model = sdk(jsonFetch(invalid, calls));
  const updates = [];
  const result = await runEmbeddingBackfill({
    posts: [{ id: 1, title: 'bad-value', titleEmbedding: null }],
    forceAll: false,
    timeoutMs: 100,
    embed: (title) => model.embedQuery(title),
    updateEmbedding: async (id) => updates.push(id),
  });

  assert.equal(calls.count, 1);
  assert.deepEqual(updates, []);
  assert.equal(result.failed, 1);
});

test('a valid vector makes one request and one update', async () => {
  const calls = { count: 0 };
  const model = sdk(jsonFetch(validVector(), calls));
  const updates = [];
  const result = await runEmbeddingBackfill({
    posts: [{ id: 1, title: 'valid', titleEmbedding: null }],
    forceAll: false,
    timeoutMs: 1_000,
    embed: (title) => model.embedQuery(title),
    updateEmbedding: async (id, value) => updates.push([id, value.length]),
  });

  assert.equal(calls.count, 1);
  assert.deepEqual(updates, [[1, 1536]]);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 0);
});

test('partial success is retained and the final result reports failure', async () => {
  let calls = 0;
  const updates = [];
  const result = await runEmbeddingBackfill({
    posts: [
      { id: 1, title: 'valid', titleEmbedding: null },
      { id: 2, title: 'invalid', titleEmbedding: null },
    ],
    forceAll: false,
    timeoutMs: 100,
    embed: async () => {
      calls += 1;
      return calls === 1 ? validVector() : [1, 2, 3];
    },
    updateEmbedding: async (id) => updates.push(id),
  });

  assert.equal(calls, 2);
  assert.deepEqual(updates, [1]);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 1);
});
