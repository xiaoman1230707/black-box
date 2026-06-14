import { useUserStore } from '@/store/useUserStore'
import axios from 'axios';
// 接口地址都以/api开头 
// axios.defaults.baseURL = 'http://localhost:5173/api'
// axios.defaults.baseURL = 'http://localhost:3000/api'
const instance = axios.create({
  // baseURL: 'http://localhost:5173/api',
  baseURL: 'http://localhost:3000/api',
})
// 拦截器 interceptors
// axios api 请求大管家 关于请求的椅子都会给我们
// data 只是其中一项

// useUserStore()  是 Zustand 提供的React 自定义钩子，
// 而钩子有严格的使用规则：只能在 React 组件/自定义钩子的顶层执行，
// 不能在普通函数、if/for、异步代码里用。

// 成功的响应和失败的响应
instance.interceptors.request.use(config => {
  const token = useUserStore.getState().accessToken;
  // console.log(token,'//////')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // console.log(config); //请求的配置项
  // if(token){
  // }
  return config;
})

// 标记是否正在刷新token
let isRefreshing = false;
// 请求队列，用来存储等待刷新token时 并发的请求
// 等到刷新token成功后，再带上新的token依次执行这些请求
let requestsQueue: any[] = [];
instance.interceptors.response.use(res => {
  // console.log('111');
  // if (res.status != 200) {
  //   console.error('网络错误', res);
  //   return Promise.reject(res);
  // }
  return res.data;
},
  async err => {
    // console.error('错误', err);
    // 可处理 刷新token
    const { config, response } = err;
    // console.log(config,response);
    // retry 用来标记时候是重复的请求，避免死循环
    if (response.status == 401 && !config._retry) {
      // 即使 A 请求设置了 A.config._retry = true，
      // B 和 C 请求仍然会各自有自己的 config 对象，它们的 _retry 还是 undefined，所以也会进来。
      if (isRefreshing) {
        // 异步的，未来的token refresh后再来resolve
        return new Promise(resolve => {
          // 如果正在刷新token，将当前请求加入队列
          requestsQueue.push((token: string) => {
            // 找到当前请求的config对象，修改headers 闭包
            config.headers.Authorization = `Bearer ${token}`
            resolve(instance(config));
          });
        });
      }
      config._retry = true;// 刷新开关
      isRefreshing = true;
      try {
        const refreshToken = useUserStore.getState().refreshToken;
        if (refreshToken) {
          // 无感刷新token
          const { access_token, refresh_token }:{
                access_token: string;
                refresh_token: string;
              } = await instance.post('/auth/refresh', {
            refresh_token: refreshToken
          })
          useUserStore.setState({
            accessToken: access_token,
            refreshToken: refresh_token,
            isLogin: true,
          })
          // 刷新token成功后，执行队列中的请求
          requestsQueue.forEach(callback => callback(access_token));
          requestsQueue = [];
          // 修改请求头中的新token，重新发起请求
          config.headers.Authorization = `Bearer ${access_token}`
          return instance(config);
        }else{
          useUserStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(err);
        }
      } catch (e) {
        useUserStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(e);
      }
      finally{
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  })

export default instance 