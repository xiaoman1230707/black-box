"use client"

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger

function AlertDialogPortal(props: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal {...props} />
}

function AlertDialogBackdrop({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn(
        "fixed inset-0 z-60 bg-ink/55 transition-opacity duration-(--motion-fast) data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogPopup({
  className,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Popup
      data-slot="alert-dialog-content"
      className={cn(
        "fixed top-1/2 left-1/2 z-70 grid max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-md border-2 border-ink bg-card p-6 text-card-foreground shadow-lg outline-none transition-[transform,opacity] duration-(--motion-fast) data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none sm:p-7",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  children,
  backdropClassName,
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  backdropClassName?: string
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop className={backdropClassName} />
      <AlertDialogPopup {...props}>{children}</AlertDialogPopup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-2 text-left", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-heading text-xl leading-heading font-extrabold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm leading-relaxed text-foreground-2", className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      render={<Button variant="outline" className={className} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
