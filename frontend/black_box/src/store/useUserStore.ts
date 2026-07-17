// localstorage 
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  doLogin
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
  setAvatar: (url: string) => void;
}

type LegacyUser = Omit<User, 'id'> & { id: number | string };

const normalizeUser = (user: LegacyUser | null | undefined): User | null => {
  if (!user) return null;
  const id = Number(user.id);
  return Number.isSafeInteger(id) && id > 0 ? { ...user, id } : null;
};

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
        user: normalizeUser(data.user),
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
    // 二期:头像上传成功后更新 user.avatar(persist 自动持久化),头像即时刷新
    setAvatar:(url)=>{
      set({
        user: get().user ? { ...get().user!, avatar: url } : null
      })
    }
  }), {
    name: 'user-store',
    partialize: (state) => ({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user,
      isLogin: state.isLogin
    }),
    merge: (persistedState, currentState) => {
      const persisted = persistedState as Partial<UserState> & {
        user?: LegacyUser | null;
      };
      const user = normalizeUser(persisted.user);
      return {
        ...currentState,
        ...persisted,
        user,
        isLogin: persisted.isLogin === true && user !== null,
      };
    },
  })
)
