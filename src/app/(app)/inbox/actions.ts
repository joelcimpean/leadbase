"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  syncGmailRepliesForCurrentUser,
} from "@/lib/gmail-sync";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   REVALIDATE
========================================================= */

function revalidateInbox() {
  revalidatePath(
    "/inbox"
  );

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/campaigns"
  );

  revalidatePath(
    "/",
    "layout"
  );
}

/* =========================================================
   MANUAL SYNC
========================================================= */

export async function syncInbox() {
  let destination =
    "/inbox?sync=error";

  try {
    const result =
      await syncGmailRepliesForCurrentUser();

    destination =
      `/inbox?sync=done&new=${result.newReplies}`;
  } catch (error) {
    console.error(
      "Inbox sync failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "GMAIL_READ_PERMISSION_REQUIRED"
    ) {
      destination =
        "/inbox?sync=permission";
    } else if (
      message ===
      "GMAIL_NOT_CONNECTED"
    ) {
      destination =
        "/inbox?sync=not-connected";
    }
  }

  revalidateInbox();

  redirect(
    destination
  );
}

/* =========================================================
   SILENT BACKGROUND SYNC
========================================================= */

export async function syncInboxSilently() {
  try {
    const result =
      await syncGmailRepliesForCurrentUser();

    if (
      result.newReplies >
      0
    ) {
      revalidateInbox();
    }

    return {
      ok:
        true,

      newReplies:
        result.newReplies,
    };
  } catch (error) {
    console.error(
      "Automatic inbox sync failed:",
      error
    );

    return {
      ok:
        false,

      newReplies:
        0,

      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    };
  }
}

/* =========================================================
   MARK LEAD CONVERSATION READ
========================================================= */

export async function markLeadConversationRead(
  leadId: string
) {
  if (
    !leadId
  ) {
    return {
      ok:
        false,
    };
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return {
      ok:
        false,
    };
  }

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .update({
        read_at:
          now,

        is_unread:
          false,
      })
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "direction",
        "INCOMING"
      )
      .is(
        "read_at",
        null
      );

  if (
    error
  ) {
    console.error(
      "Could not mark conversation as read:",
      error
    );

    return {
      ok:
        false,
    };
  }

  revalidateInbox();

  return {
    ok:
      true,
  };
}