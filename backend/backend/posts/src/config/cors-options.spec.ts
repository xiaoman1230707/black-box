import { createCorsOptions } from './cors-options';

describe('createCorsOptions', () => {
  it('exposes only the required request surface without credentials', () => {
    expect(createCorsOptions('https://app.example.com')).toMatchObject({
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    });
  });

  it.each([
    ['https://app.example.com', true],
    ['https://app.example.com.evil.invalid', false],
    [undefined, true],
  ])('resolves request origin %s to %s', (requestOrigin, expected) => {
    const origin = createCorsOptions('https://app.example.com').origin;
    if (typeof origin !== 'function') {
      throw new Error('CORS origin must use an exact-match callback');
    }

    const callback = jest.fn();
    origin(requestOrigin, callback);
    expect(callback).toHaveBeenCalledWith(null, expected);
  });
});
