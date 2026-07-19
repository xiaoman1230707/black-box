import { beforeEach, describe, expect, it, vi } from "vitest"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("./config", () => ({ default: { get } }))

import { fetchLikedPosts, fetchMyPosts } from "./personal-posts"

describe("personal post API", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("requests the current user's published posts and forwards AbortSignal", async () => {
    const signal = new AbortController().signal
    get.mockResolvedValue({ items: [], total: 0 })

    await fetchMyPosts(2, 10, signal)

    expect(get).toHaveBeenCalledWith("/posts/mine", {
      params: { page: 2, limit: 10 },
      signal,
    })
  })

  it("requests the current user's liked posts without a userId", async () => {
    const signal = new AbortController().signal
    get.mockResolvedValue({ items: [], total: 0 })

    await fetchLikedPosts(3, 5, signal)

    expect(get).toHaveBeenCalledWith("/posts/liked", {
      params: { page: 3, limit: 5 },
      signal,
    })
  })

  it("preserves default pagination", async () => {
    get.mockResolvedValue({ items: [], total: 0 })

    await fetchMyPosts()

    expect(get).toHaveBeenCalledWith("/posts/mine", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    })
  })

  it("lets request failures propagate unchanged", async () => {
    const failure = new Error("network down")
    get.mockRejectedValue(failure)
    let received: unknown

    try {
      await fetchLikedPosts()
    } catch (error) {
      received = error
    }

    expect(received).toBe(failure)
  })
})
