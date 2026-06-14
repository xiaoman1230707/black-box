import { Injectable } from "@nestjs/common";
// 定义和集成 passport 身份验证策略的基类 定规则
import { PassportStrategy } from "@nestjs/passport";
// 身份验证策略选择jwt
import { Strategy, ExtractJwt } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(){
        // 手动配置自己 自动化的 提取token 验证token 功能
        super({
            // token 在哪里 Bearer 前缀 Authorization 请求头
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
            
            // 不是直接调用 PassportStartegy(Strategy)  封装了
            secretOrKey: process.env.TOKEN_SECRET || "",
        })
    }
    // 默认调用验证 返回 JWT 用户对象
    // 需要重写
    async validate(payload){
        // console.log(payload)
        // 交给req，方法可以直接从中调用
        return {
            id:payload.sub,
            name:payload.name,
        } 
    }
}