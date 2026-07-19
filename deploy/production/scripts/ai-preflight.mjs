import { pathToFileURL } from 'node:url';

const EMBEDDING_DIMENSIONS = 1536;
const MINIMAL_CHAT_PROMPT = 'Reply with OK.';
const MINIMAL_EMBEDDING_INPUT = 'deployment preflight';

const required = (env, name) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const positiveInteger = (env, name, fallback) => {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const endpoint = (baseUrl, path) => `${baseUrl.replace(/\/+$/, '')}${path}`;

const requestWithTimeout = async ({
  label,
  url,
  init,
  timeoutMs,
  fetchImpl,
  consume,
}) => {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} provider timed out`));
    }, timeoutMs);
  });

  try {
    const requestAndConsume = (async () => {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${label} provider returned HTTP ${response.status}`);
      }
      return consume(response);
    })();
    return await Promise.race([requestAndConsume, timeout]);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`${label} provider timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const runAiPreflight = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) => {
  const deepseekApiKey = required(env, 'DEEPSEEK_API_KEY');
  const deepseekBaseUrl = required(env, 'DEEPSEEK_BASE_URL');
  const deepseekModel = required(env, 'DEEPSEEK_MODEL');
  const openAiApiKey = required(env, 'OPENAI_API_KEY');
  const openAiBaseUrl = required(env, 'OPENAI_BASE_URL');
  const embeddingModel = required(env, 'EMBEDDING_MODEL');
  const chatTimeoutMs = positiveInteger(env, 'AI_CHAT_TIMEOUT_MS', 30_000);
  const embeddingTimeoutMs = positiveInteger(
    env,
    'AI_EMBEDDING_TIMEOUT_MS',
    20_000,
  );

  const chatStartedAt = now();
  const chatResponse = await requestWithTimeout({
    label: 'chat',
    url: endpoint(deepseekBaseUrl, '/chat/completions'),
    timeoutMs: chatTimeoutMs,
    fetchImpl,
    consume: (response) => response.text(),
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [{ role: 'user', content: MINIMAL_CHAT_PROMPT }],
        max_tokens: 8,
        stream: true,
      }),
    },
  });
  const chatStream = chatResponse;
  if (!chatStream.includes('data:') || !chatStream.includes('[DONE]')) {
    throw new Error('chat provider did not complete the expected SSE stream');
  }

  const embeddingStartedAt = now();
  const embeddingResponse = await requestWithTimeout({
    label: 'embedding',
    url: endpoint(openAiBaseUrl, '/embeddings'),
    timeoutMs: embeddingTimeoutMs,
    fetchImpl,
    consume: (response) => response.json(),
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: MINIMAL_EMBEDDING_INPUT,
      }),
    },
  });
  const embeddingPayload = embeddingResponse;
  const embedding = embeddingPayload?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedding dimension must be ${EMBEDDING_DIMENSIONS}`);
  }
  if (!embedding.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new Error('embedding must contain only finite numbers');
  }

  return {
    chat: {
      completed: true,
      durationMs: Math.max(0, now() - chatStartedAt),
    },
    embedding: {
      dimensions: embedding.length,
      allFinite: true,
      durationMs: Math.max(0, now() - embeddingStartedAt),
    },
  };
};

const formatPreflightResult = (result) => JSON.stringify(result);

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMain) {
  runAiPreflight()
    .then((result) => {
      process.stdout.write(`${formatPreflightResult(result)}\n`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown failure';
      process.stderr.write(`AI preflight failed: ${message}\n`);
      process.exitCode = 1;
    });
}

export { formatPreflightResult, runAiPreflight };
