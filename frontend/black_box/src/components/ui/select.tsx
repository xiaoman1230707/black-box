"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("min-w-0 truncate", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-11 w-full items-center justify-between gap-3 rounded-sm border-2 border-input bg-card px-4 py-2 text-left text-sm font-semibold text-foreground shadow-sm outline-none transition-[box-shadow,border-color,background-color] duration-(--motion-fast) ease-standard data-[popup-open]:[box-shadow:var(--focus-ring),var(--shadow-small)] focus-visible:[box-shadow:var(--focus-ring),var(--shadow-small)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive data-[state=invalid]:border-destructive motion-reduce:transition-none [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        className="shrink-0 text-muted-foreground"
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

type SelectContentProps = SelectPrimitive.Popup.Props & {
  alignItemWithTrigger?: boolean
  sideOffset?: number
}

function SelectContent({
  className,
  children,
  alignItemWithTrigger = false,
  sideOffset = 8,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        alignItemWithTrigger={alignItemWithTrigger}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-[min(20rem,var(--available-height))] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-sm border-2 border-ink bg-popover text-popover-foreground shadow-md outline-none transition-[transform,opacity] duration-(--motion-fast) ease-standard data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none",
            className
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="flex h-8 items-center justify-center bg-popover text-muted-foreground">
            <ChevronUp className="size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List className="scroll-py-1 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="flex h-8 items-center justify-center bg-popover text-muted-foreground">
            <ChevronDown className="size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-10 cursor-default items-center rounded-[calc(var(--radius-sm)-2px)] py-2 pr-9 pl-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:font-bold",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center justify-center text-primary">
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-3 py-2 text-xs font-bold text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
}
