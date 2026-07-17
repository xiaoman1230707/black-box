import { beforeEach, describe, expect, it, vi } from "vitest"

const { doSearch, fetchPosts } = vi.hoisted(() => ({
  doSearch: vi.fn(),
  fetchPosts: vi.fn(),
}))

vi.mock("@/api/search", () => ({ doSearch }))
vi.mock("@/api/posts", () => ({ fetchPosts }))

import { useSearchStore } from "@/store/search"

describe("useSearchStore search failures", () => {
  beforeEach(() => {
    doSearch.mockReset()
    fetchPosts.mockReset()
    useSearchStore.setState({
      loading: false,
      error: null,
      suggestions: [],
      history: [],
    })
  })

  it("maps a backend failure result to ErrorState instead of EmptyState", async () => {
    doSearch.mockResolvedValue({ code: 1, message: "search failed", data: [] })

    await useSearchStore.getState().search("黑神话")

    expect(useSearchStore.getState()).toMatchObject({
      loading: false,
      suggestions: [],
      error: "搜索暂时不可用，请稍后重试。",
    })
  })
})
