import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card flex flex-col overflow-hidden rounded-md bg-card text-sm text-card-foreground transition-[transform,border-color,box-shadow] duration-(--motion-fast) ease-standard motion-reduce:transform-none motion-reduce:transition-none",
  {
    variants: {
      variant: {
        panel: "border-2 border-ink shadow-md",
        tile:
          "border-2 border-border-soft shadow-none hover:-translate-y-0.5 hover:border-ink",
      },
      padding: {
        none: "gap-0",
        sm: "gap-3",
        default: "gap-4",
      },
    },
    defaultVariants: {
      variant: "panel",
      padding: "default",
    },
  }
)

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    size?: "default" | "sm"
  }

function Card({
  className,
  variant = "panel",
  padding,
  size = "default",
  ...props
}: CardProps) {
  const resolvedPadding = padding ?? (size === "sm" ? "sm" : "default")

  return (
    <div
      data-slot="card"
      data-size={size}
      data-padding={resolvedPadding}
      data-variant={variant}
      className={cn(
        cardVariants({ variant, padding: resolvedPadding }),
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-6 pt-6 group-data-[padding=none]/card:p-0 group-data-[padding=sm]/card:px-4 group-data-[padding=sm]/card:pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-lg leading-heading font-extrabold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-snug text-foreground-2", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-6 group-data-[padding=none]/card:p-0 group-data-[padding=sm]/card:px-4",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center border-t-2 border-border bg-muted px-6 py-4 group-data-[padding=none]/card:p-0 group-data-[padding=sm]/card:px-4 group-data-[padding=sm]/card:py-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
