import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"

function IconButton({
  variant = "outline",
  size = "icon",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="icon-button"
      variant={variant}
      size={size}
      {...props}
    />
  )
}

export { IconButton }
