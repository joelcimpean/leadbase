"use client";

import {
  Loader2,
  Send,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  sendFollowUpOutreachDraft,
} from "../outreach-actions";

/* =========================================================
   TYPES
========================================================= */

type SendFollowUpButtonProps = {
  leadId: string;
  draftId: string;
  recipientEmail: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export function SendFollowUpButton({
  leadId,
  draftId,
  recipientEmail,
}: SendFollowUpButtonProps) {
  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const confirmed =
      window.confirm(
        `Send the follow-up email now to ${recipientEmail}?\n\nThis action will send the prepared follow-up through Gmail.`
      );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={
        sendFollowUpOutreachDraft
      }
      onSubmit={
        handleSubmit
      }
    >
      <input
        type="hidden"
        name="leadId"
        value={
          leadId
        }
      />

      <input
        type="hidden"
        name="draftId"
        value={
          draftId
        }
      />

      <SubmitButton />
    </form>
  );
}

/* =========================================================
   BUTTON
========================================================= */

function SubmitButton() {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />

          Sending...
        </>
      ) : (
        <>
          <Send className="size-3.5" />

          Send follow-up
        </>
      )}
    </button>
  );
}