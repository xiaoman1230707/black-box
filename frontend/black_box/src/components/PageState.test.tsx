import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import PageState from "@/components/PageState"

describe("PageState", () => {
  it("为 loading 输出非抢占式状态语义", () => {
    const html = renderToStaticMarkup(
      <PageState state="loading" title="正在加载" description="请稍候" />
    )

    expect(html).toContain('data-state="loading"')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
  })

  it("为 error 输出 alert 并保留页面动作", () => {
    const html = renderToStaticMarkup(
      <PageState
        state="error"
        title="加载失败"
        action={<button type="button">重试</button>}
      />
    )

    expect(html).toContain('data-state="error"')
    expect(html).toContain('role="alert"')
    expect(html).toContain("重试")
  })

  it("empty 不声明实时区域", () => {
    const html = renderToStaticMarkup(
      <PageState state="empty" title="暂无内容" compact />
    )

    expect(html).toContain('data-state="empty"')
    expect(html).not.toContain('role="alert"')
    expect(html).not.toContain('aria-live=')
  })
})
