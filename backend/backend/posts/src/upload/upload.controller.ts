import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
// 直接复用守卫类(JwtStrategy 已全局注册,与现状一致,无需 imports:[AuthModule])
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { runtimeRouteThrottle } from '../security/rate-limit.config';
import { UseRateLimitIdentity } from '../security/rate-limit-identity.decorator';

// 二期上传接口。FileInterceptor 不传 storage 时 multer 默认 memoryStorage,file.buffer 可用(§五)。
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    // 头像上传(需登录)
    @Post('avatar')
  @Throttle(runtimeRouteThrottle('upload'))
  @UseRateLimitIdentity('user-or-ip')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
        return this.uploadService.uploadAvatar(file, req.user.id);
    }

    // 帖子图上传(需登录)
    @Post('image')
  @Throttle(runtimeRouteThrottle('upload'))
  @UseRateLimitIdentity('user-or-ip')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req) {
        return this.uploadService.uploadImage(file, req.user.id);
    }
}
