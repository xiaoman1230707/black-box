import instance from './config';
import type { CommentNode } from '@/types';

// 二期评论 api(承 api/posts.ts 风格:instance 拦截器已解包 response.data)

// 评论树(两层:顶层 + replies)
export const fetchComments = (postId: number | string): Promise<{ items: CommentNode[] }> => {
    return instance.get(`/posts/${postId}/comments`);
};

// 发评论 / 回复(需登录)。parentId 指向回复时,后端会规整到所属顶层
export const createComment = (
    postId: number | string,
    data: { content: string; parentId?: number },
): Promise<CommentNode> => {
    return instance.post(`/posts/${postId}/comments`, data);
};

// 删自己的评论
export const deleteComment = (id: number): Promise<{ success: boolean }> => {
    return instance.delete(`/comments/${id}`);
};
