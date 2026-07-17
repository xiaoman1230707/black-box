import { Controller, Get } from '@nestjs/common';
import { GameService } from './game.service';

// GET /api/games —— 公开,发帖选游戏用
@Controller('games')
export class GameController {
    constructor(private readonly gameService: GameService) {}

    @Get()
    async getGames() {
        return this.gameService.findAll();
    }
}
