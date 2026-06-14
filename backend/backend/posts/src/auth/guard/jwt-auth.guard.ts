import{ 
    Injectable
} from '@nestjs/common';
// nestjs 默认提供的guard 自动解析 req header Authorization: Bearer access_token中取得
import { AuthGuard } from '@nestjs/passport';
// req header Authorization: Bearer access_token中取得
// 关注的是acess_token
// nest/jwt verify
// 像service 依赖注入
// 继承AuthGuard 基类(父类)
@Injectable()
export class JwtAuthGuard  extends AuthGuard('jwt'){}