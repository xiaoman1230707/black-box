import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// 将nestjs像express一样拥有一些服务
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';// 自动校验后转类型
import { join } from 'path'; // 路径拼接 node内置模块

async function bootstrap() {
  // 底座是基于express 
  const app = await NestFactory.create<NestExpressApplication>(AppModule,{
    cors:true, // 开启跨域
  });
  app.setGlobalPrefix('api');// 设置全局路由前缀 /api
  // 启用全局验证管道 ，基于express
  app.useGlobalPipes(new ValidationPipe({
    whitelist:true, // 自动过滤dot未定义的属性
    // forbidNonWhitelisted:true, // 没有得到定义的属性直接报错
    transform:true, // 自动转换类型 "1" transform 1 ，按照dto对象的类型
  }))
  // 搭建静态服务器
  app.useStaticAssets(join(process.cwd(),'uploads'),{
    prefix:'/uploads',
  })// 静态资源目录
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
