"use client";

import { Loader2, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitLeadButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-w-28 gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Plus className="size-4" />
          Add lead
        </>
      )}
    </Button>
  );
}