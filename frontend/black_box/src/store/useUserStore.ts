// localstorage 
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  doLogin,
  getAiAvatar
} from '@/api/user'
import type { User } from '@/types/index'
import type { Credentail } from '@/types/index';

interface UserState {
  accessToken: string;
  refreshToken: string;
  user: User | null;
  isLogin: boolean;
  login: (credentials: Credentail) => Promise<void>;
  logout: () => void;
  aiAvatar: () => Promise<void>;
}

// 高阶函数 柯里化
export const useUserStore = create<UserState>()(
  persist((set,get) => ({ // state 对象
    accessToken: "",
    refreshToken: "",
    user: null,
    isLogin: false,
    login: async ({ name, password }) => {
      const data = await doLogin({name, password});
      // console.log(res, '////');
      // const { token, user} = res.user;
      set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
        isLogin: true
      })
      // console.log(data, '////');
    },
    logout:()=>{
      set({
        user:null,
        accessToken:"",
        refreshToken:"",
        isLogin:false,
      })
    },
    aiAvatar:async ()=>{
      // coze title desc 生成应用的logo
      const name = get().user?.name;
      const avatar = await getAiAvatar(name || '');
      set({
        user: get().user ? {
          ...get().user!,
          avatar
        } : null
      })
    }
  }), {
    name: 'user-store',
    partialize: (state) => ({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user,
      isLogin: state.isLogin
    })
  })
)