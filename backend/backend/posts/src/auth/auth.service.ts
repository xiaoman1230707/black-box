import { 
    Injectable ,
    UnauthorizedException,
} from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt  from "bcrypt";
// nestjs 内置了jwt模块 
// 需要手动安装，插件式，可以优化nestjs性能 
// 注入的方式 
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService) {}
    async login({name, password}: LoginDto){
        const user = await this.prisma.user.findUnique({
            where: {
                name,
            },
            include: {
                avatars: true,
            },
        })
        if(!user || !await bcrypt.compare(password, user.password) ){
            throw new UnauthorizedException('没有权限');
        }
        // 颁发token 
        // 模块化分离，专注业务 
        const tokens = await this.generateTokens(user.id.toString(),user.name);
        return {
            ...tokens,
            user:{
                id:user.id.toString(),
                name:user.name,
                avatar:`http://localhost:3000/uploads/avatar/resized/${user.avatars?.[0]?.filename}-large.jpg`,
            }
        };
    }

    async refresh(refresh_token:string){
        try{
            // verifyAsync  验证token
            const payload = await this.jwtService.verifyAsync(refresh_token,{
                secret:process.env.TOKEN_SECRET,
            });
            // console.log(payload, '////');
            return await this.generateTokens(payload.sub,payload.name);// 生成新的token
        }catch(err){
               throw new UnauthorizedException('Refresh Token 已失效，请重新登录');            
        }

    }
     // OOP private 方法 复杂度剥离 
    private async generateTokens(id:string,name:string){
            // 用户信息关键 JSON Object
            // 这个对象用于签发token，像发令枪先装填弹药(payload),生成token，要先准备用户对象一样
            const payload = {
                sub:id,// subject 主题，JWT 中规定的 关键字段
                name
            };
            const [at,rt] = await Promise.all([
                // 颁发了两个token 
                this.jwtService.signAsync(payload,{ // acess token 访问令牌
                    expiresIn:'15m',// 有效期 15分钟 更安全 可能被中间人攻击
                    secret:process.env.TOKEN_SECRET,
                }),
                // 7d 让服务器接受我们，用于刷新access token
                // 服务器再次生成两个token给我们
                // 但是普通请求token 依旧使用 15m acess token
                this.jwtService.signAsync(payload,{ // refresh token 刷新令牌
                    expiresIn:'7d',
                    secret:process.env.TOKEN_SECRET,
                }),
            ])
            return {
                access_token:at,
                refresh_token:rt,
            }
        }
}