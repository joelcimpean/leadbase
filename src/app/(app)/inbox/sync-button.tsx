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
}: {
  disabled?: boolean;
}) {
  return (
    <form
      action={
        syncInbox
      }
    >
      <SyncButtonContent
        disabled={
          disabled
        }
      />
    </form>
  );
}

/* =========================================================
   BUTTON
========================================================= */

function SyncButtonContent({
  disabled,
}: {
  disabled: boolean;
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
      className="gap-2"
    >
      <RefreshCw
        className={
          pending
            ? "size-4 animate-spin"
            : "size-4"
        }
      />

      {pending
        ? text.syncing
        : text.sync}
    </Button>
  );
}