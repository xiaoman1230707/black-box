import { describe, expect, it } from "vitest"

import { sanitizeImageUrl, sanitizeLinkUrl } from "@/lib/markdown"

describe("Markdown URL policy", () => {
  it("允许明确的链接协议与站内相对路径", () => {
    expect(sanitizeLinkUrl("https://example.com/guide")).toBe("https://example.com/guide")
    expect(sanitizeLinkUrl("mailto:player@example.com")).toBe("mailto:player@example.com")
    expect(sanitizeLinkUrl("/post/39")).toBe("/post/39")
    expect(sanitizeLinkUrl("../guide?q=1#boss")).toBe("../guide?q=1#boss")
  })

  it("拒绝危险、协议相对及混淆链接", () => {
    expect(sanitizeLinkUrl("javascript:alert(1)")).toBeUndefined()
    expect(sanitizeLinkUrl("JaVaScRiPt:alert(1)")).toBeUndefined()
    expect(sanitizeLinkUrl("java\nscript:alert(1)")).toBeUndefined()
    expect(sanitizeLinkUrl("//evil.example/path")).toBeUndefined()
    expect(sanitizeLinkUrl("https:\\evil.example")).toBeUndefined()
  })

  it("图片只允许绝对 http/https", () => {
    expect(sanitizeImageUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png"
    )
    expect(sanitizeImageUrl("/uploads/a.png")).toBeUndefined()
    expect(sanitizeImageUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined()
  })
})
