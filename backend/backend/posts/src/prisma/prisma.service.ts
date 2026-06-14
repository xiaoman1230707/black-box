import { Injectable, OnModuleInit} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable() // 告诉 NestJS 这个类（PrismaService）可以被“注入”到其他地方使用
export class PrismaService extends PrismaClient implements OnModuleInit{
// PrismaClient 是 Prisma 自动生成的、类型安全的数据库查询客户端，让你用 JavaScript/
// TypeScript 以面向对象的方式操作数据库。
    async onModuleInit(){ // 模块初始化时调用 连接数据库
        await this.$connect();// 自动连接数据库
    }
}