type NodeEnvironment = 'development' | 'test' | 'production';
type EnvironmentProfile = 'runtime' | 'database' | 'embedding' | 'demoSeed';
type EnvironmentSource = Readonly<Record<string, string | undefined>>;

interface DatabaseEnv {
  nodeEnv: NodeEnvironment;
  databaseUrl: string;
}

interface OpenAIEnv {
  apiKey: string;
  baseUrl: string;
  embeddingModel: string;
}

interface EmbeddingEnv extends DatabaseEnv {
  openai: OpenAIEnv;
  aiTimeouts: {
    embedding: number;
    chat: number;
  };
}

interface DemoSeedEnv extends DatabaseEnv {
  demoUserPassword: string;
}

interface RuntimeEnv extends DatabaseEnv {
  port: number;
  tokenSecret: string;
  publicBaseUrl: string;
  frontendOrigin: string;
  trustProxy: false | 'loopback';
  deepseek: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  openai: OpenAIEnv;
  aiTimeouts: {
    embedding: number;
    chat: number;
  };
  rateLimits: Record<
    'global' | 'login' | 'register' | 'aiChat' | 'aiSearch' | 'upload',
    { limit: number; ttl: number }
  >;
}

interface EnvironmentByProfile {
  runtime: RuntimeEnv;
  database: DatabaseEnv;
  embedding: EmbeddingEnv;
  demoSeed: DemoSeedEnv;
}

const RATE_LIMIT_DEFAULTS = {
  global: { limit: 60, ttl: 60_000 },
  login: { limit: 10, ttl: 60_000 },
  register: { limit: 5, ttl: 600_000 },
  aiChat: { limit: 10, ttl: 60_000 },
  aiSearch: { limit: 30, ttl: 60_000 },
  upload: { limit: 20, ttl: 600_000 },
} as const;

const RATE_LIMIT_VARIABLES = {
  global: ['THROTTLE_GLOBAL_LIMIT', 'THROTTLE_GLOBAL_TTL_MS'],
  login: ['THROTTLE_LOGIN_LIMIT', 'THROTTLE_LOGIN_TTL_MS'],
  register: ['THROTTLE_REGISTER_LIMIT', 'THROTTLE_REGISTER_TTL_MS'],
  aiChat: ['THROTTLE_AI_CHAT_LIMIT', 'THROTTLE_AI_CHAT_TTL_MS'],
  aiSearch: ['THROTTLE_AI_SEARCH_LIMIT', 'THROTTLE_AI_SEARCH_TTL_MS'],
  upload: ['THROTTLE_UPLOAD_LIMIT', 'THROTTLE_UPLOAD_TTL_MS'],
} as const;

const weakSecretFragments = [
  'secret',
  'changeme',
  'default',
  'example',
  'demo',
  'test',
];

const readNodeEnvironment = (
  source: EnvironmentSource,
  issues: string[],
): NodeEnvironment => {
  const value = source.NODE_ENV?.trim() || 'development';
  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }
  issues.push('NODE_ENV must be development, test, or production');
  return 'development';
};

const readRequired = (
  source: EnvironmentSource,
  name: string,
  issues: string[],
): string => {
  const value = source[name]?.trim();
  if (!value) {
    issues.push(`${name} is required`);
    return '';
  }
  return value;
};

const readPositiveInteger = (
  source: EnvironmentSource,
  name: string,
  fallback: number,
  issues: string[],
  maximum = Number.MAX_SAFE_INTEGER,
): number => {
  const raw = source[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    issues.push(
      `${name} must be a positive integer no greater than ${maximum}`,
    );
    return fallback;
  }
  return value;
};

const readUrl = (
  source: EnvironmentSource,
  name: string,
  fallback: string | undefined,
  issues: string[],
): string => {
  const raw = source[name]?.trim() || fallback;
  if (!raw) {
    issues.push(`${name} is required`);
    return '';
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
    return raw.replace(/\/+$/, '');
  } catch {
    issues.push(`${name} must be a valid http(s) URL`);
    return '';
  }
};

const readOrigin = (
  source: EnvironmentSource,
  fallback: string | undefined,
  issues: string[],
): string => {
  const value = readUrl(source, 'FRONTEND_ORIGIN', fallback, issues);
  if (!value) return '';

  const parsed = new URL(value);
  if (
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    issues.push('FRONTEND_ORIGIN must contain only scheme, host, and port');
    return '';
  }
  return parsed.origin;
};

const readDatabase = (
  source: EnvironmentSource,
  nodeEnv: NodeEnvironment,
  issues: string[],
): DatabaseEnv => ({
  nodeEnv,
  databaseUrl: readRequired(source, 'DATABASE_URL', issues),
});

const readOpenAI = (
  source: EnvironmentSource,
  issues: string[],
): OpenAIEnv => ({
  apiKey: readRequired(source, 'OPENAI_API_KEY', issues),
  baseUrl: readUrl(source, 'OPENAI_BASE_URL', undefined, issues),
  embeddingModel: source.EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
});

const throwIfInvalid = (issues: string[]) => {
  if (issues.length > 0) {
    throw new Error(`Environment validation failed: ${issues.join('; ')}`);
  }
};

function validateEnvironment(
  profile: 'runtime',
  source?: EnvironmentSource,
): RuntimeEnv;
function validateEnvironment(
  profile: 'database',
  source?: EnvironmentSource,
): DatabaseEnv;
function validateEnvironment(
  profile: 'embedding',
  source?: EnvironmentSource,
): EmbeddingEnv;
function validateEnvironment(
  profile: 'demoSeed',
  source?: EnvironmentSource,
): DemoSeedEnv;
function validateEnvironment<P extends EnvironmentProfile>(
  profile: P,
  source: EnvironmentSource = process.env,
): EnvironmentByProfile[P] {
  const issues: string[] = [];
  const nodeEnv = readNodeEnvironment(source, issues);
  const database = readDatabase(source, nodeEnv, issues);

  if (profile === 'database') {
    throwIfInvalid(issues);
    return database as EnvironmentByProfile[P];
  }

  if (profile === 'embedding') {
    const result: EmbeddingEnv = {
      ...database,
      openai: readOpenAI(source, issues),
      aiTimeouts: {
        embedding: readPositiveInteger(
          source,
          'AI_EMBEDDING_TIMEOUT_MS',
          20_000,
          issues,
        ),
        chat: readPositiveInteger(source, 'AI_CHAT_TIMEOUT_MS', 30_000, issues),
      },
    };
    throwIfInvalid(issues);
    return result as EnvironmentByProfile[P];
  }

  if (profile === 'demoSeed') {
    const result: DemoSeedEnv = {
      ...database,
      demoUserPassword: readRequired(source, 'DEMO_USER_PASSWORD', issues),
    };
    throwIfInvalid(issues);
    return result as EnvironmentByProfile[P];
  }

  const port = readPositiveInteger(source, 'PORT', 3000, issues, 65_535);
  const tokenSecret = readRequired(source, 'TOKEN_SECRET', issues);
  if (
    tokenSecret &&
    (tokenSecret.length < 32 ||
      weakSecretFragments.some((fragment) =>
        tokenSecret.toLowerCase().includes(fragment),
      ))
  ) {
    issues.push(
      'TOKEN_SECRET must be at least 32 characters and not contain common weak placeholders',
    );
  }

  const trustProxyValue = source.TRUST_PROXY?.trim() || 'false';
  const trustProxy = trustProxyValue === 'loopback' ? 'loopback' : false;
  if (trustProxyValue !== 'false' && trustProxyValue !== 'loopback') {
    issues.push('TRUST_PROXY must be false or loopback');
  }

  const rateLimits = Object.fromEntries(
    Object.entries(RATE_LIMIT_VARIABLES).map(([key, names]) => {
      const typedKey = key as keyof typeof RATE_LIMIT_DEFAULTS;
      const defaults = RATE_LIMIT_DEFAULTS[typedKey];
      return [
        typedKey,
        {
          limit: readPositiveInteger(source, names[0], defaults.limit, issues),
          ttl: readPositiveInteger(source, names[1], defaults.ttl, issues),
        },
      ];
    }),
  ) as RuntimeEnv['rateLimits'];

  const result: RuntimeEnv = {
    ...database,
    port,
    tokenSecret,
    publicBaseUrl: readUrl(
      source,
      'PUBLIC_BASE_URL',
      nodeEnv === 'production' ? undefined : `http://localhost:${port}`,
      issues,
    ),
    frontendOrigin: readOrigin(
      source,
      nodeEnv === 'production' ? undefined : 'http://localhost:5173',
      issues,
    ),
    trustProxy,
    deepseek: {
      apiKey: readRequired(source, 'DEEPSEEK_API_KEY', issues),
      baseUrl: readUrl(source, 'DEEPSEEK_BASE_URL', undefined, issues),
      model: source.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
    },
    openai: readOpenAI(source, issues),
    aiTimeouts: {
      embedding: readPositiveInteger(
        source,
        'AI_EMBEDDING_TIMEOUT_MS',
        20_000,
        issues,
      ),
      chat: readPositiveInteger(source, 'AI_CHAT_TIMEOUT_MS', 30_000, issues),
    },
    rateLimits,
  };

  throwIfInvalid(issues);
  return result as EnvironmentByProfile[P];
}

let cachedRuntimeEnv: RuntimeEnv | undefined;

const getRuntimeEnv = () => {
  cachedRuntimeEnv ??= validateEnvironment('runtime');
  return cachedRuntimeEnv;
};

export {
  getRuntimeEnv,
  validateEnvironment,
  type DatabaseEnv,
  type DemoSeedEnv,
  type EmbeddingEnv,
  type EnvironmentProfile,
  type EnvironmentSource,
  type RuntimeEnv,
};
