"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  markLeadConversationRead,
} from "./actions";

/* =========================================================
   COMPONENT
========================================================= */

export function MarkConversationRead({
  leadId,
  hasUnread,
}: {
  leadId: string;
  hasUnread: boolean;
}) {
  const router =
    useRouter();

  const startedRef =
    useRef(
      false
    );

  useEffect(
    () => {
      if (
        !hasUnread ||
        startedRef.current
      ) {
        return;
      }

      startedRef.current =
        true;

      async function markRead() {
        const result =
          await markLeadConversationRead(
            leadId
          );

        if (
          result.ok
        ) {
          router.refresh();
        }
      }

      void markRead();
    },
    [
      leadId,
      hasUnread,
      router,
    ]
  );

  return null;
}