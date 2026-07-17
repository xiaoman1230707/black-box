import { ChatDeepSeek } from '@langchain/deepseek';
import { AIService } from './ai.service';

interface StreamChunk {
  content: string;
}

type StreamCall = (
  messages: unknown[],
  options: { signal: AbortSignal },
) => Promise<AsyncIterable<StreamChunk>>;

const mockStream = jest.fn<StreamCall>();

jest.mock('@langchain/deepseek', () => ({
  ChatDeepSeek: jest.fn().mockImplementation(() => ({ stream: mockStream })),
}));

jest.mock('../config/env', () => ({
  getRuntimeEnv: () => ({
    deepseek: {
      apiKey: 'key',
      baseUrl: 'https://deepseek.example.com/v1',
      model: 'deepseek-chat',
    },
    aiTimeouts: { embedding: 20, chat: 30 },
  }),
}));

jest.mock('../config/public-url', () => ({
  publicMediaUrl: (path: string) => `https://media.example.com/${path}`,
}));

describe('AIService chat deadlines', () => {
  beforeEach(() => {
    mockStream.mockReset();
    jest.mocked(ChatDeepSeek).mockClear();
  });

  it('configures one finite DeepSeek attempt', () => {
    new AIService({} as never, { embed: jest.fn() } as never);

    const options = jest.mocked(ChatDeepSeek).mock.calls[0][0] as unknown as {
      timeout: number;
      maxRetries: number;
      configuration: { timeout: number; maxRetries: number };
    };
    expect(options.timeout).toBe(30);
    expect(options.maxRetries).toBe(0);
    expect(options.configuration).toMatchObject({ timeout: 30, maxRetries: 0 });
  });

  it('degrades a citation embedding failure and still streams chat', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const embedding = { embed: jest.fn().mockRejectedValue(new Error('down')) };
    let sent = false;
    const chunks: AsyncIterable<StreamChunk> = {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          if (sent) return Promise.resolve({ done: true, value: undefined });
          sent = true;
          return Promise.resolve({ done: false, value: { content: 'answer' } });
        },
      }),
    };
    mockStream.mockResolvedValue(chunks);
    const service = new AIService({} as never, embedding as never);
    const onToken = jest.fn();

    await service.chat([{ role: 'user', content: 'question' }], onToken);

    const streamCall = mockStream.mock.calls[0] as unknown as [
      unknown[],
      { signal: AbortSignal },
    ];
    expect(streamCall[1].signal).toBeInstanceOf(AbortSignal);
    expect(onToken).toHaveBeenCalledWith('answer');
    consoleError.mockRestore();
  });

  it('rejects when the model stream never starts', async () => {
    jest.useFakeTimers();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const embedding = { embed: jest.fn().mockRejectedValue(new Error('down')) };
    mockStream.mockReturnValue(new Promise(() => undefined));
    const service = new AIService({} as never, embedding as never);
    const request = service.chat(
      [{ role: 'user', content: 'question' }],
      jest.fn(),
    );
    const rejection = expect(request).rejects.toMatchObject({
      name: 'AIRequestTimeoutError',
    });

    await jest.advanceTimersByTimeAsync(30);

    await rejection;
    consoleError.mockRestore();
    jest.useRealTimers();
  });
});
