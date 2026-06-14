import instance from './config';
import type { Credentail } from '@/types';
import type { User } from '@/types';

export const doLogin = (data: Credentail):Promise<{access_token:string,refresh_token:string,user:User}> => {
  return instance.post('/auth/login', data);
}

export const getAiAvatar = (name:string):Promise<string> =>{
    return instance.get(`/ai/avatar?name=${name}`);
}