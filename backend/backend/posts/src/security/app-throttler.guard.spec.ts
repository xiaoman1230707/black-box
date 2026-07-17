import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { AppThrottlerGuard } from './app-throttler.guard';
import { RATE_LIMIT_IDENTITY } from './rate-limit-identity.decorator';

const options: ThrottlerModuleOptions = {
  throttlers: [{ name: 'default', limit: 1, ttl: 60_000 }],
};

class TestGuard extends AppThrottlerGuard {
  resolveTracker(request: Record<string, unknown>, context: ExecutionContext) {
    return this.resolveRateLimitTracker(request, context);
  }

  reject(context: ExecutionContext, detail: ThrottlerLimitDetail) {
    return this.throwThrottlingException(context, detail);
  }
}

const contextFor = (identity?: 'user-or-ip'): ExecutionContext => {
  const handler = () => undefined;
  if (identity) Reflect.defineMetadata(RATE_LIMIT_IDENTITY, identity, handler);
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as ExecutionContext;
};

describe('AppThrottlerGuard', () => {
  const storage = {} as ThrottlerStorage;
  const reflector = new Reflector();
  const verifyAsync = jest.fn();
  const jwtService = { verifyAsync } as unknown as JwtService;

  beforeEach(() => verifyAsync.mockReset());

  it('uses IP identity by default without inspecting a bearer token', async () => {
    const guard = new TestGuard(options, storage, reflector, jwtService);
    const tracker = await guard.resolveTracker(
      { ip: '127.0.0.1', headers: { authorization: 'Bearer valid-token' } },
      contextFor(),
    );

    expect(tracker).toBe('ip:127.0.0.1');
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('uses the JWT subject only on explicitly marked routes', async () => {
    verifyAsync.mockResolvedValue({ sub: '42' });
    const guard = new TestGuard(options, storage, reflector, jwtService);

    await expect(
      guard.resolveTracker(
        { ip: '127.0.0.1', headers: { authorization: 'Bearer valid-token' } },
        contextFor('user-or-ip'),
      ),
    ).resolves.toBe('user:42');
  });

  it.each([undefined, 'Basic value', 'Bearer invalid-token'])(
    'falls back to IP for missing or invalid authorization %s',
    async (authorization) => {
      verifyAsync.mockRejectedValue(new Error('invalid'));
      const guard = new TestGuard(options, storage, reflector, jwtService);

      await expect(
        guard.resolveTracker(
          { ip: '10.0.0.5', headers: { authorization } },
          contextFor('user-or-ip'),
        ),
      ).resolves.toBe('ip:10.0.0.5');
    },
  );

  it('throws the stable structured 429 response', async () => {
    const guard = new TestGuard(options, storage, reflector, jwtService);
    const detail = {
      limit: 1,
      ttl: 60_000,
      key: 'key',
      tracker: 'ip:127.0.0.1',
      totalHits: 2,
      timeToExpire: 60_000,
      isBlocked: true,
      timeToBlockExpire: 60_000,
    };

    await expect(guard.reject(contextFor(), detail)).rejects.toMatchObject({
      status: 429,
      response: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: '请求过于频繁，请稍后再试',
      },
    });
  });
});
