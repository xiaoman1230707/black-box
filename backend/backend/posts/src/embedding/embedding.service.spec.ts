import { OpenAIEmbeddings } from '@langchain/openai';
import { EmbeddingService } from './embedding.service';

const mockEmbedQuery = jest.fn();

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: mockEmbedQuery,
  })),
}));

jest.mock('../config/env', () => ({
  getRuntimeEnv: () => ({
    openai: {
      apiKey: 'key',
      baseUrl: 'https://openai.example.com/v1',
      embeddingModel: 'text-embedding-3-small',
    },
    aiTimeouts: { embedding: 20, chat: 30 },
  }),
}));

describe('EmbeddingService', () => {
  beforeEach(() => {
    mockEmbedQuery.mockReset();
    jest.mocked(OpenAIEmbeddings).mockClear();
  });

  it('configures one finite provider attempt', () => {
    new EmbeddingService();

    const options = jest.mocked(OpenAIEmbeddings).mock
      .calls[0][0] as unknown as {
      timeout: number;
      maxRetries: number;
      configuration: {
        timeout: number;
        maxRetries: number;
        fetch: typeof globalThis.fetch;
      };
    };
    expect(options.timeout).toBe(20);
    expect(options.maxRetries).toBe(0);
    expect(options.configuration).toMatchObject({ timeout: 20, maxRetries: 0 });
    expect(options.configuration.fetch).toEqual(expect.any(Function));
  });

  it('rejects a provider call that remains pending', async () => {
    jest.useFakeTimers();
    mockEmbedQuery.mockReturnValue(new Promise(() => undefined));
    const service = new EmbeddingService();
    const request = service.embed('query');
    const rejection = expect(request).rejects.toMatchObject({
      name: 'AIRequestTimeoutError',
    });

    jest.advanceTimersByTime(20);

    await rejection;
    jest.useRealTimers();
  });

  it('rejects an invalid provider vector', async () => {
    mockEmbedQuery.mockResolvedValue([1, 2, 3]);
    const service = new EmbeddingService();

    await expect(service.embed('query')).rejects.toThrow(/1536/);
  });
});
