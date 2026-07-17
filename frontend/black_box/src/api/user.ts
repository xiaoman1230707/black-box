import instance from './config';
import type { Credentail } from '@/types';
import type { User } from '@/types';

export const doLogin = (data: Credentail):Promise<{access_token:string,refresh_token:string,user:User}> => {
  return instance.post('/auth/login', data);
}

// 二期注册(公开)。成功返回 { id, name };密码弱(<8 或缺字母/数字)由后端 DTO 拒为 400
export const doRegister = (data: Credentail):Promise<{id:number,name:string}> => {
  return instance.post('/users/register', data);
}