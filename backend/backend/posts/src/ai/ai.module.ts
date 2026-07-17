import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, EmbeddingModule, AuthModule],
    controllers: [AIController],
    providers: [AIService],
})
export class AIModule {}