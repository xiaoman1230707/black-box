import { useState, type ComponentProps, type ReactNode } from "react"
import ReactMarkdown, { type Components, type UrlTransform } from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import { Link } from "react-router-dom"

import {
  isInternalMarkdownLink,
  markdownRemarkPlugins,
  markdownSanitizeSchema,
  sanitizeImageUrl,
  sanitizeLinkUrl,
} from "@/lib/markdown"
import { cn } from "@/lib/utils"

type MarkdownRendererVariant = "article" | "chat"

interface MarkdownRendererProps {
  content: string
  variant?: MarkdownRendererVariant
  className?: string
  empty?: ReactNode
}

function withoutMarkdownNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node, ...elementProps } = props
  void node
  return elementProps
}

function MarkdownImage({
  src,
  alt,
  variant,
  ...props
}: ComponentProps<"img"> & { variant: MarkdownRendererVariant }) {
  const [failed, setFailed] = useState(false)
  const safeSource = typeof src === "string" ? sanitizeImageUrl(src) : undefined

  if (!safeSource || failed) {
    return (
      <span
        role="img"
        aria-label={alt ? `图片不可用：${alt}` : "图片不可用"}
        className={cn(
          "grid min-h-28 place-items-center rounded-sm border-2 border-dashed border-border bg-muted px-4 text-sm font-semibold text-foreground-2",
          variant === "chat" ? "my-3" : "my-5"
        )}
      >
        图片不可用
      </span>
    )
  }

  return (
    <img
      {...props}
      src={safeSource}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "h-auto max-w-full rounded-sm border-2 border-ink bg-muted",
        variant === "chat" ? "my-3" : "my-5"
      )}
    />
  )
}

const markdownTypography = {
  article: {
    h1: "mt-8 mb-4 font-heading text-3xl leading-heading font-extrabold first:mt-0",
    h2: "mt-8 mb-3 font-heading text-2xl leading-heading font-extrabold first:mt-0",
    h3: "mt-6 mb-3 font-heading text-xl leading-heading font-extrabold first:mt-0",
    p: "my-4 break-words leading-7 first:mt-0 last:mb-0",
    ul: "my-4 list-disc space-y-2 pl-6",
    ol: "my-4 list-decimal space-y-2 pl-6",
    li: "break-words pl-1",
    blockquote: "my-5 border-l-4 border-primary bg-muted px-4 py-3 text-foreground-2",
    table: "my-5 max-w-full overflow-x-auto rounded-sm border-2 border-ink",
    pre: "my-5 max-w-full overflow-x-auto rounded-sm border-2 border-ink bg-ink p-4 text-sm leading-6 text-card",
    hr: "my-8 border-0 border-t-2 border-ink",
  },
  chat: {
    h1: "mt-4 mb-2 font-heading text-xl leading-heading font-extrabold first:mt-0",
    h2: "mt-3 mb-2 font-heading text-lg leading-heading font-extrabold first:mt-0",
    h3: "mt-3 mb-1.5 font-heading text-base leading-heading font-extrabold first:mt-0",
    p: "my-2 break-words leading-6 first:mt-0 last:mb-0",
    ul: "my-2 list-disc space-y-1 pl-5",
    ol: "my-2 list-decimal space-y-1 pl-5",
    li: "break-words pl-0.5",
    blockquote: "my-3 border-l-4 border-primary bg-muted px-3 py-2 text-foreground-2",
    table: "my-3 max-w-full overflow-x-auto rounded-sm border-2 border-ink",
    pre: "my-3 max-w-full overflow-x-auto rounded-sm border-2 border-ink bg-ink p-3 text-sm leading-5 text-card",
    hr: "my-4 border-0 border-t-2 border-ink",
  },
} satisfies Record<MarkdownRendererVariant, Record<string, string>>

function createMarkdownComponents(variant: MarkdownRendererVariant): Components {
  const typography = markdownTypography[variant]

  return {
    h1: (props) => <h1 className={typography.h1} {...withoutMarkdownNode(props)} />,
    h2: (props) => <h2 className={typography.h2} {...withoutMarkdownNode(props)} />,
    h3: (props) => <h3 className={typography.h3} {...withoutMarkdownNode(props)} />,
    p: (props) => <p className={typography.p} {...withoutMarkdownNode(props)} />,
    ul: (props) => <ul className={typography.ul} {...withoutMarkdownNode(props)} />,
    ol: (props) => <ol className={typography.ol} {...withoutMarkdownNode(props)} />,
    li: (props) => <li className={typography.li} {...withoutMarkdownNode(props)} />,
    blockquote: (props) => (
      <blockquote className={typography.blockquote} {...withoutMarkdownNode(props)} />
    ),
    a: ({ node, href, children, ...props }) => {
      void node
      const safeHref = typeof href === "string" ? sanitizeLinkUrl(href) : undefined
      if (!safeHref) return <span>{children}</span>
      const className = "font-bold text-primary underline decoration-2 underline-offset-4 break-words"
      if (isInternalMarkdownLink(safeHref)) {
        return <Link to={safeHref} className={className}>{children}</Link>
      }
      if (safeHref.toLowerCase().startsWith("mailto:")) {
        return <a {...props} href={safeHref} className={className}>{children}</a>
      }
      return (
        <a
          {...props}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {children}
        </a>
      )
    },
    img: ({ node, ...props }) => {
      void node
      return <MarkdownImage {...props} variant={variant} />
    },
    table: (props) => (
      <div className={typography.table}>
        <table className="w-full min-w-lg border-collapse text-left text-sm" {...withoutMarkdownNode(props)} />
      </div>
    ),
    th: (props) => (
      <th className="border-b-2 border-r border-ink bg-muted px-3 py-2 font-extrabold last:border-r-0" {...withoutMarkdownNode(props)} />
    ),
    td: (props) => (
      <td className="border-r border-t border-border px-3 py-2 align-top last:border-r-0" {...withoutMarkdownNode(props)} />
    ),
    pre: (props) => <pre className={typography.pre} {...withoutMarkdownNode(props)} />,
    code: ({ node, className, ...props }) => {
      void node
      return (
        <code
          className={cn(
            "rounded-[calc(var(--radius-sm)-2px)] bg-muted px-1.5 py-0.5 font-mono text-[0.9em] break-words",
            className?.startsWith("language-") && "bg-transparent p-0 text-inherit break-normal",
            className
          )}
          {...props}
        />
      )
    },
    hr: (props) => <hr className={typography.hr} {...withoutMarkdownNode(props)} />,
    input: (props) => (
      <input className="mr-2 size-4 accent-primary" disabled {...withoutMarkdownNode(props)} />
    ),
  }
}

const markdownComponentsByVariant: Record<MarkdownRendererVariant, Components> = {
  article: createMarkdownComponents("article"),
  chat: createMarkdownComponents("chat"),
}

const markdownUrlTransform: UrlTransform = (url, key) =>
  key === "src" ? sanitizeImageUrl(url) : sanitizeLinkUrl(url)

export default function MarkdownRenderer({
  content,
  variant = "article",
  className,
  empty = null,
}: MarkdownRendererProps) {
  if (!content) return <>{empty}</>

  return (
    <div
      data-slot="markdown-renderer"
      data-variant={variant}
      className={cn("min-w-0 max-w-full text-foreground", className)}
    >
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        skipHtml
        urlTransform={markdownUrlTransform}
        components={markdownComponentsByVariant[variant]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export type { MarkdownRendererProps, MarkdownRendererVariant }
