"use client";

import {
  RefreshCw,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  syncInbox,
} from "./actions";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  inboxCopy,
} from "@/lib/inbox-i18n";

/* =========================================================
   COMPONENT
========================================================= */

export function SyncInboxButton({
  disabled = false,
  compact = false,
}: {
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <form
      action={
        syncInbox
      }
    >
      <SyncButtonContent
        disabled={disabled}
        compact={compact}
      />
    </form>
  );
}

/* =========================================================
   BUTTON
========================================================= */

function SyncButtonContent({
  disabled,
  compact,
}: {
  disabled: boolean;
  compact: boolean;
}) {
  const {
    language,
  } =
    useLanguage();

  const text =
    inboxCopy[
      language
    ].sync;

  const {
    pending,
  } =
    useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={
        disabled ||
        pending
      }
      className={
        compact
          ? "h-[31px] gap-1.5 rounded-[9px] border-[var(--lb-border)] bg-[var(--lb-surface)] px-2.5 text-[10.5px] font-medium text-[var(--lb-text-secondary)] shadow-none hover:border-[var(--lb-border-strong)] hover:bg-[var(--lb-surface-subtle)]"
          : "gap-2"
      }
    >
      <RefreshCw
        className={
          pending
            ? compact
              ? "size-3 animate-spin"
              : "size-4 animate-spin"
            : compact
              ? "size-3"
              : "size-4"
        }
      />

      {pending
        ? text.syncing
        : text.sync}
    </Button>
  );
}