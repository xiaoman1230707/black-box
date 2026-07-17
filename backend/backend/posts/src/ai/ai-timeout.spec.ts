import {
  AIRequestTimeoutError,
  isAIRequestTimeoutError,
  withTimeout,
} from './ai-timeout';

describe('withTimeout', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('rejects a pending provider call at the configured deadline', async () => {
    const pending = new Promise<string>(() => undefined);
    const result = withTimeout(pending, 20, 'embedding');

    jest.advanceTimersByTime(20);

    await expect(result).rejects.toEqual(
      expect.objectContaining({ name: 'AIRequestTimeoutError' }),
    );
  });

  it('passes through a result completed before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 20, 'chat')).resolves.toBe(
      'ok',
    );
  });

  it('identifies only the dedicated timeout error', () => {
    expect(isAIRequestTimeoutError(new AIRequestTimeoutError('chat'))).toBe(
      true,
    );
    expect(isAIRequestTimeoutError(new Error('timeout'))).toBe(false);
  });

  it('recognizes abort errors produced by a timed AbortSignal', () => {
    const error = Object.assign(new Error('aborted'), { name: 'TimeoutError' });
    expect(isAIRequestTimeoutError(error)).toBe(true);
  });
});
