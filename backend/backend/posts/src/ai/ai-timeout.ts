class AIRequestTimeoutError extends Error {
  constructor(operation: string) {
    super(`${operation} request timed out`);
    this.name = 'AIRequestTimeoutError';
  }
}

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new AIRequestTimeoutError(operation)),
      timeoutMs,
    );
  });

  return Promise.race([promise, deadline]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
};

const isAIRequestTimeoutError = (
  error: unknown,
): error is AIRequestTimeoutError =>
  error instanceof AIRequestTimeoutError ||
  (error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError'));

export { AIRequestTimeoutError, isAIRequestTimeoutError, withTimeout };
