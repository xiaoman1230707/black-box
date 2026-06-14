import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
// restful 一切皆资源
// method + URL (名词，有可读性，直指资源)
// 用户身份也是服务资源 使用post方法
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)// 自动 指定status ok 状态码为200
    async login(@Body() loginDto: LoginDto){
        return this.authService.login(loginDto);
    }

   @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refresh_token: string) {
    return this.authService.refresh(refresh_token);
  }
}