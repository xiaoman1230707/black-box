import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import MarkdownRenderer, {
  type MarkdownRendererVariant,
} from "@/components/MarkdownRenderer"

function renderMarkdown(content: string, variant?: MarkdownRendererVariant) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MarkdownRenderer content={content} variant={variant} />
    </MemoryRouter>
  )
}

describe("MarkdownRenderer", () => {
  it("默认保持 article 排版与宽内容局部滚动契约", () => {
    const html = renderMarkdown(
      "# 标题\n\n正文\n\n| 名称 | 状态 |\n| --- | --- |\n| 虎先锋 | 完成 |\n\n```ts\nconst boss = true\n```"
    )

    expect(html).toContain('data-variant="article"')
    expect(html).toMatch(/<h1[^>]*text-3xl/)
    expect(html).toMatch(/<p[^>]*leading-7/)
    expect(html).toContain("min-w-lg")
    expect(html).toMatch(/<pre[^>]*overflow-x-auto/)
  })

  it("chat variant 紧凑呈现标题、强调、列表、引用、链接、代码和表格", () => {
    const html = renderMarkdown(
      "# 一级标题\n\n## 二级标题\n\n**重点**\n\n- 列表项\n\n> 引用\n\n[站内](/post/39)\n\n```ts\nconst value = 1\n```\n\n| 名称 | 状态 |\n| --- | --- |\n| 虎先锋 | 完成 |",
      "chat"
    )

    expect(html).toContain('data-variant="chat"')
    expect(html).toMatch(/<h1[^>]*text-xl/)
    expect(html).toMatch(/<h2[^>]*text-lg/)
    expect(html).toMatch(/<p[^>]*leading-6/)
    expect(html).toContain("<strong>重点</strong>")
    expect(html).toContain("<ul")
    expect(html).toContain("<blockquote")
    expect(html).toContain('href="/post/39"')
    expect(html).toContain("language-ts")
    expect(html).toContain("<table")
  })

  it("chat variant 继续移除 raw HTML、事件属性和危险 URL", () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<iframe src="https://evil.example"></iframe>\n[x](javascript:alert(1))\n![x](data:text/html,boom)',
      "chat"
    )

    expect(html).not.toContain("<script")
    expect(html).not.toContain("<iframe")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("data:text/html")
  })

  it.each([
    "**未闭合",
    "[链接](https://example.com",
    "`未闭合代码",
    "```ts\nconst value = 1",
    "| 名称 | 状态 |\n| ---",
  ])("chat variant 可安全渲染流式前缀 %#", (prefix) => {
    expect(() => renderMarkdown(prefix, "chat")).not.toThrow()
    expect(renderMarkdown(prefix, "chat")).toContain('data-variant="chat"')
  })

  it("保留旧帖单换行并区分空行段落", () => {
    const html = renderMarkdown("第一行\n第二行\n\n新段落")

    expect(html).toContain("第一行<br/>")
    expect(html).toContain("第二行")
    expect(html.match(/<p/g)).toHaveLength(2)
  })

  it("支持 GFM 表格、任务列表、删除线和代码块", () => {
    const html = renderMarkdown(
      "| 名称 | 状态 |\n| --- | --- |\n| 虎先锋 | 完成 |\n\n- [x] 已查看\n\n~~旧路线~~\n\n```ts\nconst boss = true\n```"
    )

    expect(html).toContain("<table")
    expect(html).toContain('type="checkbox"')
    expect(html).toContain("disabled")
    expect(html).toContain("<del>旧路线</del>")
    expect(html).toContain("language-ts")
  })

  it("移除 raw HTML、事件属性和危险 URL", () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<iframe src="https://evil.example"></iframe>\n[x](javascript:alert(1))\n![x](data:text/html,boom)'
    )

    expect(html).not.toContain("<script")
    expect(html).not.toContain("<iframe")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("data:text/html")
  })

  it("站内链接保留当前窗口，外链加安全属性", () => {
    const html = renderMarkdown("[站内](/post/39) [外链](https://example.com)")

    expect(html).toContain('href="/post/39"')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
