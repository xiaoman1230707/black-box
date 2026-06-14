import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
// 设计模式 解决的是 面向对象企业级别开发中常见的问题
// 是经验的总结 
// 23 种 单例模式 工厂模式 装饰器模式(为类快速添加一些属性方法) 
// 观察者模式(IntersectionObserver) 代理模式(Proxy 响应式业务的底层) 
// 订阅发布者模式 (addEventListener) 
@Module({
    imports:[JwtModule.register({
        secret: process.env.TOKEN_SECRET
    })],
    controllers:[AuthController],
    providers: [AuthService,JwtStrategy,JwtAuthGuard],
    exports: [JwtAuthGuard]
})
export class AuthModule {}