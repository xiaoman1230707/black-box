import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { PillVariant } from "@/lib/content-type"

const pillVariants = cva(
  "inline-flex min-h-7 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-2 px-3 py-1 text-xs font-bold leading-none",
  {
    variants: {
      variant: {
        accent: "border-ink bg-primary text-primary-foreground",
        warm: "border-ink bg-surface-warm text-foreground",
        soft: "border-border bg-card text-foreground-2",
        news: "border-ink bg-type-news text-foreground",
        guide: "border-ink bg-type-guide text-foreground",
        help: "border-ink bg-type-help text-foreground",
        review: "border-ink bg-type-review text-foreground",
        event: "border-ink bg-type-event text-foreground",
      } satisfies Record<PillVariant, string>,
    },
    defaultVariants: {
      variant: "soft",
    },
  }
)

function Pill({
  className,
  variant = "soft",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return (
    <span
      data-slot="pill"
      data-variant={variant}
      className={cn(pillVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Pill }

