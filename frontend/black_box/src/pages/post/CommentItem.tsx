import { CornerDownRight, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { CommentNode } from '@/types';

interface CommentItemProps {
  comment: CommentNode;
  isReply?: boolean;
  topId: number;
  currentUserId?: number;
  onReply: (topId: number, atName: string, isReply: boolean) => void;
  onDelete: (commentId: number, trigger: HTMLButtonElement) => void;
}

export default function CommentItem({
  comment,
  isReply = false,
  topId,
  currentUserId,
  onReply,
  onDelete,
}: CommentItemProps) {
  return (
    <article
      className="flex min-w-0 gap-3"
      data-testid={isReply ? 'comment-reply' : 'comment-item'}
    >
      <Avatar size="sm" cv={isReply ? 3 : 1}>
        {comment.user.avatar ? <AvatarImage src={comment.user.avatar} alt="" /> : null}
        <AvatarFallback>{comment.user.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="truncate text-sm font-extrabold text-foreground">{comment.user.name}</p>
          {currentUserId === comment.user.id ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(event) => onDelete(comment.id, event.currentTarget)}
              aria-label="删除评论"
              title="删除评论"
              data-testid="delete-comment"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-relaxed text-foreground-2">
          {comment.content}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="default"
          className="mt-1 px-2 text-xs text-muted-foreground"
          onClick={() => onReply(topId, comment.user.name, isReply)}
          data-testid="reply-button"
        >
          <CornerDownRight aria-hidden="true" />
          回复
        </Button>
      </div>
    </article>
  );
}
