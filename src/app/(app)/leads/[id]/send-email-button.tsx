"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { sendApprovedOutreachDraft } from "../outreach-actions";
import { queueUndoableSend } from "@/lib/undoable-send";

type SendEmailButtonProps = {
  leadId: string;
  draftId: string;
  recipientEmail: string;
};

export function SendEmailButton({ leadId, draftId, recipientEmail }: SendEmailButtonProps) {
  const [queued, setQueued] = useState(false);

  function queueSend() {
    if (queued) return;
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("draftId", draftId);
    setQueued(true);

    queueUndoableSend({
      label: `E-Mail an ${recipientEmail}`,
      detail: "Wird in 10 Sekunden gesendet.",
      commit: async () => { await sendApprovedOutreachDraft(formData); },
      onUndo: () => setQueued(false),
      onSuccess: () => setQueued(false),
      onError: () => setQueued(false),
    });
  }

  return (
    <button type="button" disabled={queued} onClick={queueSend} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
      <Send className="size-3.5" />
      {queued ? "Zum Senden vorgemerkt" : "Send email"}
    </button>
  );
}
