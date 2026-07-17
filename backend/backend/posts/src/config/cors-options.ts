import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const createCorsOptions = (frontendOrigin: string): CorsOptions => ({
  origin: (requestOrigin, callback) =>
    callback(null, !requestOrigin || requestOrigin === frontendOrigin),
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
});

export { createCorsOptions };
