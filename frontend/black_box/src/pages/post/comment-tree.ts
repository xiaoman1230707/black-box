import type { CommentNode } from '@/types';

export const removeCommentNode = (
  comments: CommentNode[],
  commentId: number,
): CommentNode[] => comments
  .filter((comment) => comment.id !== commentId)
  .map((comment) => ({
    ...comment,
    replies: removeCommentNode(comment.replies, commentId),
  }));
