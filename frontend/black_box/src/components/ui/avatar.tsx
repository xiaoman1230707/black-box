import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

export type AvatarCover = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type AvatarSize = "default" | "sm" | "md" | "lg"

const avatarCoverClasses: Record<AvatarCover, string> = {
  1: "bg-[image:var(--gradient-cv-1)]",
  2: "bg-[image:var(--gradient-cv-2)]",
  3: "bg-[image:var(--gradient-cv-3)]",
  4: "bg-[image:var(--gradient-cv-4)]",
  5: "bg-[image:var(--gradient-cv-5)]",
  6: "bg-[image:var(--gradient-cv-6)]",
  7: "bg-[image:var(--gradient-cv-7)]",
  8: "bg-[image:var(--gradient-cv-8)]",
}

function Avatar({
  className,
  size = "default",
  cv,
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize
  cv?: AvatarCover
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-cover={cv}
      className={cn(
        "group/avatar relative flex size-7 shrink-0 overflow-hidden rounded-pill border-2 border-ink bg-secondary text-primary-foreground select-none data-[size=md]:size-11 data-[size=lg]:size-18",
        cv && avatarCoverClasses[cv],
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-pill object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-pill bg-transparent text-xs font-extrabold text-inherit group-data-[size=md]/avatar:text-base group-data-[size=lg]/avatar:text-2xl",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex size-2.5 items-center justify-center rounded-pill border-2 border-card bg-primary text-primary-foreground group-data-[size=md]/avatar:size-3.5 group-data-[size=lg]/avatar:size-5 [&>svg]:size-2 group-data-[size=lg]/avatar:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-muted text-xs font-bold text-muted-foreground ring-2 ring-card group-has-data-[size=md]/avatar-group:size-11 group-has-data-[size=lg]/avatar-group:size-18",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
