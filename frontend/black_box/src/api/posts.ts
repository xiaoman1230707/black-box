import instance from './config';
import type { Post } from '@/types';

interface PostsResponse {
  items: Post[];
  total: number;
  // 其他字段如 total, page 等按需添加
}

export const fetchPosts = async (page:number =  1,limit:number = 10, tag?:string, gameId?:number):Promise<PostsResponse>=>{
    try{
        return await instance.get('/posts',{
            params:{
                page,
                limit,
                ...(tag && tag !== 'all' ? { tag } : {}),
                ...(gameId ? { gameId } : {}),   // 三期§六:按游戏筛选(与 tag AND 叠加)
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

export const fetchTags = async ():Promise<{ id:number; name:string }[]>=>{
    try{
        return await instance.get('/posts/tags')
    }catch(err){
        console.error('Failed to fetch tags:', err);
        return [];
    }
}
// 发表文章(二期:收真实参数 → POST /posts 扩展)。gameId/tagIds/fileIds 可选,省略则不关联
export const createPost = async (data: {
    title: string;
    content: string;
    gameId?: number;
    tagIds?: number[];
    fileIds?: number[];
}): Promise<{ id: number }> => {
    return await instance.post('/posts', data);
}

// 获取单篇文章详情
export const fetchPostById = async (id: number | string): Promise<Post | null> => {
    try {
        return await instance.get(`/posts/${id}`)
    } catch (err) {
        console.log(err)
        return null
    }
}