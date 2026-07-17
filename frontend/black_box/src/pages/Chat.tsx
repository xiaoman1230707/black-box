import { ArrowLeft, Bot, Loader2, Send, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import MarkdownRenderer from "@/components/MarkdownRenderer"
import PageState from "@/components/PageState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChatbot } from "@/hooks/useChatBot"

type Citation = { id: number; title: string }

export default function Chat() {
  const navigate = useNavigate()
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChatbot()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim()) return
    handleSubmit(event)
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-3rem)] min-h-[30rem] w-full max-w-4xl flex-col gap-4 max-[760px]:h-[calc(100dvh-var(--bottombar-h)-3rem-env(safe-area-inset-bottom))] max-[760px]:min-h-0">
      <header className="flex shrink-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">
            游戏攻略助手
          </h1>
          <p className="text-sm text-foreground-2">基于站内帖子回答你的游戏问题</p>
        </div>
      </header>

      <Card
        padding="none"
        className="min-h-0 flex-1 bg-card"
        data-slot="chat-flow"
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <PageState
              state="empty"
              title="从一个具体问题开始"
              description="例如角色养成、Boss 打法或资源规划。"
              icon={<Bot aria-hidden="true" />}
              compact
              className="h-full min-h-48 border-0 bg-transparent"
            />
          ) : (
            <div className="space-y-5">
              {messages.map((message) => {
                const isUser = message.role === "user"
                const citations: Citation[] =
                  message.role === "assistant" && Array.isArray(message.annotations)
                    ? (message.annotations as Citation[])
                    : []

                return (
                  <article
                    key={message.id}
                    data-testid="chat-message"
                    data-role={isUser ? "user" : "assistant"}
                    className={`flex min-w-0 items-start gap-2 ${
                      isUser ? "flex-row-reverse" : "justify-start"
                    }`}
                  >
                    <span
                      className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-sm border-2 border-ink ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-warm text-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {isUser ? <UserRound className="size-4" /> : <Bot className="size-4" />}
                    </span>
                    <div
                      className={`min-w-0 max-w-[min(82%,42rem)] rounded-sm border-2 border-ink px-4 py-3 shadow-sm sm:max-w-[75%] ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownRenderer content={message.content} variant="chat" />
                      ) : (
                        <p className="break-words whitespace-pre-wrap">{message.content}</p>
                      )}
                      {citations.length > 0 ? (
                        <div
                          className={`mt-3 flex flex-wrap gap-2 border-t-2 pt-3 ${
                            isUser ? "border-primary-foreground/40" : "border-border"
                          }`}
                          data-testid="chat-citations"
                        >
                          <span className="w-full text-xs font-bold opacity-75">相关帖子</span>
                          {citations.map((citation) => (
                            <Link
                              key={citation.id}
                              to={`/post/${citation.id}`}
                              title={citation.title}
                              data-testid="chat-citation-link"
                              className="inline-flex min-h-11 min-w-0 max-w-full items-center rounded-pill border-2 border-ink bg-surface-warm px-3 py-2 text-xs font-bold text-foreground shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:[box-shadow:var(--focus-ring)] motion-reduce:transform-none"
                            >
                              <span className="truncate">{citation.title}</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}

              {isLoading ? (
                <div className="flex items-start gap-2" data-testid="chat-loading">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-surface-warm">
                    <Bot className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-h-11 items-center rounded-sm border-2 border-ink bg-card px-4 shadow-sm">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-label="正在生成回答" />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {error ? (
        <div data-slot="chat-error" className="shrink-0">
          <PageState
            state="error"
            title="回答生成失败"
            description="请稍后重新发送问题。已有对话不会被清除。"
            compact
            className="min-h-0 py-4"
          />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          aria-label="输入问题"
          disabled={isLoading}
          className="min-w-0 flex-1 bg-card"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label="Send"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Send className="size-5" aria-hidden="true" />
          )}
        </Button>
      </form>
    </main>
  )
}
