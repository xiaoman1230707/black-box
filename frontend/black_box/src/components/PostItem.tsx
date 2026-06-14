import * as React from 'react';
import { useNavigate } from 'react-router-dom'
import type { Post } from '@/types/index'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle, Eye } from "lucide-react";
import LazyLoad from 'react-lazy-load';
import { cn } from '@/lib/utils'

interface PostItemProps {
  post: Post;
  className?: string;
}

const PostItem: React.FC<PostItemProps> = ({ post, className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/post/${post.id}`);
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        "group relative bg-card rounded-2xl p-4 cursor-pointer",
        "border border-border/50 shadow-sm",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 ease-out",
        "active:scale-[0.99]",
        className
      )}
    >
      <div className="flex gap-4">
        {/* 内容区 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 标签 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-primary/10 text-primary border-0 text-xs font-medium
                    hover:bg-primary/20 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border-0 text-xs"
                >
                  +{post.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 标题 */}
          <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-2
            group-hover:text-primary transition-colors duration-200">
            {post.title}
          </h3>

          {/* 摘要 */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {post.brief}
          </p>

          {/* 底部信息 */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
            {/* 作者信息 */}
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 ring-2 ring-background">
                <AvatarImage src={post.user.avatar} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {post.user.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {post.user.name}
              </span>
            </div>

            {/* 互动数据 */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {post.totalLikes !== undefined && (
                <span className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Heart className="w-3.5 h-3.5" />
                  {post.totalLikes}
                </span>
              )}
              {post.totalComments !== undefined && (
                <span className="flex items-center gap-1 hover:text-primary transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.totalComments}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {Math.floor(Math.random() * 1000) + 100}
              </span>
            </div>
          </div>
        </div>

        {/* 缩略图 */}
        {post.thumbnail && (
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
            <LazyLoad className="w-full h-full">
              <img
                loading="lazy"
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </LazyLoad>
          </div>
        )}
      </div>
    </article>
  );
};

export default PostItem;
