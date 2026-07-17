import instance from './config';

// 二期点赞 api(承 api/posts.ts 风格)。likedByMe 随 GET /posts/:id 返回,这里只管写
export const likePost = (id: number | string): Promise<{ liked: boolean; totalLikes: number }> => {
    return instance.post(`/posts/${id}/like`);
};

export const unlikePost = (id: number | string): Promise<{ liked: boolean; totalLikes: number }> => {
    return instance.delete(`/posts/${id}/like`);
};
