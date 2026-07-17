import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, Send, Share2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '@/components/Loading';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PageState from '@/components/PageState';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { StatButton } from '@/components/ui/stat-button';
import { Textarea } from '@/components/ui/textarea';
import { fetchComments, createComment, deleteComment } from '@/api/comments';
import { likePost, unlikePost } from '@/api/likes';
import { fetchPostById } from '@/api/posts';
import { getContentTypeVariant } from '@/lib/content-type';
import { getApiErrorMessage } from '@/lib/api-error';
import { feedback } from '@/lib/feedback';
import { useHomeStore } from '@/store/useHomeStore';
import { useUserStore } from '@/store/useUserStore';
import type { CommentNode, Post } from '@/types';
import CommentItem from './CommentItem';
import { removeCommentNode } from './comment-tree';

const countTree = (items: CommentNode[]) =>
  items.reduce((total, comment) => total + 1 + comment.replies.length, 0);

const formatPublishedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLogin, user } = useUserStore();
  const patchPost = useHomeStore((state) => state.patchPost);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ topId: number; atName: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null);
  const commentsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const commentCount = countTree(comments);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchPostById(id);
      if (data) {
        setPost(data);
        setLiked(Boolean(data.likedByMe));
        setTotalLikes(data.totalLikes || 0);
        setImageFailed(false);
      }
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async (showLoading = false): Promise<CommentNode[] | null> => {
    if (!id) return null;
    if (showLoading) setCommentsLoading(true);
    setCommentsError('');
    try {
      const response = await fetchComments(id);
      const items = response.items || [];
      setComments(items);
      return items;
    } catch (error) {
      console.error('Failed to load comments:', error);
      setCommentsError(getApiErrorMessage(error, '评论加载失败，请重试'));
      return null;
    } finally {
      if (showLoading) setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPost();
    void loadComments(true);
  }, [loadComments, loadPost]);

  const handleLike = async () => {
    if (!isLogin) {
      navigate('/login');
      return;
    }
    if (liking || !id) return;

    const nextLiked = !liked;
    setLiking(true);
    setLiked(nextLiked);
    setTotalLikes((current) => current + (nextLiked ? 1 : -1));
    try {
      const response = nextLiked ? await likePost(id) : await unlikePost(id);
      setLiked(response.liked);
      setTotalLikes(response.totalLikes);
      patchPost(Number(id), { likedByMe: response.liked, totalLikes: response.totalLikes });
    } catch (error) {
      setLiked(!nextLiked);
      setTotalLikes((current) => current + (nextLiked ? -1 : 1));
      feedback.error(getApiErrorMessage(error, '操作失败，请重试'), {
        id: `post-like-${id}`,
      });
    } finally {
      setLiking(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: post?.title || '游戏论坛',
        text: post?.brief,
        url: window.location.href,
      });
      return;
    }
    void navigator.clipboard.writeText(window.location.href);
  };

  const handleReply = (topId: number, atName: string, isReply: boolean) => {
    setReplyTo({ topId, atName });
    setCommentText(isReply ? `@${atName} ` : '');
  };

  const handleSubmitComment = async () => {
    if (!isLogin) {
      navigate('/login');
      return;
    }
    if (!id || commentSubmitting) return;
    const content = commentText.trim();
    if (!content) return;

    setCommentSubmitting(true);
    try {
      await createComment(id, replyTo ? { content, parentId: replyTo.topId } : { content });
      setCommentText('');
      setReplyTo(null);
      const items = await loadComments();
      if (items) patchPost(Number(id), { totalComments: countTree(items) });
    } catch (error) {
      console.error('Failed to submit comment:', error);
      feedback.error(getApiErrorMessage(error, '评论发布失败，请重试'), {
        id: 'comment-submit',
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const requestDeleteComment = (commentId: number, trigger: HTMLButtonElement) => {
    deleteTriggerRef.current = trigger;
    setPendingDeleteId(commentId);
  };

  const handleDeleteComment = async () => {
    if (pendingDeleteId === null || deletingComment) return;
    const commentId = pendingDeleteId;
    setDeletingComment(true);
    let failed = false;
    try {
      await deleteComment(commentId);
      const localItems = removeCommentNode(comments, commentId);
      setComments(localItems);
      patchPost(Number(id), { totalComments: countTree(localItems) });

      const items = await loadComments();
      if (items) patchPost(Number(id), { totalComments: countTree(items) });
      feedback.success('评论已删除', { id: 'comment-delete' });
      setPendingDeleteId(null);
    } catch (error) {
      failed = true;
      console.error('Failed to delete comment:', error);
      feedback.error(getApiErrorMessage(error, '评论删除失败，请重试'), {
        id: 'comment-delete',
      });
    } finally {
      setDeletingComment(false);
      if (failed) {
        requestAnimationFrame(() => deleteCancelRef.current?.focus());
      }
    }
  };

  if (loading) return <Loading />;

  if (!post) {
    return (
      <div className="py-8" data-slot="post-state" data-state="empty">
        <PageState
          state="empty"
          title="帖子不可用或不存在"
          description="当前数据源无法区分网络失败与帖子不存在，可以重试或返回上一页。"
          action={(
            <>
              <Button type="button" variant="primary" onClick={() => void loadPost()}>
                重试
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft aria-hidden="true" />
                返回
              </Button>
            </>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-4xl" data-testid="post-detail-page">
      <header className="flex items-center justify-between gap-4 border-b-2 border-ink py-4">
        <Button type="button" variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="返回上一页" title="返回">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <p className="truncate font-heading text-lg font-black text-foreground">帖子详情</p>
        <Button type="button" variant="outline" size="icon" onClick={handleShare} aria-label="分享帖子" title="分享">
          <Share2 aria-hidden="true" />
        </Button>
      </header>

      <main className="space-y-8 pt-6 pb-36 max-[760px]:pb-[calc(10rem+var(--bottombar-h)+env(safe-area-inset-bottom))]">
        <article className="space-y-6">
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Pill key={tag} variant={getContentTypeVariant(tag)}>
                  {tag}
                </Pill>
              ))}
            </div>
          ) : null}

          <h1 className="break-words font-heading text-2xl leading-heading font-black text-foreground sm:text-3xl lg:text-4xl">
            {post.title}
          </h1>

          <div className="flex min-w-0 items-center gap-3 border-y-2 border-border py-4">
            <Avatar size="md" cv={1}>
              {post.user.avatar ? <AvatarImage src={post.user.avatar} alt="" /> : null}
              <AvatarFallback>{post.user.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-foreground">{post.user.name}</p>
              {post.publishedAt ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  <span>发布于 {formatPublishedAt(post.publishedAt)}</span>
                </p>
              ) : null}
            </div>
          </div>

          {post.thumbnail ? (
            <div className="aspect-video overflow-hidden rounded-md border-2 border-ink bg-muted shadow-md">
              {!imageFailed ? (
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="grid h-full place-items-center bg-[image:var(--gradient-cv-2)] px-5 text-center font-heading text-xl font-black text-primary-foreground">
                  图片暂时无法显示
                </div>
              )}
            </div>
          ) : null}

          <div
            className="min-w-0 text-base text-foreground-2"
            data-slot="post-body"
          >
            <MarkdownRenderer
              content={post.content ?? post.brief}
              empty={(
                <PageState
                  state="empty"
                  title="正文暂时为空"
                  compact
                />
              )}
            />
          </div>
        </article>

        <section className="flex flex-wrap items-center gap-2 border-y-2 border-ink py-3" aria-label="帖子统计">
          <div data-testid="like-count">
            <StatButton
              variant="like"
              count={totalLikes}
              active={liked}
              busy={liking}
              onClick={handleLike}
              data-testid="like-button"
            />
          </div>
          <StatButton variant="comment" count={commentCount} />
          <StatButton variant="view" count={post.viewCount ?? 0} />
        </section>

        <section className="space-y-5" aria-labelledby="comments-heading">
          <div className="flex items-center justify-between border-b-2 border-ink pb-3">
            <h2
              id="comments-heading"
              ref={commentsHeadingRef}
              tabIndex={-1}
              className="font-heading text-xl font-black text-foreground outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              评论 ({commentCount})
            </h2>
          </div>

          {commentsError ? (
            <PageState
              state="error"
              title="评论加载失败"
              description={commentsError}
              compact
              action={(
                <Button type="button" variant="outline" size="sm" onClick={() => void loadComments(true)}>
                  重试
                </Button>
              )}
            />
          ) : null}

          {commentsLoading && comments.length === 0 ? (
            <PageState state="loading" title="正在加载评论" compact />
          ) : !commentsError && comments.length === 0 ? (
            <PageState state="empty" title="还没有评论，来抢沙发吧" compact />
          ) : null}

          {comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-3 border-b-2 border-border pb-5 last:border-0">
                  <CommentItem
                    comment={comment}
                    topId={comment.id}
                    currentUserId={isLogin ? user?.id : undefined}
                    onReply={handleReply}
                    onDelete={requestDeleteComment}
                  />
                  {comment.replies.length > 0 ? (
                    <div className="ml-6 space-y-3 border-l-2 border-border pl-3 sm:ml-11 sm:pl-4">
                      {comment.replies.map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          isReply
                          topId={comment.id}
                          currentUserId={isLogin ? user?.id : undefined}
                          onReply={handleReply}
                          onDelete={requestDeleteComment}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <div
        className="fixed right-0 bottom-0 left-[var(--sidebar-w)] z-30 border-t-2 border-ink bg-background/95 p-3 backdrop-blur-md max-[760px]:bottom-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))] max-[760px]:left-0"
        data-slot="comment-composer"
      >
        <div className="mx-auto max-w-4xl">
          {isLogin ? (
            <>
              {replyTo ? (
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                  <span className="truncate">回复 @{replyTo.atName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyTo(null);
                      setCommentText('');
                    }}
                    aria-label="取消回复"
                  >
                    <X aria-hidden="true" />
                    取消
                  </Button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <Textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={replyTo ? `回复 @${replyTo.atName}...` : '写下你的评论...'}
                  className="h-11 min-h-11 resize-none py-2.5"
                  rows={1}
                  data-testid="comment-input"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="icon"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || commentSubmitting}
                  busy={commentSubmitting}
                  data-testid="comment-submit"
                  aria-label="发表评论"
                  title="发表评论"
                >
                  <Send aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
              data-testid="login-to-comment"
            >
              登录后参与评论
            </Button>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingComment) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent
          initialFocus={deleteCancelRef}
          finalFocus={() =>
            deleteTriggerRef.current?.isConnected
              ? deleteTriggerRef.current
              : commentsHeadingRef.current
          }
        >
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条评论？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复；若删除的是顶层评论，其回复也会一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={deleteCancelRef} disabled={deletingComment}>
              取消
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              busy={deletingComment}
              onClick={() => void handleDeleteComment()}
            >
              确认删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
