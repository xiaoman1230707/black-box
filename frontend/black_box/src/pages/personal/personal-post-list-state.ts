import type { Post } from "@/types"

export type PersonalPostRequestState = "loading" | "ready" | "error"

export interface PersonalPostListState {
  items: Post[]
  total: number
  page: number
  requestState: PersonalPostRequestState
  isLoadingMore: boolean
  loadMoreError: string | null
}

export function mergeUniquePosts(current: Post[], incoming: Post[]): Post[] {
  const seen = new Set(current.map((post) => post.id))
  const uniqueIncoming = incoming.filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })

  return [...current, ...uniqueIncoming]
}

export function hasMorePosts(items: Post[], total: number): boolean {
  return items.length < Math.max(0, total)
}
