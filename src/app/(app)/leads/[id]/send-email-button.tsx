"use client";

import {
  Loader2,
  Send,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  sendApprovedOutreachDraft,
} from "../outreach-actions";

/* =========================================================
   TYPES
========================================================= */

type SendEmailButtonProps = {
  leadId: string;
  draftId: string;
  recipientEmail: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export function SendEmailButton({
  leadId,
  draftId,
  recipientEmail,
}: SendEmailButtonProps) {
  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    const confirmed =
      window.confirm(
        `Send this email now to ${recipientEmail}?\n\nThis will send the approved draft through Gmail.`
      );

    if (
      !confirmed
    ) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={
        sendApprovedOutreachDraft
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

      <SendButtonContent />
    </form>
  );
}

/* =========================================================
   BUTTON
========================================================= */

function SendButtonContent() {
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

          Send email
        </>
      )}
    </button>
  );
}