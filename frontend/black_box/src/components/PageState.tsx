import type { ReactNode } from "react"
import { CircleAlert, Inbox, LoaderCircle, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

export type PageStateKind = "idle" | "loading" | "empty" | "error"

interface PageStateProps {
  state: PageStateKind
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
  testId?: string
}

const stateIcons: Record<PageStateKind, ReactNode> = {
  idle: <Sparkles aria-hidden="true" />,
  loading: <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />,
  empty: <Inbox aria-hidden="true" />,
  error: <CircleAlert aria-hidden="true" />,
}

export default function PageState({
  state,
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  testId,
}: PageStateProps) {
  const accessibility =
    state === "loading"
      ? { role: "status", "aria-live": "polite" as const }
      : state === "error"
        ? { role: "alert" }
        : {}

  return (
    <div
      data-slot="page-state"
      data-state={state}
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/45 px-5 text-center",
        compact ? "min-h-36 py-6" : "min-h-56 py-10",
        className
      )}
      {...accessibility}
    >
      <span
        className={cn(
          "grid size-11 place-items-center rounded-sm border-2 border-ink bg-card shadow-sm [&_svg]:size-5",
          state === "error" && "text-destructive",
          state === "loading" && "text-primary"
        )}
      >
        {icon ?? stateIcons[state]}
      </span>
      <h2 className="mt-4 font-heading text-lg leading-heading font-extrabold text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-foreground-2">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}

export type { PageStateProps }
