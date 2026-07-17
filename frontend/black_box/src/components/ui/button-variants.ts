import { cva } from "class-variance-authority"

const outlinedButton =
  "border-2 border-ink bg-card text-foreground shadow-md hover:-translate-x-px hover:-translate-y-px hover:shadow-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-sm"

export const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm text-sm font-bold transition-[transform,box-shadow,background-color,color,border-color] duration-(--motion-fast) ease-standard outline-none select-none focus-visible:[box-shadow:var(--focus-ring),var(--shadow-medium)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[busy=true]:cursor-wait motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: `${outlinedButton} bg-primary text-primary-foreground hover:bg-accent-hover active:bg-accent-active`,
        default: outlinedButton,
        outline: outlinedButton,
        secondary: `${outlinedButton} bg-secondary text-secondary-foreground`,
        ghost:
          "border-2 border-transparent bg-transparent text-foreground shadow-none hover:bg-accent active:translate-y-px",
        destructive: `${outlinedButton} bg-destructive text-white hover:bg-destructive/90`,
        link:
          "border-0 bg-transparent px-0 text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-5",
        sm: "h-9 gap-1.5 px-3 text-xs shadow-sm",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11 p-0",
        xs: "h-7 gap-1 px-2 text-xs shadow-sm",
        "icon-xs": "size-7 p-0 shadow-sm",
        "icon-sm": "size-9 p-0 shadow-sm",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

