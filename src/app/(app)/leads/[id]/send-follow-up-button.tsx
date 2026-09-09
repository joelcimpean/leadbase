"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { sendFollowUpOutreachDraft } from "../outreach-actions";
import { queueUndoableSend } from "@/lib/undoable-send";

type SendFollowUpButtonProps = {
  leadId: string;
  draftId: string;
  recipientEmail: string;
};

export function SendFollowUpButton({ leadId, draftId, recipientEmail }: SendFollowUpButtonProps) {
  const [queued, setQueued] = useState(false);

  function queueSend() {
    if (queued) return;
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("draftId", draftId);
    setQueued(true);

    queueUndoableSend({
      label: `Follow-up an ${recipientEmail}`,
      detail: "Wird in 10 Sekunden gesendet.",
      commit: async () => { await sendFollowUpOutreachDraft(formData); },
      onUndo: () => setQueued(false),
      onSuccess: () => setQueued(false),
      onError: () => setQueued(false),
    });
  }

  return (
    <button type="button" disabled={queued} onClick={queueSend} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
      <Send className="size-3.5" />
      {queued ? "Zum Senden vorgemerkt" : "Send follow-up"}
    </button>
  );
}
