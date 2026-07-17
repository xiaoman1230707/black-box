import * as React from "react"

import { cn } from "@/lib/utils"

function formatCount(value: number) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0)
  if (safeValue < 1000) return String(Math.trunc(safeValue))
  return `${(safeValue / 1000).toFixed(1)}k`
}

type CountBadgeProps = Omit<React.ComponentProps<"span">, "children"> & {
  value: number
}

function CountBadge({ value, className, title, ...props }: CountBadgeProps) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0)

  return (
    <span
      data-slot="count-badge"
      className={cn(
        "font-mono text-xs leading-none font-bold tabular-nums",
        className
      )}
      title={title ?? String(Math.trunc(safeValue))}
      {...props}
    >
      {formatCount(safeValue)}
    </span>
  )
}

export { CountBadge }

