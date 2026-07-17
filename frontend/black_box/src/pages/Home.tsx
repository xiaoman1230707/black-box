import { useEffect, useState } from 'react'
import SlideShow from '@/components/SildeShow'
import { useNavigate } from 'react-router-dom'
import { useHomeStore } from '@/store/useHomeStore'
import InfiniteScroll from '@/components/InfiniteScroll';
import PostItem from '@/components/PostItem';
import SearchBar from '@/components/SearchBar';
import PageState from '@/components/PageState';
import { TagChip } from '@/components/ui/tag-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { getContentTypeVariant } from '@/lib/content-type';
import { Gamepad2 } from 'lucide-react'

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
    games,
    currentGameId,
    loadGames,
  } = useHomeStore()
  const navigate = useNavigate()
  const [searchKeyword, setSearchKeyword] = useState('')

  // 数据保持(替代 react-activation keep-alive):store 已有 posts(从详情等返回)则不重载、不闪;仅首次(空)加载。
  // 滚动恢复:返回时从 sessionStorage 恢复 window 滚动(双 rAF 等列表渲染撑高);滚动时实时存当前位置。
  useEffect(() => {
    if (posts.length === 0) {
      loadTags()
      loadGames()
      loadMore()
    } else {
      const saved = sessionStorage.getItem('home-scroll')
      if (saved) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
        })
      }
    }
    // 滚动实时存:离开首页时 Home 卸载、列表 DOM 拆、页面高度骤降,window.scrollY 被浏览器
    // 截断(实测离开时 500、卸载读到 176),故不能在卸载 cleanup 里存。改在 scroll 时同步存:
    // setItem 写内存态 sessionStorage、极轻量,scroll 已按帧触发无需节流;停止滚动时最后一次
    // 事件即存真实位置;卸载只移监听、无 pending timer,不会再存到截断值。
    const onScroll = () => {
      sessionStorage.setItem('home-scroll', String(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 标签切换:点未选中的切到该 tag;点已选中的取消、回"全部"。currentTag 单一驱动高亮+筛选。
  const handleTagClick = (name: string) => {
    loadMore({ tag: currentTag === name ? 'all' : name })
  }
  // 三期§六:游戏切换(toggle:点已选中的取消、回全部游戏)。与 tag 独立、AND 叠加。
  const handleGameClick = (id: number) => {
    loadMore({ gameId: currentGameId === id ? null : id })
  }

  const handleSearch = (value: string) => {
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search')
  }

  const isInitialLoading = loading && posts.length === 0
  const isEmpty = !loading && posts.length === 0

  const initialSkeleton = (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2" data-slot="home-skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="grid min-h-52 gap-4 rounded-md border-2 border-ink bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-full min-w-0 bg-background">
      <main className="space-y-8 py-5 sm:py-7">
        <section aria-label="站内搜索" data-slot="home-search">
          <SearchBar
            value={searchKeyword}
            onValueChange={setSearchKeyword}
            onSubmit={handleSearch}
            onClear={() => setSearchKeyword('')}
            placeholder="搜索游戏攻略、评测…"
          />
        </section>

        <section aria-label="社区精选">
          <SlideShow slides={banners} />
        </section>

        <section className="min-w-0 space-y-4" aria-labelledby="home-feed-heading">
          <div className="space-y-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" data-slot="home-tag-filter">
              <span className="shrink-0 text-xs font-bold text-muted-foreground">内容</span>
              <TagChip
                value="all"
                variant="soft"
                active={currentTag === null || currentTag === 'all'}
                onSelect={() => loadMore({ tag: 'all' })}
                data-testid="tag-all"
              >
                全部
              </TagChip>
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  value={tag.name}
                  variant={getContentTypeVariant(tag.name)}
                  active={currentTag === tag.name}
                  onSelect={() => handleTagClick(tag.name)}
                  data-testid="tag-chip"
                >
                  {tag.name}
                </TagChip>
              ))}
            </div>

            {games.length > 0 ? (
              <div
                className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
                data-testid="game-filter-row"
                data-slot="home-game-filter"
              >
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground">
                  <Gamepad2 className="size-4" aria-hidden="true" />
                  游戏
                </span>
                {games.map((game) => (
                  <TagChip
                    key={game.id}
                    value={game.id}
                    variant="soft"
                    active={currentGameId === game.id}
                    onSelect={() => handleGameClick(game.id)}
                    data-testid="game-chip"
                  >
                    {game.name}
                  </TagChip>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">COMMUNITY FEED</p>
              <h1 id="home-feed-heading" className="text-xl font-black text-foreground sm:text-2xl">
                热门帖子
              </h1>
            </div>
            <span className="shrink-0 text-xs font-bold text-muted-foreground">共 {posts.length} 篇</span>
          </div>

          {isInitialLoading ? (
            <div data-slot="home-loading" role="status" aria-live="polite" aria-label="正在加载帖子">
              {initialSkeleton}
              <span className="sr-only">正在加载帖子</span>
            </div>
          ) : isEmpty ? (
            <PageState
              state="empty"
              title="暂时没有匹配的帖子"
              description="可以调整筛选条件，稍后再来看看。"
              compact
              className="min-h-40"
              testId="home-empty"
            />
          ) : (
            <InfiniteScroll hasMore={hasMore} isLoading={loading} onLoadMore={loadMore}>
              <div className="grid min-w-0 gap-4 xl:grid-cols-2" data-slot="home-post-grid">
                {posts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </div>
            </InfiniteScroll>
          )}
        </section>
      </main>
    </div>
  )
}
