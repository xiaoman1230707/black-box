import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/api/personal-posts", () => ({
  fetchMyPosts: vi.fn(),
  fetchLikedPosts: vi.fn(),
}))

import type { Post } from "@/types"
import {
  PersonalPostListView,
  type PersonalPostListViewProps,
} from "@/pages/personal/PersonalPostListPage"
import {
  hasMorePosts,
  mergeUniquePosts,
} from "@/pages/personal/personal-post-list-state"

const post: Post = {
  id: 101,
  title: "黑神话 Boss 攻略",
  brief: "完整帖子摘要",
  content: "正文",
  publishedAt: "2026-07-18T00:00:00.000Z",
  totalLikes: 3,
  totalComments: 2,
  viewCount: 18,
  likedByMe: true,
  tags: ["攻略"],
  user: { id: 7, name: "星海攻略组" },
}

const baseProps: PersonalPostListViewProps = {
  kind: "published",
  items: [],
  total: 0,
  requestState: "ready",
  isLoadingMore: false,
  loadMoreError: null,
  hasMore: false,
  onRetryInitial: vi.fn(),
  onLoadMore: vi.fn(),
  onRetryLoadMore: vi.fn(),
}

function renderView(overrides: Partial<PersonalPostListViewProps> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <PersonalPostListView {...baseProps} {...overrides} />
    </MemoryRouter>
  )
}

describe("PersonalPostListView", () => {
  it("renders initial loading as a PageState", () => {
    const html = renderView({ requestState: "loading" })

    expect(html).toContain('data-testid="personal-list-loading"')
    expect(html).toContain('data-state="loading"')
    expect(html).toContain("正在加载我的发布")
  })

  it("renders published and liked empty copy without inventing content", () => {
    const published = renderView()
    const liked = renderView({ kind: "liked" })

    expect(published).toContain("我的发布")
    expect(published).toContain("还没有发布过帖子")
    expect(liked).toContain("我的收藏")
    expect(liked).toContain("还没有收藏帖子")
  })

  it("renders an initial error with retry instead of an empty state", () => {
    const html = renderView({ requestState: "error" })

    expect(html).toContain('data-testid="personal-list-error"')
    expect(html).toContain('data-testid="personal-list-retry"')
    expect(html).toContain("重新加载")
    expect(html).not.toContain('data-testid="personal-list-empty"')
  })

  it("keeps full post cards visible when loading the next page fails", () => {
    const html = renderView({
      kind: "liked",
      items: [post],
      total: 3,
      hasMore: true,
      loadMoreError: "下一页加载失败",
    })

    expect(html).toContain('data-testid="personal-post-list"')
    expect(html).toContain('data-testid="post-item"')
    expect(html).toContain("黑神话 Boss 攻略")
    expect(html).toContain("完整帖子摘要")
    expect(html).toContain('data-testid="personal-list-load-more-error"')
    expect(html).toContain('data-testid="personal-list-load-more-retry"')
  })

  it("shows the authoritative total for a ready list", () => {
    const html = renderView({ items: [post], total: 12, hasMore: true })

    expect(html).toContain('data-testid="personal-post-total"')
    expect(html).toContain("共 12 篇")
  })
})

describe("personal post pagination helpers", () => {
  it("deduplicates overlapping pages by id while preserving first-seen order", () => {
    const second = { ...post, id: 102, title: "第二篇" }
    const duplicate = { ...post, title: "重复返回的第一篇" }

    const merged = mergeUniquePosts([post], [duplicate, second])

    expect(merged.map((item) => item.id)).toEqual([101, 102])
    expect(merged[0].title).toBe("黑神话 Boss 攻略")
  })

  it("uses deduplicated item count and the latest total to stop pagination", () => {
    const items = [post, { ...post, id: 102 }]

    expect(hasMorePosts(items, 3)).toBe(true)
    expect(hasMorePosts(items, 2)).toBe(false)
    expect(hasMorePosts(items, 1)).toBe(false)
  })
})
