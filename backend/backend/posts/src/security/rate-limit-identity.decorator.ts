import { SetMetadata } from '@nestjs/common';

const RATE_LIMIT_IDENTITY = 'rate-limit:identity';
type RateLimitIdentity = 'user-or-ip';

const UseRateLimitIdentity = (identity: RateLimitIdentity) =>
  SetMetadata(RATE_LIMIT_IDENTITY, identity);

export { RATE_LIMIT_IDENTITY, UseRateLimitIdentity, type RateLimitIdentity };
