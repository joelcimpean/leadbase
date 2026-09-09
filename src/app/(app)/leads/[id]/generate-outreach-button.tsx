"use client";

import {
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  generateLeadOutreachDraft,
} from "../outreach-actions";

import {
  Button,
} from "@/components/ui/button";

/* =========================================================
   TYPES
========================================================= */

type GenerateOutreachButtonProps = {
  leadId: string;
  hasDraft?: boolean;
};

/* =========================================================
   BUTTON
========================================================= */

export function GenerateOutreachButton({
  leadId,
  hasDraft = false,
}: GenerateOutreachButtonProps) {
  return (
    <form
      action={
        generateLeadOutreachDraft
      }
    >
      <input
        type="hidden"
        name="leadId"
        value={
          leadId
        }
      />

      <SubmitButton
        hasDraft={
          hasDraft
        }
      />
    </form>
  );
}

/* =========================================================
   SUBMIT
========================================================= */

function SubmitButton({
  hasDraft,
}: {
  hasDraft: boolean;
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="default"
      disabled={
        pending
      }
      className="h-9 gap-2 rounded-[9px] bg-[#002BBA] px-3 text-white shadow-none transition-colors hover:bg-[#00229A]"
    >
      {pending ? (
        <>
          <RefreshCw className="size-3.5 animate-spin" />

          Generating draft...
        </>
      ) : (
        <>
          <Sparkles className="size-3.5" />

          {hasDraft
            ? "Regenerate draft"
            : "Generate draft"}
        </>
      )}
    </Button>
  );
}