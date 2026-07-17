import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

// 二期上传模块。PrismaService 全局可用(PrismaModule @Global),无需在此 import。
@Module({
    controllers: [UploadController],
    providers: [UploadService],
})
export class UploadModule {}
