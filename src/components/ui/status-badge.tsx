import * as React from "react"

import { cn } from "@/lib/utils"

type StatusBadgeTone =
  | "neutral"
  | "blue"
  | "success"
  | "warning"
  | "danger"

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral:
    "bg-[#F1F2F4] text-[#62676F] dark:bg-white/[0.07] dark:text-[#B8BBC2]",
  blue:
    "bg-[#EAEEFB] text-primary dark:bg-primary/18 dark:text-[#DCE4FF]",
  success:
    "bg-[#E9F5EC] text-[#39734B] dark:bg-[#173321] dark:text-[#8FD1A4]",
  warning:
    "bg-[#FFF1E5] text-[#A76322] dark:bg-[#392818] dark:text-[#E7B57E]",
  danger:
    "bg-[#FCEAEA] text-[#A53C3C] dark:bg-[#3A1B1B] dark:text-[#F1A0A0]",
}

function StatusBadge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: StatusBadgeTone
}) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-[6px] px-1.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.055em] whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}

export {
  StatusBadge,
  type StatusBadgeTone,
}
