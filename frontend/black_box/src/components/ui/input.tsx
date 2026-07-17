import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-sm border-2 border-input bg-card px-4 py-2 text-base text-foreground shadow-sm outline-none transition-[box-shadow,border-color,background-color] duration-(--motion-fast) ease-standard file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus-visible:[box-shadow:var(--focus-ring),var(--shadow-small)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:[box-shadow:0_0_0_4px_color-mix(in_oklab,var(--destructive),transparent_74%)] data-[state=invalid]:border-destructive motion-reduce:transition-none md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
