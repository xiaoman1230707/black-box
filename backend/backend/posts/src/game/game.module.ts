import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';

// 二期游戏模块。PrismaService 全局可用(PrismaModule @Global),无需在此 import。
@Module({
    controllers: [GameController],
    providers: [GameService],
})
export class GameModule {}
