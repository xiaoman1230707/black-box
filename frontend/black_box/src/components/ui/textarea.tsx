import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-30 w-full rounded-sm border-2 border-input bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-sm outline-none transition-[box-shadow,border-color,background-color] duration-(--motion-fast) ease-standard placeholder:text-muted-foreground focus-visible:[box-shadow:var(--focus-ring),var(--shadow-small)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:[box-shadow:0_0_0_4px_color-mix(in_oklab,var(--destructive),transparent_74%)] data-[state=invalid]:border-destructive motion-reduce:transition-none md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
