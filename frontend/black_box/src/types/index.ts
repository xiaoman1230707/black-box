export interface User{
    id:number;
    name:string;
    avatar?:string;
}

export interface Post{
    id:number;
    title:string;
    brief:string;// 简介
    content?:string;// 详情正文(findOne 返回)
    publishedAt:string;// 发布时间
    totalLikes?:number;// 点赞数
    totalComments?:number;// 评论数
    viewCount?:number;// 浏览量(二期:读真实值,不自增)
    likedByMe?:boolean;// 当前用户是否已赞(二期)
    tags:string[];// 标签
    thumbnail?:string;// 缩略图
    pics?:string[];// 图片
    user:User;
}

// 二期评论节点(两层树:顶层含 replies,回复项 replies 恒为空)
export interface CommentNode{
    id:number;
    content:string;
    user:{ id:number; name:string; avatar:string };
    replies:CommentNode[];
}
// 游戏(发帖选游戏用,GET /games)
export interface Game{
    id:number;
    name:string;
    cover?:string | null;
    description?:string | null;
}

// dry 原则 dont repeat yourself
export interface Credentail {
    name:string;
    password:string;
}

export interface PostsResponse {
  items: Post[];
  total: number;
}

export type PersonalPostListKind = "published" | "liked";
