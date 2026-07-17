import { AIController } from './ai.controller';
import type { AIService } from './ai.service';
import { AIRequestTimeoutError } from './ai-timeout';
import type { Response } from 'express';

interface ResponseMock {
  headersSent: boolean;
  setHeader: jest.MockedFunction<(name: string, value: string) => void>;
  write: jest.MockedFunction<(value: string) => void>;
  status: jest.MockedFunction<(code: number) => ResponseMock>;
  json: jest.MockedFunction<(body: unknown) => ResponseMock>;
  end: jest.MockedFunction<() => ResponseMock>;
}

const createResponse = (): ResponseMock => {
  const response = {} as ResponseMock;
  response.headersSent = false;
  response.setHeader = jest.fn<(name: string, value: string) => void>();
  response.write = jest.fn<(value: string) => void>(() => {
    response.headersSent = true;
  });
  response.status = jest.fn<(code: number) => ResponseMock>(() => response);
  response.json = jest.fn<(body: unknown) => ResponseMock>(() => response);
  response.end = jest.fn<() => ResponseMock>(() => response);
  return response;
};

describe('AIController chat failure responses', () => {
  it('returns 504 when a timeout occurs before the stream is committed', async () => {
    const aiService = {
      chat: jest.fn().mockRejectedValue(new AIRequestTimeoutError('chat')),
    };
    const controller = new AIController(aiService as unknown as AIService);
    const response = createResponse();

    await controller.chat({ messages: [] }, response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(504);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 504,
      code: 'AI_TIMEOUT',
      message: 'AI 服务响应超时，请稍后重试',
    });
  });

  it('writes a data-stream error part after text has been committed', async () => {
    const aiService = {
      chat: jest
        .fn()
        .mockImplementation(
          (_messages: unknown, onToken: (token: string) => void) => {
            onToken('partial');
            return Promise.reject(new AIRequestTimeoutError('chat'));
          },
        ),
    };
    const controller = new AIController(aiService as unknown as AIService);
    const response = createResponse();

    await controller.chat({ messages: [] }, response as unknown as Response);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.write).toHaveBeenLastCalledWith(
      `3:${JSON.stringify('AI 服务响应超时，请稍后重试')}\n`,
    );
    expect(response.end).toHaveBeenCalled();
  });
});
