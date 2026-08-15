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
  Button,
} from "@/components/ui/button";

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
        ? "Syncing..."
        : "Sync"}
    </Button>
  );
}