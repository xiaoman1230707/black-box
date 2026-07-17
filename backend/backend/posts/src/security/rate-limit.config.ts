import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { getRuntimeEnv, type RuntimeEnv } from '../config/env';

type RateLimits = RuntimeEnv['rateLimits'];
type RouteRateLimit = Exclude<keyof RateLimits, 'global'>;

const createGlobalRateLimitOptions = (
  rateLimits: RateLimits,
): ThrottlerModuleOptions => ({
  throttlers: [{ name: 'default', ...rateLimits.global }],
});

const createRouteThrottle = (rateLimits: RateLimits, name: RouteRateLimit) => ({
  default: { ...rateLimits[name] },
});

const runtimeRouteThrottle = (name: RouteRateLimit) =>
  createRouteThrottle(getRuntimeEnv().rateLimits, name);

export {
  createGlobalRateLimitOptions,
  createRouteThrottle,
  runtimeRouteThrottle,
  type RouteRateLimit,
};
