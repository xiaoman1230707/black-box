import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 可选 JWT 守卫:有有效 token → req.user={id,name};匿名/无效 token → req.user=null(不抛 401)。
// 用于 GET /posts、GET /posts/:id 这类公开读接口,登录态附加 likedByMe,匿名则 false。
// passport 在无 token 时回调 user=false,这里统一转 null,避免默认 handleRequest 抛 UnauthorizedException。
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any) {
        return user || null;
    }
}
