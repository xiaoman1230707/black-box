import './config/load-env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { createCorsOptions } from './config/cors-options';
import { resolveExpressTrustProxy, validateEnvironment } from './config/env';

async function bootstrap() {
  const env = validateEnvironment('runtime');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors(createCorsOptions(env.frontendOrigin));
  const trustProxy = resolveExpressTrustProxy(env.trustProxy);
  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(env.port);
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
