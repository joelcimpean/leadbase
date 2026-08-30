import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  sendGmailMessage,
  sendGmailReply,
} from "@/lib/gmail-send";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_BUCKET =
  "scheduled-email-attachments";

const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

const MAX_EMAILS_PER_RUN =
  20;

const FOLLOW_UP_DELAY_DAYS =
  5;

/* =========================================================
   TYPES
========================================================= */

type StoredAttachment = {
  name: string;
  type: string;
  size: number;
  storagePath: string;
};

type ScheduleMessageType =
  | "REPLY"
  | "OUTREACH";

type ScheduledEmail = {
  id: string;
  user_id: string;
  lead_id: string;
  message_type:
    | ScheduleMessageType
    | null;
  outreach_draft_id:
    | string
    | null;
  reply_to_email_message_id:
    | string
    | null;
  body: string;
  cc_emails:
    | string[]
    | null;
  bcc_emails:
    | string[]
    | null;
  attachments: unknown;
  scheduled_for: string;
  attempt_count: number;
};

type GmailConnection = {
  email_address: string;
  encrypted_refresh_token: string;
  scopes: unknown;
};

/* =========================================================
   AUTH
========================================================= */

function safeSecretEqual(
  supplied: string,
  expected: string
) {
  const suppliedBuffer =
    Buffer.from(
      supplied,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expected,
      "utf8"
    );

  if (
    suppliedBuffer.length !==
      expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    suppliedBuffer,
    expectedBuffer
  );
}

function isAuthorized(
  request: Request
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (
    !cronSecret
  ) {
    throw new Error(
      "CRON_SECRET is missing."
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return false;
  }

  const suppliedSecret =
    authorization
      .slice(
        "Bearer ".length
      )
      .trim();

  return safeSecretEqual(
    suppliedSecret,
    cronSecret
  );
}

/* =========================================================
   HELPERS
========================================================= */

function parseAttachments(
  value: unknown
): StoredAttachment[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const result:
    StoredAttachment[] =
    [];

  for (
    const item of
      value
  ) {
    if (
      typeof item !==
        "object" ||
      item ===
        null
    ) {
      continue;
    }

    const record =
      item as Record<
        string,
        unknown
      >;

    if (
      typeof record.name !==
        "string" ||
      typeof record.storagePath !==
        "string"
    ) {
      continue;
    }

    result.push({
      name:
        record.name,

      type:
        typeof record.type ===
        "string"
          ? record.type
          : "application/octet-stream",

      size:
        typeof record.size ===
        "number"
          ? record.size
          : 0,

      storagePath:
        record.storagePath,
    });
  }

  return result;
}

function errorMessage(
  error: unknown
) {
  if (
    error instanceof
      Error
  ) {
    return error.message.slice(
      0,
      2000
    );
  }

  return "UNKNOWN_ERROR";
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

function isReasonableEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

async function loadGmailConnection({
  userId,
}: {
  userId: string;
}): Promise<GmailConnection> {
  const supabase =
    createAdminClient();

  const {
    data:
      gmailConnection,
    error:
      gmailError,
  } =
    await supabase
      .from(
        "gmail_connections"
      )
      .select(`
        email_address,
        encrypted_refresh_token,
        scopes
      `)
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    gmailError ||
    !gmailConnection
  ) {
    throw new Error(
      "Gmail connection could not be loaded."
    );
  }

  const scopes =
    Array.isArray(
      gmailConnection.scopes
    )
      ? gmailConnection.scopes
      : [];

  if (
    !scopes.includes(
      GMAIL_SEND_SCOPE
    )
  ) {
    throw new Error(
      "Gmail send permission is missing."
    );
  }

  return gmailConnection as GmailConnection;
}

async function markScheduleFailed({
  scheduleId,
  error,
}: {
  scheduleId: string;
  error: unknown;
}) {
  const supabase =
    createAdminClient();

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "FAILED",

        processing_started_at:
          null,

        last_error:
          errorMessage(
            error
          ),
      })
      .eq(
        "id",
        scheduleId
      )
      .eq(
        "status",
        "PROCESSING"
      );

  if (
    updateError
  ) {
    console.error(
      `Could not mark scheduled email ${scheduleId} FAILED:`,
      updateError
    );
  }
}

async function cancelSchedule({
  scheduleId,
  reason,
}: {
  scheduleId: string;
  reason: string;
}) {
  const supabase =
    createAdminClient();

  const cancelledAt =
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
          cancelledAt,

        processing_started_at:
          null,

        last_error:
          reason,
      })
      .eq(
        "id",
        scheduleId
      )
      .eq(
        "status",
        "PROCESSING"
      );

  if (
    error
  ) {
    console.error(
      `Could not cancel scheduled email ${scheduleId}:`,
      error
    );
  }
}

async function releaseSchedule({
  scheduleId,
  reason,
}: {
  scheduleId: string;
  reason: string;
}) {
  const supabase =
    createAdminClient();

  const {
    error,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "SCHEDULED",

        processing_started_at:
          null,

        last_error:
          reason,
      })
      .eq(
        "id",
        scheduleId
      )
      .eq(
        "status",
        "PROCESSING"
      );

  if (
    error
  ) {
    console.error(
      `Could not release scheduled email ${scheduleId}:`,
      error
    );
  }
}

async function markScheduleSent({
  scheduleId,
  sentAt,
  messageId,
  threadId,
}: {
  scheduleId: string;
  sentAt: string;
  messageId: string;
  threadId:
    | string
    | null;
}) {
  const supabase =
    createAdminClient();

  const {
    error,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "SENT",

        sent_at:
          sentAt,

        processing_started_at:
          null,

        gmail_message_id:
          messageId,

        gmail_thread_id:
          threadId,

        last_error:
          null,
      })
      .eq(
        "id",
        scheduleId
      )
      .eq(
        "status",
        "PROCESSING"
      );

  if (
    error
  ) {
    console.error(
      `CRITICAL: Gmail sent schedule ${scheduleId}, but SENT state could not be stored:`,
      error
    );

    return false;
  }

  return true;
}

/* =========================================================
   PROCESS SCHEDULED REPLY
========================================================= */

async function processScheduledReply(
  schedule:
    ScheduledEmail
) {
  const supabase =
    createAdminClient();

  try {
    if (
      !schedule.reply_to_email_message_id
    ) {
      throw new Error(
        "Scheduled reply has no reply target."
      );
    }

    const {
      data:
        replyTarget,
      error:
        replyTargetError,
    } =
      await supabase
        .from(
          "email_messages"
        )
        .select(`
          gmail_message_id,
          gmail_thread_id
        `)
        .eq(
          "id",
          schedule.reply_to_email_message_id
        )
        .eq(
          "user_id",
          schedule.user_id
        )
        .eq(
          "lead_id",
          schedule.lead_id
        )
        .eq(
          "direction",
          "INCOMING"
        )
        .maybeSingle();

    if (
      replyTargetError ||
      !replyTarget
    ) {
      throw new Error(
        "Scheduled reply target could not be found."
      );
    }

    if (
      !replyTarget.gmail_message_id ||
      !replyTarget.gmail_thread_id
    ) {
      throw new Error(
        "Scheduled reply target has no Gmail identifiers."
      );
    }

    const gmailConnection =
      await loadGmailConnection({
        userId:
          schedule.user_id,
      });

    const storedAttachments =
      parseAttachments(
        schedule.attachments
      );

    const gmailAttachments:
      {
        filename: string;
        contentType: string;
        content: Buffer;
      }[] =
      [];

    for (
      const attachment of
        storedAttachments
    ) {
      const {
        data:
          fileData,
        error:
          downloadError,
      } =
        await supabase
          .storage
          .from(
            STORAGE_BUCKET
          )
          .download(
            attachment.storagePath
          );

      if (
        downloadError ||
        !fileData
      ) {
        throw new Error(
          `Could not load scheduled attachment ${attachment.name}.`
        );
      }

      const arrayBuffer =
        await fileData.arrayBuffer();

      gmailAttachments.push({
        filename:
          attachment.name,

        contentType:
          attachment.type,

        content:
          Buffer.from(
            arrayBuffer
          ),
      });
    }

    let sendResult;

    try {
      sendResult =
        await sendGmailReply({
          fromEmail:
            gmailConnection.email_address,

          body:
            schedule.body,

          encryptedRefreshToken:
            gmailConnection.encrypted_refresh_token,

          replyToGmailMessageId:
            replyTarget.gmail_message_id,

          gmailThreadId:
            replyTarget.gmail_thread_id,

          ccEmails:
            schedule.cc_emails ??
            [],

          bccEmails:
            schedule.bcc_emails ??
            [],

          attachments:
            gmailAttachments,
        });
    } catch (
      sendError
    ) {
      await markScheduleFailed({
        scheduleId:
          schedule.id,
        error:
          sendError,
      });

      console.error(
        `Scheduled Gmail reply failed for ${schedule.id}:`,
        sendError
      );

      return {
        id:
          schedule.id,
        type:
          "REPLY",
        result:
          "FAILED",
      };
    }

    const sentAt =
      new Date()
        .toISOString();

    const sentStored =
      await markScheduleSent({
        scheduleId:
          schedule.id,
        sentAt,
        messageId:
          sendResult.messageId,
        threadId:
          sendResult.threadId,
      });

    if (
      !sentStored
    ) {
      return {
        id:
          schedule.id,
        type:
          "REPLY",
        result:
          "SENT_STATE_WRITE_FAILED",
      };
    }

    const attachmentMetadata =
      storedAttachments.map(
        (
          attachment
        ) => ({
          name:
            attachment.name,
          type:
            attachment.type,
          size:
            attachment.size,
        })
      );

    const {
      error:
        messageInsertError,
    } =
      await supabase
        .from(
          "email_messages"
        )
        .upsert(
          {
            user_id:
              schedule.user_id,

            lead_id:
              schedule.lead_id,

            gmail_message_id:
              sendResult.messageId,

            gmail_thread_id:
              sendResult.threadId,

            direction:
              "OUTGOING",

            from_name:
              "Joel Cimpean",

            from_email:
              gmailConnection.email_address,

            to_email:
              sendResult.toEmail,

            cc_emails:
              schedule.cc_emails ??
              [],

            bcc_emails:
              schedule.bcc_emails ??
              [],

            subject:
              sendResult.subject,

            body_text:
              schedule.body,

            attachments:
              attachmentMetadata,

            received_at:
              sentAt,

            is_unread:
              false,

            read_at:
              sentAt,
          },
          {
            onConflict:
              "user_id,gmail_message_id",
          }
        );

    if (
      messageInsertError
    ) {
      console.error(
        `Scheduled reply ${schedule.id} was sent but could not be stored in email_messages:`,
        messageInsertError
      );
    }

    const {
      error:
        leadError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          last_contacted_at:
            sentAt,

          next_follow_up_at:
            null,
        })
        .eq(
          "id",
          schedule.lead_id
        )
        .eq(
          "user_id",
          schedule.user_id
        );

    if (
      leadError
    ) {
      console.error(
        `Scheduled reply sent but lead ${schedule.lead_id} could not be updated:`,
        leadError
      );
    }

    const {
      error:
        activityError,
    } =
      await supabase
        .from(
          "activities"
        )
        .insert({
          user_id:
            schedule.user_id,

          lead_id:
            schedule.lead_id,

          activity_type:
            "EMAIL_SENT",

          title:
            "Scheduled email sent",

          description:
            `Scheduled reply sent to ${sendResult.toEmail}.`,
        });

    if (
      activityError
    ) {
      console.error(
        "Scheduled reply sent but activity logging failed:",
        activityError
      );
    }

    const storagePaths =
      storedAttachments
        .map(
          (
            attachment
          ) =>
            attachment.storagePath
        )
        .filter(
          Boolean
        );

    if (
      storagePaths.length >
        0
    ) {
      const {
        error:
          deleteStorageError,
      } =
        await supabase
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove(
            storagePaths
          );

      if (
        deleteStorageError
      ) {
        console.error(
          `Scheduled reply ${schedule.id} was sent, but temporary attachments could not be deleted:`,
          deleteStorageError
        );
      }
    }

    return {
      id:
        schedule.id,
      type:
        "REPLY",
      result:
        "SENT",
    };
  } catch (
    error
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error,
    });

    console.error(
      `Scheduled reply ${schedule.id} failed before sending:`,
      error
    );

    return {
      id:
        schedule.id,
      type:
        "REPLY",
      result:
        "FAILED",
    };
  }
}

/* =========================================================
   PROCESS SCHEDULED INITIAL OUTREACH
========================================================= */

async function processScheduledOutreach(
  schedule:
    ScheduledEmail
) {
  const supabase =
    createAdminClient();

  if (
    !schedule.outreach_draft_id
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error:
        new Error(
          "Scheduled outreach has no outreach draft ID."
        ),
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED",
    };
  }

  const {
    data:
      draft,
    error:
      draftError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .select(`
        id,
        status,
        subject,
        body,
        follow_up_body,
        sent_at
      `)
      .eq(
        "id",
        schedule.outreach_draft_id
      )
      .eq(
        "user_id",
        schedule.user_id
      )
      .eq(
        "lead_id",
        schedule.lead_id
      )
      .maybeSingle();

  if (
    draftError ||
    !draft
  ) {
    await cancelSchedule({
      scheduleId:
        schedule.id,
      reason:
        "Scheduled outreach cancelled because its draft no longer exists.",
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "CANCELLED",
    };
  }

  if (
    draft.sent_at ||
    draft.status ===
      "SENT"
  ) {
    await cancelSchedule({
      scheduleId:
        schedule.id,
      reason:
        "Scheduled outreach cancelled because the draft was already sent.",
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "ALREADY_SENT",
    };
  }

  if (
    draft.status ===
      "SENDING"
  ) {
    await releaseSchedule({
      scheduleId:
        schedule.id,
      reason:
        "Draft is currently being sent elsewhere. The scheduled send will retry on the next worker run.",
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "DEFERRED",
    };
  }

  if (
    draft.status !==
      "DRAFT" &&
    draft.status !==
      "APPROVED"
  ) {
    await cancelSchedule({
      scheduleId:
        schedule.id,
      reason:
        `Scheduled outreach cancelled because draft status is ${draft.status}.`,
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "CANCELLED",
    };
  }

  const {
    data:
      lead,
    error:
      leadError,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,

        primary_contact:contacts (
          id,
          email
        )
      `)
      .eq(
        "id",
        schedule.lead_id
      )
      .eq(
        "user_id",
        schedule.user_id
      )
      .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error:
        new Error(
          "Lead could not be loaded for scheduled outreach."
        ),
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED",
    };
  }

  if (
    lead.status ===
      "DO_NOT_CONTACT"
  ) {
    await cancelSchedule({
      scheduleId:
        schedule.id,
      reason:
        "Scheduled outreach cancelled because the lead is Do Not Contact.",
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "CANCELLED_DNC",
    };
  }

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const recipientEmail =
    contact?.email
      ?.trim()
      .toLowerCase();

  if (
    !recipientEmail ||
    !isReasonableEmail(
      recipientEmail
    )
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error:
        new Error(
          "Lead has no valid recipient email for scheduled outreach."
        ),
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED_INVALID_EMAIL",
    };
  }

  let gmailConnection:
    GmailConnection;

  try {
    gmailConnection =
      await loadGmailConnection({
        userId:
          schedule.user_id,
      });
  } catch (
    error
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error,
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED",
    };
  }

  const originalDraftStatus =
    draft.status;

  const startedAt =
    new Date()
      .toISOString();

  const {
    data:
      claimedDraft,
    error:
      claimDraftError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "SENDING",

        sending_started_at:
          startedAt,

        send_error:
          null,
      })
      .eq(
        "id",
        draft.id
      )
      .eq(
        "user_id",
        schedule.user_id
      )
      .eq(
        "lead_id",
        schedule.lead_id
      )
      .in(
        "status",
        [
          "DRAFT",
          "APPROVED",
        ]
      )
      .is(
        "sent_at",
        null
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    claimDraftError
  ) {
    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error:
        claimDraftError,
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED",
    };
  }

  if (
    !claimedDraft
  ) {
    const {
      data:
        currentDraft,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          status,
          sent_at
        `)
        .eq(
          "id",
          draft.id
        )
        .maybeSingle();

    if (
      currentDraft?.sent_at ||
      currentDraft?.status ===
        "SENT"
    ) {
      await cancelSchedule({
        scheduleId:
          schedule.id,
        reason:
          "Scheduled outreach cancelled because the draft was already sent.",
      });

      return {
        id:
          schedule.id,
        type:
          "OUTREACH",
        result:
          "ALREADY_SENT",
      };
    }

    await releaseSchedule({
      scheduleId:
        schedule.id,
      reason:
        "Could not claim the draft because another send is in progress. Retrying on the next worker run.",
    });

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "DEFERRED",
    };
  }

  let gmailResult: {
    messageId: string;
    threadId:
      | string
      | null;
  };

  try {
    gmailResult =
      await sendGmailMessage({
        fromEmail:
          gmailConnection.email_address,

        toEmail:
          recipientEmail,

        subject:
          draft.subject.trim(),

        body:
          draft.body,

        encryptedRefreshToken:
          gmailConnection.encrypted_refresh_token,
      });
  } catch (
    sendError
  ) {
    const sendErrorText =
      errorMessage(
        sendError
      );

    const {
      error:
        restoreDraftError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .update({
          status:
            originalDraftStatus,

          sending_started_at:
            null,

          send_error:
            sendErrorText,
        })
        .eq(
          "id",
          draft.id
        )
        .eq(
          "user_id",
          schedule.user_id
        )
        .eq(
          "status",
          "SENDING"
        );

    if (
      restoreDraftError
    ) {
      console.error(
        `Could not restore outreach draft ${draft.id} after scheduled send failure:`,
        restoreDraftError
      );
    }

    await markScheduleFailed({
      scheduleId:
        schedule.id,
      error:
        sendError,
    });

    console.error(
      `Scheduled outreach Gmail send failed for ${schedule.id}:`,
      sendError
    );

    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "FAILED",
    };
  }

  /* =======================================================
     GMAIL HAS ACCEPTED THE EMAIL.

     From here on we NEVER put this schedule back into a
     retryable state. That prevents duplicate cold emails.
  ======================================================= */

  const sentAt =
    new Date()
      .toISOString();

  const sentStored =
    await markScheduleSent({
      scheduleId:
        schedule.id,
      sentAt,
      messageId:
        gmailResult.messageId,
      threadId:
        gmailResult.threadId,
    });

  if (
    !sentStored
  ) {
    /*
     * Draft intentionally remains SENDING. That is safer
     * than allowing a second manual / scheduled send.
     */
    return {
      id:
        schedule.id,
      type:
        "OUTREACH",
      result:
        "SENT_STATE_WRITE_FAILED",
    };
  }

  const {
    error:
      draftSentError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "SENT",

        sent_at:
          sentAt,

        sent_to:
          recipientEmail,

        gmail_message_id:
          gmailResult.messageId,

        gmail_thread_id:
          gmailResult.threadId,

        sending_started_at:
          null,

        send_error:
          null,
      })
      .eq(
        "id",
        draft.id
      )
      .eq(
        "user_id",
        schedule.user_id
      )
      .eq(
        "status",
        "SENDING"
      );

  if (
    draftSentError
  ) {
    console.error(
      `CRITICAL: Scheduled outreach ${schedule.id} was sent, but draft ${draft.id} could not be marked SENT:`,
      draftSentError
    );
  }

  const nextFollowUp =
    new Date(
      new Date(
        sentAt
      ).getTime() +
        FOLLOW_UP_DELAY_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  const {
    error:
      leadUpdateError,
  } =
    await supabase
      .from(
        "leads"
      )
      .update({
        status:
          "CONTACTED",

        last_contacted_at:
          sentAt,

        next_follow_up_at:
          nextFollowUp,
      })
      .eq(
        "id",
        schedule.lead_id
      )
      .eq(
        "user_id",
        schedule.user_id
      );

  if (
    leadUpdateError
  ) {
    console.error(
      `Scheduled outreach was sent, but lead ${schedule.lead_id} could not be updated:`,
      leadUpdateError
    );
  }

  const {
    error:
      messageInsertError,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .upsert(
        {
          user_id:
            schedule.user_id,

          lead_id:
            schedule.lead_id,

          outreach_draft_id:
            draft.id,

          gmail_message_id:
            gmailResult.messageId,

          gmail_thread_id:
            gmailResult.threadId ??
            gmailResult.messageId,

          direction:
            "OUTGOING",

          from_name:
            "Joel Cimpean",

          from_email:
            gmailConnection.email_address,

          to_email:
            recipientEmail,

          subject:
            draft.subject,

          body_text:
            draft.body,

          attachments:
            [],

          received_at:
            sentAt,

          is_unread:
            false,

          read_at:
            sentAt,
        },
        {
          onConflict:
            "user_id,gmail_message_id",
        }
      );

  if (
    messageInsertError
  ) {
    console.error(
      `Scheduled outreach ${schedule.id} was sent but could not be stored in email_messages:`,
      messageInsertError
    );
  }

  const {
    error:
      activityError,
  } =
    await supabase
      .from(
        "activities"
      )
      .insert({
        user_id:
          schedule.user_id,

        lead_id:
          schedule.lead_id,

        activity_type:
          "EMAIL_SENT",

        title:
          "Outreach email sent",

        description:
          `Scheduled outreach email sent to ${recipientEmail}.`,
      });

  if (
    activityError
  ) {
    console.error(
      "Scheduled outreach was sent but activity logging failed:",
      activityError
    );
  }

  return {
    id:
      schedule.id,
    type:
      "OUTREACH",
    result:
      "SENT",
  };
}

/* =========================================================
   CLAIM + DISPATCH
========================================================= */

async function processScheduledEmail(
  schedule:
    ScheduledEmail
) {
  const supabase =
    createAdminClient();

  const claimedAt =
    new Date()
      .toISOString();

  const {
    data:
      claimed,
    error:
      claimError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "PROCESSING",

        processing_started_at:
          claimedAt,

        attempt_count:
          (schedule.attempt_count ??
            0) +
          1,

        last_error:
          null,
      })
      .eq(
        "id",
        schedule.id
      )
      .eq(
        "status",
        "SCHEDULED"
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    claimError
  ) {
    console.error(
      `Could not claim scheduled email ${schedule.id}:`,
      claimError
    );

    return {
      id:
        schedule.id,
      result:
        "CLAIM_FAILED",
    };
  }

  if (
    !claimed
  ) {
    return {
      id:
        schedule.id,
      result:
        "ALREADY_CLAIMED",
    };
  }

  const messageType:
    ScheduleMessageType =
      schedule.message_type ===
        "OUTREACH"
        ? "OUTREACH"
        : "REPLY";

  if (
    messageType ===
      "OUTREACH"
  ) {
    return await processScheduledOutreach(
      schedule
    );
  }

  return await processScheduledReply(
    schedule
  );
}

/* =========================================================
   WORKER
========================================================= */

async function runWorker() {
  const supabase =
    createAdminClient();

  const now =
    new Date()
      .toISOString();

  const {
    data:
      dueEmails,
    error:
      dueError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .select(`
        id,
        user_id,
        lead_id,
        message_type,
        outreach_draft_id,
        reply_to_email_message_id,
        body,
        cc_emails,
        bcc_emails,
        attachments,
        scheduled_for,
        attempt_count
      `)
      .eq(
        "status",
        "SCHEDULED"
      )
      .lte(
        "scheduled_for",
        now
      )
      .order(
        "scheduled_for",
        {
          ascending:
            true,
        }
      )
      .limit(
        MAX_EMAILS_PER_RUN
      );

  if (
    dueError
  ) {
    throw new Error(
      `Could not load due scheduled emails: ${dueError.message}`
    );
  }

  const results =
    [];

  for (
    const schedule of
      (
        dueEmails ??
        []
      ) as ScheduledEmail[]
  ) {
    const result =
      await processScheduledEmail(
        schedule
      );

    results.push(
      result
    );
  }

  return {
    checked:
      dueEmails
        ?.length ??
      0,

    results,
  };
}

/* =========================================================
   ROUTE

   POST keeps your existing/manual worker calls working.
   GET makes the same endpoint compatible with Vercel Cron.
========================================================= */

async function handleWorkerRequest(
  request: Request
) {
  try {
    if (
      !isAuthorized(
        request
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,
          error:
            "Unauthorized.",
        },
        {
          status:
            401,
        }
      );
    }

    const result =
      await runWorker();

    return NextResponse.json({
      ok:
        true,
      ...result,
    });
  } catch (
    error
  ) {
    console.error(
      "Scheduled email worker failed:",
      error
    );

    return NextResponse.json(
      {
        ok:
          false,
        error:
          errorMessage(
            error
          ),
      },
      {
        status:
          500,
      }
    );
  }
}

export async function GET(
  request: Request
) {
  return handleWorkerRequest(
    request
  );
}

export async function POST(
  request: Request
) {
  return handleWorkerRequest(
    request
  );
}
