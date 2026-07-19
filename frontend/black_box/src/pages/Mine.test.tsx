import type { PropsWithChildren } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  fetchLikedPosts,
  fetchMyPosts,
  logout,
  setAvatar,
  uploadAvatar,
  useUserStore,
} = vi.hoisted(() => ({
  fetchLikedPosts: vi.fn(),
  fetchMyPosts: vi.fn(),
  logout: vi.fn(),
  setAvatar: vi.fn(),
  uploadAvatar: vi.fn(),
  useUserStore: vi.fn(),
}))

vi.mock("@/api/personal-posts", () => ({ fetchLikedPosts, fetchMyPosts }))
vi.mock("@/api/upload", () => ({ uploadAvatar }))
vi.mock("@/store/useUserStore", () => ({ useUserStore }))
vi.mock("@/lib/feedback", () => ({
  feedback: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/components/ui/drawer", () => {
  const Passthrough = ({ children }: PropsWithChildren) => <>{children}</>

  return {
    Drawer: Passthrough,
    DrawerClose: Passthrough,
    DrawerContent: Passthrough,
    DrawerDescription: Passthrough,
    DrawerFooter: Passthrough,
    DrawerHeader: Passthrough,
    DrawerTitle: Passthrough,
    DrawerTrigger: Passthrough,
  }
})

import Mine from "@/pages/Mine"

function renderMine() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Mine />
    </MemoryRouter>
  )
}

describe("Mine personal content entries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUserStore.mockReturnValue({
      user: { id: 7, name: "验收玩家", avatar: "" },
      logout,
      setAvatar,
    })
  })

  it("renders semantic links for published and liked posts", () => {
    const html = renderMine()

    expect(html).toContain('data-testid="mine-posts-link"')
    expect(html).toContain('href="/mine/posts"')
    expect(html).toContain("我的发布")
    expect(html).toContain('data-testid="mine-likes-link"')
    expect(html).toContain('href="/mine/likes"')
    expect(html).toContain("我的收藏")
    expect(html).not.toContain("Favorite")
  })

  it("keeps existing account, avatar upload, and logout controls", () => {
    const html = renderMine()

    expect(html).toContain("账户摘要")
    expect(html).toContain('data-testid="mine-avatar"')
    expect(html).toContain('data-testid="avatar-upload-btn"')
    expect(html).toContain("退出登录")
  })

  it("does not prefetch lists or invent counts while rendering entries", () => {
    const html = renderMine()

    expect(fetchMyPosts).not.toHaveBeenCalled()
    expect(fetchLikedPosts).not.toHaveBeenCalled()
    expect(html).not.toContain("篇发布")
    expect(html).not.toContain("篇收藏")
  })
})
