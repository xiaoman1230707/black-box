import instance from "@/api/config"
import type { PostsResponse } from "@/types"

export function fetchMyPosts(page = 1, limit = 10, signal?: AbortSignal) {
  return instance.get<never, PostsResponse>("/posts/mine", {
    params: { page, limit },
    signal,
  })
}

export function fetchLikedPosts(page = 1, limit = 10, signal?: AbortSignal) {
  return instance.get<never, PostsResponse>("/posts/liked", {
    params: { page, limit },
    signal,
  })
}
