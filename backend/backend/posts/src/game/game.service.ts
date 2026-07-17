import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 二期游戏模块:发帖选游戏用(GET /api/games)。
@Injectable()
export class GameService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.game.findMany({
            orderBy: { id: 'asc' },
            select: { id: true, name: true, cover: true, description: true },
        });
    }
}
