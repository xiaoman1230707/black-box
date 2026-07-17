import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { validateEnvironment } from '../config/env';

// 二期 games 最小 seed(E1):使发帖能选游戏。可重复执行(upsert by name unique)。
// 与四期演示 seed(丰富数据 + 真实封面)分开;本脚本只灌最小量 + 一句描述,cover 留空。
// 运行:npx ts-node src/scripts/seed-games.ts
const prisma = new PrismaClient();
validateEnvironment('database');

const GAMES = [
    { name: '黑神话:悟空', description: '国产 3A 动作角色扮演,取材西游' },
    { name: '原神', description: '开放世界冒险 RPG' },
    { name: '艾尔登法环', description: '魂系开放世界动作 RPG' },
    { name: '塞尔达传说:王国之泪', description: '开放世界冒险解谜' },
    { name: '赛博朋克2077', description: '未来都市开放世界 RPG' },
];

async function main() {
    for (const g of GAMES) {
        await prisma.game.upsert({
            where: { name: g.name },
            update: { description: g.description }, // 重复执行更新描述,cover 不动(留 null)
            create: { name: g.name, description: g.description },
        });
    }
    const all = await prisma.game.findMany({ select: { id: true, name: true } });
    console.log('games seeded:', all);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
