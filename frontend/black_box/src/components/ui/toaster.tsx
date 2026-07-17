"use client"

import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      offset="var(--space-4)"
      mobileOffset="calc(var(--bottombar-h) + env(safe-area-inset-bottom) + var(--space-3))"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border-2 !border-ink !bg-card !text-card-foreground !shadow-md",
          title: "!font-heading !font-extrabold",
          description: "!text-foreground-2",
          closeButton:
            "!size-11 !rounded-sm !border-2 !border-ink !bg-card !text-foreground",
          success: "!border-success",
          error: "!border-destructive",
          warning: "!border-type-event",
        },
      }}
    />
  )
}

export { Toaster }
