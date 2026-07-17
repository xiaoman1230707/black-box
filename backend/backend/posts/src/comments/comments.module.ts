import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

// 二期评论模块。PrismaService 全局可用(PrismaModule @Global),无需在此 import。
@Module({
    controllers: [CommentsController],
    providers: [CommentsService],
})
export class CommentsModule {}
