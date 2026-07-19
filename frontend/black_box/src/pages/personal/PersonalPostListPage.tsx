import { useCallback, useEffect, useRef, useState } from "react"

import { fetchLikedPosts, fetchMyPosts } from "@/api/personal-posts"
import InfiniteScroll from "@/components/InfiniteScroll"
import PageState from "@/components/PageState"
import PostItem from "@/components/PostItem"
import { Button } from "@/components/ui/button"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  hasMorePosts,
  mergeUniquePosts,
  type PersonalPostListState,
  type PersonalPostRequestState,
} from "@/pages/personal/personal-post-list-state"
import type { PersonalPostListKind, Post, PostsResponse } from "@/types"

const PAGE_SIZE = 10

type PersonalPostsFetcher = (
  page?: number,
  limit?: number,
  signal?: AbortSignal
) => Promise<PostsResponse>

interface PersonalListConfiguration {
  title: string
  description: string
  loadingTitle: string
  emptyTitle: string
  emptyDescription: string
  fetchPage: PersonalPostsFetcher
}

const LIST_CONFIG: Record<PersonalPostListKind, PersonalListConfiguration> = {
  published: {
    title: "我的发布",
    description: "查看我发布的帖子。",
    loadingTitle: "正在加载我的发布",
    emptyTitle: "还没有发布过帖子",
    emptyDescription: "发布内容后会显示在这里。",
    fetchPage: fetchMyPosts,
  },
  liked: {
    title: "我的收藏",
    description: "查看我点赞过的帖子。",
    loadingTitle: "正在加载我的收藏",
    emptyTitle: "还没有收藏帖子",
    emptyDescription: "点赞过的帖子会显示在这里。",
    fetchPage: fetchLikedPosts,
  },
}

const INITIAL_STATE: PersonalPostListState = {
  items: [],
  total: 0,
  page: 0,
  requestState: "loading",
  isLoadingMore: false,
  loadMoreError: null,
}

export interface PersonalPostListViewProps {
  kind: PersonalPostListKind
  items: Post[]
  total: number
  requestState: PersonalPostRequestState
  isLoadingMore: boolean
  loadMoreError: string | null
  hasMore: boolean
  onRetryInitial: () => void
  onLoadMore: () => void
  onRetryLoadMore: () => void
}

export function PersonalPostListView({
  kind,
  items,
  total,
  requestState,
  isLoadingMore,
  loadMoreError,
  hasMore,
  onRetryInitial,
  onLoadMore,
  onRetryLoadMore,
}: PersonalPostListViewProps) {
  const config = LIST_CONFIG[kind]

  return (
    <main
      className="min-h-full min-w-0 space-y-6 py-5 sm:py-7"
      data-testid="personal-post-list-page"
      data-kind={kind}
    >
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">PERSONAL CONTENT</p>
          <h1 className="break-words font-heading text-2xl font-black text-foreground sm:text-3xl">
            {config.title}
          </h1>
          <p className="mt-1 text-sm text-foreground-2">{config.description}</p>
        </div>
        {requestState === "ready" ? (
          <span
            className="shrink-0 text-xs font-bold text-muted-foreground"
            data-testid="personal-post-total"
          >
            共 {total} 篇
          </span>
        ) : null}
      </header>

      {requestState === "loading" ? (
        <PageState
          state="loading"
          title={config.loadingTitle}
          description="请稍候。"
          testId="personal-list-loading"
        />
      ) : requestState === "error" ? (
        <PageState
          state="error"
          title="内容加载失败"
          description="暂时无法读取个人帖子，请稍后重试。"
          action={(
            <Button type="button" onClick={onRetryInitial} data-testid="personal-list-retry">
              重新加载
            </Button>
          )}
          testId="personal-list-error"
        />
      ) : items.length === 0 ? (
        <PageState
          state="empty"
          title={config.emptyTitle}
          description={config.emptyDescription}
          compact
          testId="personal-list-empty"
        />
      ) : (
        <InfiniteScroll
          hasMore={hasMore && !loadMoreError}
          isLoading={isLoadingMore}
          onLoadMore={onLoadMore}
        >
          <div
            className="grid min-w-0 gap-4 xl:grid-cols-2"
            data-testid="personal-post-list"
          >
            {items.map((post) => <PostItem key={post.id} post={post} />)}
          </div>
          {loadMoreError ? (
            <PageState
              state="error"
              title="更多内容加载失败"
              description={loadMoreError}
              action={(
                <Button
                  type="button"
                  onClick={onRetryLoadMore}
                  data-testid="personal-list-load-more-retry"
                >
                  重试加载
                </Button>
              )}
              compact
              className="mt-4"
              testId="personal-list-load-more-error"
            />
          ) : null}
        </InfiniteScroll>
      )}
    </main>
  )
}

export default function PersonalPostListPage({ kind }: { kind: PersonalPostListKind }) {
  const config = LIST_CONFIG[kind]
  const [state, setState] = useState<PersonalPostListState>(INITIAL_STATE)
  const requestIdRef = useRef(0)
  const busyRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)

  const requestPage = useCallback(async (page: number, mode: "initial" | "more") => {
    if (busyRef.current) return

    busyRef.current = true
    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    controllerRef.current = controller

    if (mode === "initial") {
      setState({ ...INITIAL_STATE, requestState: "loading" })
    } else {
      setState((current) => ({
        ...current,
        isLoadingMore: true,
        loadMoreError: null,
      }))
    }

    try {
      const response = await config.fetchPage(page, PAGE_SIZE, controller.signal)
      if (requestId !== requestIdRef.current) return

      setState((current) => ({
        items: mode === "initial"
          ? mergeUniquePosts([], response.items)
          : mergeUniquePosts(current.items, response.items),
        total: response.total,
        page,
        requestState: "ready",
        isLoadingMore: false,
        loadMoreError: null,
      }))
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return

      if (mode === "initial") {
        setState({ ...INITIAL_STATE, requestState: "error" })
      } else {
        setState((current) => ({
          ...current,
          isLoadingMore: false,
          loadMoreError: getApiErrorMessage(error, "更多内容加载失败，请重试。"),
        }))
      }
    } finally {
      if (requestId === requestIdRef.current) {
        busyRef.current = false
        controllerRef.current = null
      }
    }
  }, [config])

  useEffect(() => {
    void requestPage(1, "initial")

    return () => {
      requestIdRef.current += 1
      busyRef.current = false
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [requestPage])

  const handleLoadMore = useCallback(() => {
    if (state.loadMoreError) return
    void requestPage(state.page + 1, "more")
  }, [requestPage, state.loadMoreError, state.page])

  const handleRetryLoadMore = useCallback(() => {
    void requestPage(state.page + 1, "more")
  }, [requestPage, state.page])

  return (
    <PersonalPostListView
      kind={kind}
      items={state.items}
      total={state.total}
      requestState={state.requestState}
      isLoadingMore={state.isLoadingMore}
      loadMoreError={state.loadMoreError}
      hasMore={hasMorePosts(state.items, state.total)}
      onRetryInitial={() => void requestPage(1, "initial")}
      onLoadMore={handleLoadMore}
      onRetryLoadMore={handleRetryLoadMore}
    />
  )
}
