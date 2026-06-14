import instance from './config';
import type { Post } from '@/types';

interface PostsResponse {
  items: Post[];
  total: number;
  // 其他字段如 total, page 等按需添加
}

export const fetchPosts = async (page:number =  1,limit:number = 10, tag?:string):Promise<PostsResponse>=>{
    try{
        return await instance.get('/posts',{
            params:{
                page,
                limit,
                ...(tag && tag !== 'all' ? { tag } : {}),
            }
        })
    }catch(err){
        console.log(err)
        return {
            items:[],
            total:0,
        };
    }
}

export const fetchTags = async ()=>{
    try{
        return await instance.get('/posts/tags')
    }catch(err){
        console.error('Failed to fetch tags:', err);
        return [];
    }
}
// 发表文章
export const createPosts = async ()=>{
    try{
    return await instance.post('/posts',{
        title:'测试标题',
        content:'测试内容',
    })
    }catch(err){
        // console.log(err);
    }
}

// 获取单篇文章详情
export const fetchPostById = async (id: number | string) => {
    try {
        return await instance.get(`/posts/${id}`)
    } catch (err) {
        console.log(err)
        return null
    }
}