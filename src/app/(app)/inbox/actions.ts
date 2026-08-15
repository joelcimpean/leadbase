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
   TYPES
========================================================= */

type ConversationState =
  | "INBOX"
  | "ARCHIVED"
  | "TRASH"
  | "DELETED";

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
   USER
========================================================= */

async function getAuthenticatedUser() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },

    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    return {
      supabase,
      user:
        null,
    };
  }

  return {
    supabase,
    user,
  };
}

/* =========================================================
   INTERNAL: MARK READ
========================================================= */

async function markConversationReadInternal(
  leadId: string
) {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  if (
    !user
  ) {
    return false;
  }

  const {
    error,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .update({
        read_at:
          new Date()
            .toISOString(),

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
      );

  if (
    error
  ) {
    console.error(
      "Could not mark conversation as read:",
      error
    );

    return false;
  }

  return true;
}

/* =========================================================
   INTERNAL: STATE
========================================================= */

async function setConversationState(
  leadId: string,
  state:
    ConversationState
) {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  if (
    !user
  ) {
    return false;
  }

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } =
    await supabase
      .from(
        "inbox_conversation_states"
      )
      .upsert(
        {
          user_id:
            user.id,

          lead_id:
            leadId,

          state,

          archived_at:
            state ===
            "ARCHIVED"
              ? now
              : null,

          trashed_at:
            state ===
            "TRASH"
              ? now
              : null,

          deleted_at:
            state ===
            "DELETED"
              ? now
              : null,
        },
        {
          onConflict:
            "user_id,lead_id",
        }
      );

  if (
    error
  ) {
    console.error(
      "Could not update conversation state:",
      error
    );

    return false;
  }

  return true;
}

/* =========================================================
   INTERNAL: CANCEL SCHEDULED MAIL
========================================================= */

async function cancelScheduledEmailsForLead(
  leadId: string
) {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  if (
    !user
  ) {
    return;
  }

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "CANCELLED",

        cancelled_at:
          now,
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
        "status",
        "SCHEDULED"
      );

  if (
    error
  ) {
    console.error(
      "Could not cancel scheduled emails:",
      error
    );
  }
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
      error instanceof
        Error
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
   SILENT SYNC
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
        error instanceof
          Error
          ? error.message
          : "UNKNOWN_ERROR",
    };
  }
}

/* =========================================================
   MARK READ
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

  const ok =
    await markConversationReadInternal(
      leadId
    );

  revalidateInbox();

  return {
    ok,
  };
}

/* =========================================================
   MARK UNREAD

   Only the newest incoming message becomes unread.
========================================================= */

export async function markLeadConversationUnread(
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

  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  if (
    !user
  ) {
    return {
      ok:
        false,
    };
  }

  const {
    data:
      latestMessage,

    error:
      latestError,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .select(
        "id"
      )
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
      .order(
        "received_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    latestError ||
    !latestMessage
  ) {
    console.error(
      "Could not find latest incoming message:",
      latestError
    );

    return {
      ok:
        false,
    };
  }

  const {
    error,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .update({
        read_at:
          null,

        is_unread:
          true,
      })
      .eq(
        "id",
        latestMessage.id
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {
    console.error(
      "Could not mark conversation as unread:",
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

/* =========================================================
   FORM ACTION WRAPPERS

   React form actions expect void / Promise<void>.
   The original functions keep their result objects because
   other components may use them programmatically.
========================================================= */

export async function markLeadConversationReadFromForm(
  leadId: string
): Promise<void> {
  await markLeadConversationRead(
    leadId
  );
}

export async function markLeadConversationUnreadFromForm(
  leadId: string
): Promise<void> {
  await markLeadConversationUnread(
    leadId
  );
}

/* =========================================================
   ARCHIVE
========================================================= */

export async function archiveLeadConversation(
  leadId: string
) {
  if (
    !leadId
  ) {
    return;
  }

  /*
   * Archive removes the conversation from the
   * active unread count.
   */
  await markConversationReadInternal(
    leadId
  );

  await setConversationState(
    leadId,
    "ARCHIVED"
  );

  revalidateInbox();
}

/* =========================================================
   MOVE TO TRASH
========================================================= */

export async function moveLeadConversationToTrash(
  leadId: string
) {
  if (
    !leadId
  ) {
    return;
  }

  await markConversationReadInternal(
    leadId
  );

  /*
   * Do not allow a scheduled reply to fire after
   * the conversation was deliberately trashed.
   */
  await cancelScheduledEmailsForLead(
    leadId
  );

  await setConversationState(
    leadId,
    "TRASH"
  );

  revalidateInbox();
}

/* =========================================================
   RESTORE
========================================================= */

export async function restoreLeadConversation(
  leadId: string
) {
  if (
    !leadId
  ) {
    return;
  }

  await setConversationState(
    leadId,
    "INBOX"
  );

  revalidateInbox();
}

/* =========================================================
   DELETE PERMANENTLY FROM LEADOS

   We keep the internal email records as a tombstone so
   old Gmail messages are not imported again on the next
   synchronization.

   A genuinely NEW customer email will reopen the lead.
========================================================= */

export async function permanentlyDeleteLeadConversation(
  leadId: string
) {
  if (
    !leadId
  ) {
    return;
  }

  await markConversationReadInternal(
    leadId
  );

  await cancelScheduledEmailsForLead(
    leadId
  );

  await setConversationState(
    leadId,
    "DELETED"
  );

  revalidateInbox();
}

/* =========================================================
   EMPTY TRASH
========================================================= */

export async function emptyTrash() {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  if (
    !user
  ) {
    return;
  }

  const {
    data:
      trashedStates,

    error:
      loadError,
  } =
    await supabase
      .from(
        "inbox_conversation_states"
      )
      .select(
        "lead_id"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "state",
        "TRASH"
      );

  if (
    loadError
  ) {
    console.error(
      "Could not load trash:",
      loadError
    );

    return;
  }

  const leadIds =
    (
      trashedStates ??
      []
    ).map(
      (
        state
      ) =>
        state.lead_id
    );

  if (
    leadIds.length ===
    0
  ) {
    return;
  }

  const now =
    new Date()
      .toISOString();

  const {
    error:
      scheduledError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "CANCELLED",

        cancelled_at:
          now,
      })
      .eq(
        "user_id",
        user.id
      )
      .in(
        "lead_id",
        leadIds
      )
      .eq(
        "status",
        "SCHEDULED"
      );

  if (
    scheduledError
  ) {
    console.error(
      "Could not cancel trash schedules:",
      scheduledError
    );
  }

  const {
    error:
      stateError,
  } =
    await supabase
      .from(
        "inbox_conversation_states"
      )
      .update({
        state:
          "DELETED",

        archived_at:
          null,

        trashed_at:
          null,

        deleted_at:
          now,
      })
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "state",
        "TRASH"
      );

  if (
    stateError
  ) {
    console.error(
      "Could not empty trash:",
      stateError
    );
  }

  revalidateInbox();
}