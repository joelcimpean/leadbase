import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-transparent bg-clip-padding text-[13px] font-medium tracking-[-0.01em] outline-none select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,43,186,0.18)] hover:bg-[#001E85]",
        outline:
          "border-border bg-card text-foreground shadow-[0_1px_2px_rgba(11,12,14,0.02)] hover:border-[rgba(11,12,14,0.14)] hover:bg-muted dark:border-white/10 dark:bg-card dark:hover:border-white/16 dark:hover:bg-white/[0.045]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--secondary),var(--foreground)_4%)]",
        ghost:
          "bg-transparent text-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_4.5%,transparent)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/16 focus-visible:border-destructive/45 focus-visible:ring-destructive/15 dark:bg-destructive/12 dark:hover:bg-destructive/20",
        link:
          "h-auto rounded-none px-0 text-primary shadow-none underline-offset-4 hover:text-[#001E85] hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs:
          "h-6 gap-1 rounded-[8px] px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm:
          "h-8 gap-1.5 rounded-[9px] px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        lg:
          "h-10 gap-2 px-3.5 text-[13.5px]",
        icon:
          "size-9",
        "icon-xs":
          "size-6 rounded-[8px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[9px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg":
          "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
