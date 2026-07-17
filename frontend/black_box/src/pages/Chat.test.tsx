import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useChatbotMock } = vi.hoisted(() => ({ useChatbotMock: vi.fn() }))

vi.mock("@/hooks/useChatBot", () => ({
  useChatbot: useChatbotMock,
}))

import Chat from "@/pages/Chat"

function renderChat(messages: Array<Record<string, unknown>>) {
  useChatbotMock.mockReturnValue({
    messages,
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    error: undefined,
  })

  return renderToStaticMarkup(
    <MemoryRouter>
      <Chat />
    </MemoryRouter>
  )
}

describe("Chat message presentation", () => {
  beforeEach(() => useChatbotMock.mockReset())

  it("renders assistant Markdown before independent citation links", () => {
    const html = renderChat([
      {
        id: "a1",
        role: "assistant",
        content: "## 回答\n\n- 第一点\n- **第二点**",
        annotations: [{ id: 39, title: "站内攻略" }],
      },
    ])

    expect(html).toContain('data-testid="chat-message"')
    expect(html).toContain('data-role="assistant"')
    expect(html).toContain('data-variant="chat"')
    expect(html).toContain("<h2")
    expect(html).toContain("<ul")
    expect(html).toContain("<strong>第二点</strong>")
    expect(html).toContain('data-testid="chat-citations"')
    expect(html).toContain('data-testid="chat-citation-link"')
    expect(html).toContain('href="/post/39"')
    expect(html.indexOf('data-variant="chat"')).toBeLessThan(
      html.indexOf('data-testid="chat-citations"')
    )
  })

  it("keeps user Markdown source characters as plain text", () => {
    const html = renderChat([
      {
        id: "u1",
        role: "user",
        content: "**用户原文** [链接](/post/1)",
      },
    ])

    expect(html).toContain('data-testid="chat-message"')
    expect(html).toContain('data-role="user"')
    expect(html).toContain("**用户原文** [链接](/post/1)")
    expect(html).not.toContain('data-variant="chat"')
    expect(html).not.toContain("<strong>")
    expect(html).not.toContain('href="/post/1"')
  })
})
