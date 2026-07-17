import { useState, type FC, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyLoad from 'react-lazy-load';
import type { Post } from '@/types/index';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { StatButton } from '@/components/ui/stat-button';
import { getContentTypeVariant } from '@/lib/content-type';
import { cn } from '@/lib/utils';

interface PostItemProps {
  post: Post;
  className?: string;
  highlight?: string;
}

const COVER_CLASSES = [
  'bg-[image:var(--gradient-cv-1)]',
  'bg-[image:var(--gradient-cv-2)]',
  'bg-[image:var(--gradient-cv-3)]',
  'bg-[image:var(--gradient-cv-4)]',
  'bg-[image:var(--gradient-cv-5)]',
  'bg-[image:var(--gradient-cv-6)]',
  'bg-[image:var(--gradient-cv-7)]',
  'bg-[image:var(--gradient-cv-8)]',
] as const;

function HighlightedText({ text, query }: { text: string; query?: string }) {
  const normalized = query?.trim();
  if (!normalized) return text;

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(${escaped})`, 'gi');
  const normalizedLower = normalized.toLocaleLowerCase();

  return text.split(matcher).map((part, index) =>
    part.toLocaleLowerCase() === normalizedLower ? (
      <mark key={`${part}-${index}`} className="bg-surface-warm px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const PostItem: FC<PostItemProps> = ({ post, className, highlight }) => {
  const navigate = useNavigate();
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnailVisible = Boolean(post.thumbnail && failedThumbnail !== post.thumbnail);
  const fallbackClass = COVER_CLASSES[Math.abs(post.id) % COVER_CLASSES.length];

  const handleClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`查看帖子：${post.title}`}
      data-testid="post-item"
      className={cn(
        'group cursor-pointer rounded-md outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        className
      )}
    >
      <Card
        variant="tile"
        padding="none"
        className="h-full overflow-hidden hover:shadow-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-sm"
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <div className="flex min-w-0 flex-col">
            {post.tags?.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {post.tags.slice(0, 3).map((tag) => (
                  <Pill key={tag} variant={getContentTypeVariant(tag)}>
                    {tag}
                  </Pill>
                ))}
                {post.tags.length > 3 ? <Pill variant="soft">+{post.tags.length - 3}</Pill> : null}
              </div>
            ) : null}

            <h3 className="mb-2 line-clamp-2 break-words font-heading text-lg leading-heading font-extrabold text-foreground transition-colors duration-(--motion-fast) group-hover:text-primary motion-reduce:transition-none">
              <HighlightedText text={post.title} query={highlight} />
            </h3>

            {post.brief ? (
              <p className="mb-4 line-clamp-2 flex-1 break-words text-sm leading-snug text-foreground-2">
                <HighlightedText text={post.brief} query={highlight} />
              </p>
            ) : (
              <div className="flex-1" aria-hidden="true" />
            )}

            <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar size="sm" cv={1}>
                  {post.user.avatar ? <AvatarImage src={post.user.avatar} alt="" /> : null}
                  <AvatarFallback>{post.user.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="max-w-28 truncate text-xs font-bold text-muted-foreground">
                  {post.user.name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <StatButton variant="like" count={post.totalLikes ?? 0} className="min-h-9 px-1.5" />
                <StatButton variant="comment" count={post.totalComments ?? 0} className="min-h-9 px-1.5" />
                <StatButton variant="view" count={post.viewCount ?? 0} className="min-h-9 px-1.5" />
              </div>
            </div>
          </div>

          <div
            className={cn(
              'order-first aspect-video w-full overflow-hidden rounded-sm border-2 border-ink bg-muted sm:order-none sm:self-start',
              !thumbnailVisible && fallbackClass
            )}
            aria-hidden={!thumbnailVisible}
          >
            {thumbnailVisible ? (
              <LazyLoad className="h-full w-full">
                <img
                  loading="lazy"
                  src={post.thumbnail}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-(--motion-base) group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  onError={() => setFailedThumbnail(post.thumbnail ?? null)}
                />
              </LazyLoad>
            ) : (
              <span className="grid h-full place-items-center px-4 text-center text-sm font-extrabold text-primary-foreground">
                玩家社区
              </span>
            )}
          </div>
        </div>
      </Card>
    </article>
  );
};

export default PostItem;
