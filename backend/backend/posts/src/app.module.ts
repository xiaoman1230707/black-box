import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { PrismaModule} from './prisma/prisma.module'
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AIModule } from './ai/ai.module';
import { CommentsModule } from './comments/comments.module';
import { UploadModule } from './upload/upload.module';
import { GameModule } from './game/game.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { getRuntimeEnv } from './config/env';
import { createGlobalRateLimitOptions } from './security/rate-limit.config';
import { AppThrottlerGuard } from './security/app-throttler.guard';

@Module({
  // PrismaModule. 之前使用 prisma 命令行的方式，现在 client 代表数据库
  imports: [
    PostsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    AIModule,
    CommentsModule,
    UploadModule,
    GameModule,
    ThrottlerModule.forRootAsync({
      useFactory: () =>
        createGlobalRateLimitOptions(getRuntimeEnv().rateLimits),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
