import instance from './config';

// 二期:帖子配图上传(POST /upload/image)。FormData 不手设 Content-Type,浏览器自动加 multipart boundary。
// 返回 { id(File.id), url(原图), thumbnailUrl(缩略) };token 由 axios 拦截器自动加(需登录)。
export const uploadImage = (file: File): Promise<{ id: number; url: string; thumbnailUrl: string }> => {
  const fd = new FormData();
  fd.append('file', file);
  return instance.post('/upload/image', fd);
};

// 二期:头像上传(POST /upload/avatar)。后端替换语义(删旧建新),返回 { id, url(small 头像) }。
export const uploadAvatar = (file: File): Promise<{ id: number; url: string }> => {
  const fd = new FormData();
  fd.append('file', file);
  return instance.post('/upload/avatar', fd);
};
