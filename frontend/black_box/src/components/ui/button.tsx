"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    busy?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  busy = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-busy={busy || undefined}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
// Compatibility export for existing consumers; variants live outside the component module for Fast Refresh.
// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants } from "@/components/ui/button-variants"
