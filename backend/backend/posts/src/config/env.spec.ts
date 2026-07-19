import { resolveExpressTrustProxy, validateEnvironment } from './env';

const validRuntime = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://demo.invalid/black_box',
  TOKEN_SECRET: '7kF9vQ2mR8xT4pL6nB3cD5sH1jW0yZUa',
  DEEPSEEK_API_KEY: 'deepseek-key-value',
  DEEPSEEK_BASE_URL: 'https://deepseek.example.com/v1',
  OPENAI_API_KEY: 'openai-key-value',
  OPENAI_BASE_URL: 'https://openai.example.com/v1',
};

describe('validateEnvironment', () => {
  it('parses the complete runtime profile with development defaults', () => {
    const env = validateEnvironment('runtime', validRuntime);

    expect(env).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      databaseUrl: validRuntime.DATABASE_URL,
      tokenSecret: validRuntime.TOKEN_SECRET,
      publicBaseUrl: 'http://localhost:3000',
      frontendOrigin: 'http://localhost:5173',
      trustProxy: false,
      deepseek: {
        apiKey: validRuntime.DEEPSEEK_API_KEY,
        baseUrl: validRuntime.DEEPSEEK_BASE_URL,
        model: 'deepseek-chat',
      },
      openai: {
        apiKey: validRuntime.OPENAI_API_KEY,
        baseUrl: validRuntime.OPENAI_BASE_URL,
        embeddingModel: 'text-embedding-3-small',
      },
    });
    expect(env.rateLimits.global).toEqual({ limit: 60, ttl: 60_000 });
    expect(env.aiTimeouts).toEqual({ embedding: 20_000, chat: 30_000 });
  });

  it('allows database-only maintenance without JWT or AI variables', () => {
    expect(
      validateEnvironment('database', {
        DATABASE_URL: validRuntime.DATABASE_URL,
      }),
    ).toEqual({
      nodeEnv: 'development',
      databaseUrl: validRuntime.DATABASE_URL,
    });
  });

  it('requires only database and OpenAI settings for embedding work', () => {
    const env = validateEnvironment('embedding', {
      DATABASE_URL: validRuntime.DATABASE_URL,
      OPENAI_API_KEY: validRuntime.OPENAI_API_KEY,
      OPENAI_BASE_URL: validRuntime.OPENAI_BASE_URL,
    });

    expect(env.openai.embeddingModel).toBe('text-embedding-3-small');
    expect(() =>
      validateEnvironment('embedding', {
        DATABASE_URL: validRuntime.DATABASE_URL,
      }),
    ).toThrow(/OPENAI_API_KEY.*OPENAI_BASE_URL/);
  });

  it('requires the demo password without requiring AI settings', () => {
    expect(
      validateEnvironment('demoSeed', {
        DATABASE_URL: validRuntime.DATABASE_URL,
        DEMO_USER_PASSWORD: 'DemoPassword123',
      }),
    ).toMatchObject({ demoUserPassword: 'DemoPassword123' });
  });

  it('rejects weak JWT secrets without echoing their value', () => {
    const weakSecret = 'this-is-a-test-secret-that-is-long-enough';

    expect(() =>
      validateEnvironment('runtime', {
        ...validRuntime,
        TOKEN_SECRET: weakSecret,
      }),
    ).toThrow('TOKEN_SECRET');

    try {
      validateEnvironment('runtime', {
        ...validRuntime,
        TOKEN_SECRET: weakSecret,
      });
    } catch (error) {
      expect(String(error)).not.toContain(weakSecret);
    }
  });

  it('requires explicit public URLs in production', () => {
    expect(() =>
      validateEnvironment('runtime', {
        ...validRuntime,
        NODE_ENV: 'production',
      }),
    ).toThrow(/PUBLIC_BASE_URL.*FRONTEND_ORIGIN/);
  });

  it('rejects invalid integers, URLs, origins, and proxy settings', () => {
    let message = '';
    try {
      validateEnvironment('runtime', {
        ...validRuntime,
        PORT: '0',
        DEEPSEEK_BASE_URL: 'not-a-url',
        FRONTEND_ORIGIN: 'https://app.example.com/path',
        TRUST_PROXY: 'true',
      });
    } catch (error) {
      message = String(error);
    }

    expect(message).toContain('PORT');
    expect(message).toContain('DEEPSEEK_BASE_URL');
    expect(message).toContain('FRONTEND_ORIGIN');
    expect(message).toContain('TRUST_PROXY');
  });

  it('normalizes an exact frontend origin and accepts loopback proxy trust', () => {
    const env = validateEnvironment('runtime', {
      ...validRuntime,
      FRONTEND_ORIGIN: 'https://app.example.com/',
      TRUST_PROXY: 'loopback',
    });

    expect(env.frontendOrigin).toBe('https://app.example.com');
    expect(env.trustProxy).toBe('loopback');
  });

  it('accepts one-hop proxy trust for the controlled Nginx topology', () => {
    const env = validateEnvironment('runtime', {
      ...validRuntime,
      TRUST_PROXY: 'one-hop',
    });

    expect(env.trustProxy).toBe('one-hop');
  });

  it('maps only the supported proxy trust values to Express settings', () => {
    expect(resolveExpressTrustProxy(false)).toBe(false);
    expect(resolveExpressTrustProxy('loopback')).toBe('loopback');
    expect(resolveExpressTrustProxy('one-hop')).toBe(1);
  });

  it.each(['true', '1', '2', '10.0.0.0/8', 'proxy'])(
    'rejects unsupported proxy trust value %s',
    (trustProxy) => {
      expect(() =>
        validateEnvironment('runtime', {
          ...validRuntime,
          TRUST_PROXY: trustProxy,
        }),
      ).toThrow('TRUST_PROXY must be false, loopback, or one-hop');
    },
  );

  it('accepts explicit AI deadlines and rejects invalid timeout values', () => {
    const env = validateEnvironment('runtime', {
      ...validRuntime,
      AI_EMBEDDING_TIMEOUT_MS: '15000',
      AI_CHAT_TIMEOUT_MS: '45000',
    });

    expect(env.aiTimeouts).toEqual({ embedding: 15_000, chat: 45_000 });
    expect(() =>
      validateEnvironment('runtime', {
        ...validRuntime,
        AI_EMBEDDING_TIMEOUT_MS: '0',
        AI_CHAT_TIMEOUT_MS: 'not-a-number',
      }),
    ).toThrow(/AI_EMBEDDING_TIMEOUT_MS.*AI_CHAT_TIMEOUT_MS/);
  });
});
