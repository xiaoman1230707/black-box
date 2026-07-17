import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { TagChipVariant } from "@/lib/content-type"

const tagChipVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border-2 border-ink px-4 py-2 text-sm font-bold text-foreground shadow-none outline-none transition-[transform,box-shadow,background-color,color] duration-(--motion-fast) ease-standard hover:-translate-y-0.5 hover:shadow-sm focus-visible:[box-shadow:var(--focus-ring)] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm motion-reduce:transform-none motion-reduce:transition-none",
  {
    variants: {
      variant: {
        accent: "bg-primary text-primary-foreground",
        warm: "bg-surface-warm",
        soft: "border-border bg-card text-foreground-2",
        news: "bg-type-news",
        guide: "bg-type-guide",
        help: "bg-type-help",
        review: "bg-type-review",
        event: "bg-type-event",
      } satisfies Record<TagChipVariant, string>,
    },
    defaultVariants: {
      variant: "soft",
    },
  }
)

type TagChipValue = string | number

type TagChipProps = Omit<
  React.ComponentProps<"button">,
  "value" | "onSelect"
> & {
  value: TagChipValue
  active?: boolean
  variant?: TagChipVariant
  onSelect?: (value: TagChipValue) => void
}

function TagChip({
  value,
  active = false,
  variant = "soft",
  onSelect,
  onClick,
  className,
  type = "button",
  ...props
}: TagChipProps) {
  return (
    <button
      type={type}
      data-slot="tag-chip"
      data-state={active ? "active" : "inactive"}
      data-variant={variant}
      className={cn(tagChipVariants({ variant }), className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onSelect?.(value)
      }}
      {...props}
    />
  )
}

export { TagChip }
export type { TagChipProps, TagChipValue }

