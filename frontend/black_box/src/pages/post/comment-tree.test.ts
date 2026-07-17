import { describe, expect, it } from 'vitest';

import { removeCommentNode } from './comment-tree';
import type { CommentNode } from '@/types';

const makeComment = (id: number, replies: CommentNode[] = []): CommentNode => ({
  id,
  content: `comment-${id}`,
  user: { id, name: `user-${id}`, avatar: '' },
  replies,
});

describe('removeCommentNode', () => {
  it('删除顶层评论时一并移除它的回复', () => {
    const comments = [makeComment(1, [makeComment(2)]), makeComment(3)];

    expect(removeCommentNode(comments, 1)).toEqual([makeComment(3)]);
  });

  it('删除回复时保留所属顶层评论和其他回复', () => {
    const comments = [makeComment(1, [makeComment(2), makeComment(3)])];

    expect(removeCommentNode(comments, 2)).toEqual([
      makeComment(1, [makeComment(3)]),
    ]);
  });
});
