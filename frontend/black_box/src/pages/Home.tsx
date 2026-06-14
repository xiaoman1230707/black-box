import { useEffect } from 'react'
import SlideShow from '@/components/SildeShow'
import { useNavigate } from 'react-router-dom'
import { useHomeStore } from '@/store/useHomeStore'
import InfiniteScroll from '@/components/InfiniteScroll';
import PostItem from '@/components/PostItem';
import { Input } from '@/components/ui/input';
import { Search, Gamepad2 } from 'lucide-react'

export default function Home() {
  const {
    banners,
    posts,
    hasMore,
    loadMore,
    loading,
    tags,
    loadTags,
    currentTag,
  } = useHomeStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadTags()
    loadMore()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-background">
      {/* 顶部搜索栏 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-orange-100/50">
        <div className="px-4 py-3">
          <div
            className="relative max-w-md mx-auto"
            onClick={() => navigate("/search")}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"/>
            <Input
              readOnly
              placeholder="搜索游戏攻略、评测..."
              className="pl-10 pr-4 h-11 rounded-full cursor-pointer bg-muted/50 border-orange-200/50
                focus:bg-background transition-colors duration-300 placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* 游戏分类标签栏 */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            <button
              onClick={() => loadMore('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-200 active:scale-95
                ${currentTag === null || currentTag === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-orange-100/50 text-orange-700 hover:bg-primary hover:text-primary-foreground'
                }`}
            >
              <Gamepad2 className="w-4 h-4" />
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => loadMore(tag.name)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-200 active:scale-95
                  ${currentTag === tag.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-orange-100/50 text-orange-700 hover:bg-primary hover:text-primary-foreground'
                  }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* 轮播图 */}
        <section className="rounded-2xl overflow-hidden shadow-lg shadow-orange-500/5">
          <SlideShow slides={banners} />
        </section>

        {/* 热门帖子列表 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-lg font-bold text-foreground">热门帖子</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              共 {posts.length} 篇
            </span>
          </div>

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={loading}
            onLoadMore={loadMore}
          >
            <div className="space-y-3">
              {posts.map(post => (
                <PostItem
                  key={post.id}
                  post={post}
                />
              ))}
            </div>
          </InfiniteScroll>
        </section>
      </main>
    </div>
  )
}
