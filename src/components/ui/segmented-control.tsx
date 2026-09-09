import * as React from "react"

import { cn } from "@/lib/utils"

function SegmentedControl({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="segmented-control"
      className={cn("leadbase-segmented", className)}
      {...props}
    />
  )
}

function SegmentedControlItem({
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean
}) {
  return (
    <button
      type="button"
      data-slot="segmented-control-item"
      data-active={active ? "true" : "false"}
      className={cn("leadbase-segmented-item", className)}
      {...props}
    />
  )
}

export {
  SegmentedControl,
  SegmentedControlItem,
}
