import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerRequest,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import {
  RATE_LIMIT_IDENTITY,
  type RateLimitIdentity,
} from './rate-limit-identity.decorator';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    return super.handleRequest({
      ...requestProps,
      getTracker: (request, context) =>
        this.resolveRateLimitTracker(request, context),
    });
  }

  protected async resolveRateLimitTracker(
    request: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<string> {
    const identity = this.reflector.getAllAndOverride<RateLimitIdentity>(
      RATE_LIMIT_IDENTITY,
      [context.getHandler(), context.getClass()],
    );
    const ip = typeof request.ip === 'string' ? request.ip : 'unknown';
    const ipTracker = `ip:${ip}`;
    if (identity !== 'user-or-ip') return ipTracker;

    const headers = request.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    const authorization = headers?.authorization;
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const match = header?.match(/^Bearer\s+(.+)$/i);
    if (!match) return ipTracker;

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(
        match[1],
      );
      if (typeof payload.sub === 'string' || typeof payload.sub === 'number') {
        return `user:${payload.sub}`;
      }
    } catch {
      return ipTracker;
    }
    return ipTracker;
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    void context;
    void detail;
    return Promise.reject(
      new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          message: '请求过于频繁，请稍后再试',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  }
}
