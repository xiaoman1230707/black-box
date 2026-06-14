export interface User{
    id:number;
    name:string;
    avatar?:string;
}

export interface Post{
    id:number;
    title:string;
    brief:string;// 简介
    publishedAt:string;// 发布时间
    totalLikes?:number;// 点赞数
    totalComments?:number;// 评论数
    tags:string[];// 标签
    thumbnail?:string;// 缩略图
    pics?:string[];// 图片
    user:User;
}
// dry 原则 dont repeat yourself
export interface Credentail {
    name:string;
    password:string;
}

export interface PostsResponse {
  items: Post[];
  // 其他字段如 total, page 等按需添加
}