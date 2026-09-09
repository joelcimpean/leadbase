import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[6px] border border-transparent px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.05em] whitespace-nowrap transition-colors focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-destructive/15 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[#EAEEFB] text-primary [a]:hover:bg-[#DFE5FA] dark:bg-primary/18 dark:text-[#DCE4FF]",
        secondary:
          "bg-secondary text-[#5F646C] [a]:hover:bg-secondary/80 dark:text-[#B8BBC2]",
        destructive:
          "bg-destructive/10 text-destructive [a]:hover:bg-destructive/16 dark:bg-destructive/15",
        outline:
          "border-border bg-card text-[#5F646C] [a]:hover:bg-muted dark:text-[#B8BBC2]",
        ghost:
          "bg-transparent text-muted-foreground [a]:hover:bg-muted [a]:hover:text-foreground",
        success:
          "bg-[#E9F5EC] text-[#39734B] dark:bg-[#173321] dark:text-[#8FD1A4]",
        warning:
          "bg-[#FFF1E5] text-[#A76322] dark:bg-[#392818] dark:text-[#E7B57E]",
        link:
          "h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
