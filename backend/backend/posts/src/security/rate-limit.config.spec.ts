import {
  createGlobalRateLimitOptions,
  createRouteThrottle,
} from './rate-limit.config';

const rateLimits = {
  global: { limit: 60, ttl: 60_000 },
  login: { limit: 10, ttl: 60_000 },
  register: { limit: 5, ttl: 600_000 },
  aiChat: { limit: 10, ttl: 60_000 },
  aiSearch: { limit: 30, ttl: 60_000 },
  upload: { limit: 20, ttl: 600_000 },
};

describe('rate limit config', () => {
  it('maps the global runtime limit to Throttler v6 options', () => {
    expect(createGlobalRateLimitOptions(rateLimits)).toEqual({
      throttlers: [{ name: 'default', limit: 60, ttl: 60_000 }],
    });
  });

  it.each(['login', 'register', 'aiChat', 'aiSearch', 'upload'] as const)(
    'maps %s to an object-style route throttle',
    (name) => {
      expect(createRouteThrottle(rateLimits, name)).toEqual({
        default: rateLimits[name],
      });
    },
  );
});
