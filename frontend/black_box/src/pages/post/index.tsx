import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchPostById } from '@/api/posts'
import type { Post } from '@/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Eye,
  Clock,
  Send
} from 'lucide-react'

// 模拟评论数据
const mockComments = [
  {
    id: 1,
    user: { name: '电竞少年', avatar: '' },
    content: '写得真好，学到了很多！',
    time: '2小时前',
    likes: 12
  },
  {
    id: 2,
    user: { name: '游戏达人', avatar: '' },
    content: '这个攻略帮大忙了，终于过关了',
    time: '5小时前',
    likes: 8
  },
  {
    id: 3,
    user: { name: '萌新玩家', avatar: '' },
    content: '请问这个阵容适合新手吗？',
    time: '1天前',
    likes: 3
  }
]

const PostDetail: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    loadPost()
  }, [id])

  const loadPost = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await fetchPostById(id)
      if (data) {
        setPost(data)
      }
    } catch (err) {
      console.error('Failed to load post:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = () => {
    setLiked(!liked)
  }

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || '游戏论坛',
        text: post?.brief,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return
    // TODO: 提交评论API
    setCommentText('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-muted-foreground mb-4">文章不存在或已被删除</div>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-orange-100/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-orange-100/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            帖子详情
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="hover:bg-orange-100/50"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <main className="pb-24">
          {/* 文章头部 */}
          <section className="px-4 py-6">
            {/* 标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    className="bg-primary/10 text-primary border-0 hover:bg-primary/20"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-4">
              {post.title}
            </h1>

            {/* 作者信息 */}
            <div className="flex items-center justify-between py-4 border-y border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {post.user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">{post.user.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>发布于 {post.publishedAt || '最近'}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
              >
                关注
              </Button>
            </div>
          </section>

          {/* 文章内容 */}
          <section className="px-4 pb-6">
            {/* 缩略图 */}
            {post.thumbnail && (
              <div className="rounded-xl overflow-hidden mb-6 shadow-lg">
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* 正文 */}
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {post.brief}
            </div>

            {/* 更多内容提示 */}
            <div className="mt-6 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
              <p className="text-sm text-muted-foreground text-center">
                下载APP查看完整内容
              </p>
            </div>
          </section>

          {/* 互动按钮 */}
          <section className="px-4 py-4 border-y border-border/50 bg-card/50">
            <div className="flex items-center justify-around">
              <button
                onClick={handleLike}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                <span className="text-xs">{(post.totalLikes || 0) + (liked ? 1 : 0)}</span>
              </button>

              <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-6 h-6" />
                <span className="text-xs">{post.totalComments || 0}</span>
              </button>

              <button
                onClick={handleBookmark}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  bookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Bookmark className={`w-6 h-6 ${bookmarked ? 'fill-current' : ''}`} />
                <span className="text-xs">收藏</span>
              </button>

              <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <Eye className="w-6 h-6" />
                <span className="text-xs">{Math.floor(Math.random() * 5000) + 1000}</span>
              </button>
            </div>
          </section>

          {/* 评论区 */}
          <section className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">评论 ({mockComments.length})</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                查看最新
              </Button>
            </div>

            <div className="space-y-4">
              {mockComments.map((comment) => (
                <Card key={comment.id} className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">{comment.time}</span>
                        </div>
                        <p className="text-sm text-foreground/80 mb-2">{comment.content}</p>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Heart className="w-3 h-3" />
                          {comment.likes}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </ScrollArea>

      {/* 底部评论输入 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-3 safe-area-bottom z-50">
        <div className="flex items-center gap-2 max-w-screen-lg mx-auto">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的评论..."
            className="min-h-0 h-10 py-2 resize-none bg-muted/50 border-0 rounded-full px-4"
            rows={1}
          />
          <Button
            size="icon"
            className="rounded-full shrink-0 bg-primary hover:bg-primary/90"
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostDetail
