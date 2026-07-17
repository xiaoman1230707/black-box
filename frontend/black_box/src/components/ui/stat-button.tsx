import type { MouseEventHandler } from "react"
import { cva } from "class-variance-authority"
import { Eye, Heart, LoaderCircle, MessageCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { CountBadge } from "@/components/ui/count-badge"

type StatButtonVariant = "like" | "comment" | "view"

const statButtonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-bold text-muted-foreground outline-none transition-[color,background-color,box-shadow] duration-(--motion-fast) ease-standard focus-visible:[box-shadow:var(--focus-ring)] data-[state=liked]:text-primary motion-reduce:transition-none",
  {
    variants: {
      interactive: {
        true: "cursor-pointer hover:bg-accent hover:text-primary active:bg-secondary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        false: "cursor-default",
      },
    },
  }
)

const STAT_META = {
  like: { label: "点赞", Icon: Heart },
  comment: { label: "评论", Icon: MessageCircle },
  view: { label: "浏览", Icon: Eye },
} satisfies Record<
  StatButtonVariant,
  { label: string; Icon: typeof Heart }
>

type StatButtonProps = {
  variant: StatButtonVariant
  count?: number
  active?: boolean
  busy?: boolean
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  title?: string
  "aria-label"?: string
  "data-testid"?: string
}

function StatButton({
  variant,
  count = 0,
  active = false,
  busy = false,
  disabled = false,
  onClick,
  className,
  title,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: StatButtonProps) {
  const { label, Icon } = STAT_META[variant]
  const interactive = variant !== "view" && typeof onClick === "function"
  const state = active ? "liked" : "idle"
  const content = (
    <>
      {busy ? (
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Icon
          className={cn("size-4", active && variant === "like" && "fill-current")}
          aria-hidden="true"
        />
      )}
      <CountBadge value={count} />
    </>
  )

  if (!interactive) {
    return (
      <span
        data-slot="stat-button"
        data-variant={variant}
        data-state={state}
        data-testid={testId}
        className={cn(statButtonVariants({ interactive: false }), className)}
        title={title ?? label}
        aria-label={ariaLabel ?? `${label} ${count}`}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-slot="stat-button"
      data-variant={variant}
      data-state={state}
      data-testid={testId}
      data-busy={busy || undefined}
      aria-busy={busy || undefined}
      aria-label={ariaLabel ?? `${label} ${count}`}
      title={title ?? label}
      disabled={disabled || busy}
      className={cn(statButtonVariants({ interactive: true }), className)}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

export { StatButton }
export type { StatButtonProps, StatButtonVariant }

