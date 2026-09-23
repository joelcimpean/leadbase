import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   CONFIG
========================================================= */

const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

const STORAGE_BUCKET =
  "scheduled-email-attachments";

const MAX_ATTACHMENTS = 8;

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const MAX_TOTAL_ATTACHMENT_SIZE =
  12 * 1024 * 1024;

const MAX_SCHEDULE_DAYS = 180;

const OUTREACH_SIGNATURE = [
  "Mit freundlichen Grüßen / Kind regards,",
  "",
  "Joel Cimpean",
  "hello@joelcimpean.com / joelcimpean.com",
].join("\n");

const SIGNATURE_MARKER =
  "Mit freundlichen Grüßen / Kind regards,";

/* =========================================================
   TYPES
========================================================= */

type AttachmentRequest = {
  filename: string;
  contentType: string;
  size: number;
  base64: string;
};

type ScheduleReplyRequest = {
  leadId?: unknown;
  replyToMessageId?: unknown;
  replyToGmailMessageId?: unknown;
  gmailThreadId?: unknown;

  body?: unknown;

  cc?: unknown;
  bcc?: unknown;

  scheduledFor?: unknown;

  attachments?: unknown;
};

type UpdateScheduleRequest = {
  id?: unknown;

  body?: unknown;

  cc?: unknown;
  bcc?: unknown;

  scheduledFor?: unknown;
};

type StoredAttachment = {
  name: string;
  type: string;
  size: number;
  storagePath: string;
};

type ScheduleRow = {
  id: string;

  lead_id: string;

  status: string;

  body: string;

  cc_emails:
    | string[]
    | null;

  bcc_emails:
    | string[]
    | null;

  attachments: unknown;

  scheduled_for: string;

  cancelled_at:
    | string
    | null;

  cancel_reason:
    | string
    | null;

  last_error:
    | string
    | null;

  created_at: string;
};

/* =========================================================
   RESPONSE
========================================================= */

function jsonError(
  error: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    {
      status,
    }
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function normalizeMessage(
  value: string
) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeExistingSignature(
  value: string
) {
  const normalized =
    normalizeMessage(
      value
    );

  const index =
    normalized.indexOf(
      SIGNATURE_MARKER
    );

  if (
    index === -1
  ) {
    return normalized;
  }

  return normalized
    .slice(
      0,
      index
    )
    .trim();
}

function ensureSignature(
  value: string
) {
  const message =
    removeExistingSignature(
      value
    );

  return `${message}\n\n${OUTREACH_SIGNATURE}`;
}

/* =========================================================
   EMAIL
========================================================= */

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function parseEmailList(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return {
      emails: [] as string[],
      invalid: [] as string[],
    };
  }

  const unique =
    Array.from(
      new Set(
        value
          .split(/[,;\n]+/)
          .map(
            (item) =>
              item
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      )
    );

  return {
    emails:
      unique.filter(
        isValidEmail
      ),

    invalid:
      unique.filter(
        (email) =>
          !isValidEmail(
            email
          )
      ),
  };
}

/* =========================================================
   FILE HELPERS
========================================================= */

function sanitizeFilename(
  value: string
) {
  const cleaned =
    value
      .replace(
        /[\/\\\r\n]/g,
        "_"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return (
    cleaned ||
    "attachment"
  );
}

function parseAttachments(
  value: unknown
) {
  if (
    value === undefined ||
    value === null
  ) {
    return {
      ok: true as const,

      attachments: [] as {
        filename: string;
        contentType: string;
        size: number;
        content: Buffer;
      }[],
    };
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    return {
      ok: false as const,
      error: "Invalid attachments.",
    };
  }

  if (
    value.length >
    MAX_ATTACHMENTS
  ) {
    return {
      ok: false as const,

      error:
        `You can attach up to ${MAX_ATTACHMENTS} files.`,
    };
  }

  const attachments: {
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }[] = [];

  let totalSize = 0;

  for (
    const item of value
  ) {
    if (
      typeof item !==
        "object" ||
      item === null
    ) {
      return {
        ok: false as const,
        error: "Invalid attachment.",
      };
    }

    const attachment =
      item as Partial<AttachmentRequest>;

    if (
      typeof attachment.filename !==
        "string" ||
      !attachment.filename.trim() ||
      typeof attachment.contentType !==
        "string" ||
      typeof attachment.size !==
        "number" ||
      !Number.isFinite(
        attachment.size
      ) ||
      typeof attachment.base64 !==
        "string"
    ) {
      return {
        ok: false as const,

        error:
          "Invalid attachment data.",
      };
    }

    if (
      attachment.size <= 0
    ) {
      return {
        ok: false as const,

        error:
          `${attachment.filename} is empty.`,
      };
    }

    if (
      attachment.size >
      MAX_FILE_SIZE
    ) {
      return {
        ok: false as const,

        error:
          `${attachment.filename} is larger than 8 MB.`,
      };
    }

    const content =
      Buffer.from(
        attachment.base64,
        "base64"
      );

    if (
      content.length !==
      attachment.size
    ) {
      return {
        ok: false as const,

        error:
          `${attachment.filename} could not be validated.`,
      };
    }

    totalSize +=
      content.length;

    if (
      totalSize >
      MAX_TOTAL_ATTACHMENT_SIZE
    ) {
      return {
        ok: false as const,

        error:
          "Attachments may be up to 12 MB in total.",
      };
    }

    attachments.push({
      filename:
        sanitizeFilename(
          attachment.filename
        ),

      contentType:
        attachment.contentType ||
        "application/octet-stream",

      size:
        content.length,

      content,
    });
  }

  return {
    ok: true as const,
    attachments,
  };
}

function parseStoredAttachments(
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
    const item of value
  ) {
    if (
      typeof item !==
        "object" ||
      item === null
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
        typeof record.storagePath ===
        "string"
          ? record.storagePath
          : "",
    });
  }

  return result;
}

/* =========================================================
   SCHEDULE
========================================================= */

function validateSchedule(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const date =
    new Date(
      value
    );

  const timestamp =
    date.getTime();

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return null;
  }

  const now =
    Date.now();

  if (
    timestamp <
    now + 30_000
  ) {
    return null;
  }

  const max =
    now +
    MAX_SCHEDULE_DAYS *
      24 *
      60 *
      60 *
      1000;

  if (
    timestamp >
    max
  ) {
    return null;
  }

  return date;
}

function serializeSchedule(
  schedule: ScheduleRow
) {
  const attachments =
    parseStoredAttachments(
      schedule.attachments
    );

  return {
    id:
      schedule.id,

    status:
      schedule.status,

    body:
      removeExistingSignature(
        schedule.body
      ),

    ccEmails:
      schedule.cc_emails ??
      [],

    bccEmails:
      schedule.bcc_emails ??
      [],

    attachments:
      attachments.map(
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
      ),

    scheduledFor:
      schedule.scheduled_for,

    cancelledAt:
      schedule.cancelled_at,

    cancelReason:
      schedule.cancel_reason,

    lastError:
      schedule.last_error,

    createdAt:
      schedule.created_at,
  };
}

/* =========================================================
   GET CURRENT / LATEST SCHEDULE
========================================================= */

export async function GET(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    const url =
      new URL(
        request.url
      );

    const leadId =
      url.searchParams.get(
        "leadId"
      );

    if (
      !leadId
    ) {
      return jsonError(
        "leadId is required."
      );
    }

    const {
      data:
        schedule,

      error:
        scheduleError,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .select(`
          id,
          lead_id,
          status,
          body,
          cc_emails,
          bcc_emails,
          attachments,
          scheduled_for,
          cancelled_at,
          cancel_reason,
          last_error,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        )
        .order(
          "created_at",
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
      scheduleError
    ) {
      console.error(
        "Could not load scheduled reply:",
        scheduleError
      );

      return jsonError(
        "Could not load scheduled reply.",
        500
      );
    }

    if (
      !schedule ||
      schedule.status ===
        "SENT"
    ) {
      return NextResponse.json({
        ok:
          true,

        schedule:
          null,
      });
    }

    /*
     * Do not keep showing an old cancelled schedule forever
     * after Joel has already sent a newer manual reply.
     */
    if (
      schedule.status ===
        "CANCELLED" &&
      schedule.cancelled_at
    ) {
      const {
        data:
          newerOutgoing,
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
            "OUTGOING"
          )
          .gt(
            "received_at",
            schedule.cancelled_at
          )
          .limit(
            1
          )
          .maybeSingle();

      if (
        newerOutgoing
      ) {
        return NextResponse.json({
          ok:
            true,

          schedule:
            null,
        });
      }
    }

    return NextResponse.json({
      ok:
        true,

      schedule:
        serializeSchedule(
          schedule as ScheduleRow
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Load scheduled reply failed:",
      error
    );

    return jsonError(
      "Could not load scheduled reply.",
      500
    );
  }
}

/* =========================================================
   POST — CREATE SCHEDULE
========================================================= */

export async function POST(
  request: Request
) {
  const uploadedPaths:
    string[] = [];

  let createdScheduleId:
    string | null =
    null;

  try {
    let payload:
      ScheduleReplyRequest;

    try {
      payload =
        await request.json();
    } catch {
      return jsonError(
        "Invalid JSON request."
      );
    }

    if (
      typeof payload.leadId !==
        "string" ||
      !payload.leadId ||
      typeof payload.body !==
        "string"
    ) {
      return jsonError(
        "Invalid schedule request."
      );
    }

    const leadId =
      payload.leadId;

    const replyToMessageId =
      typeof payload.replyToMessageId === "string" && payload.replyToMessageId
        ? payload.replyToMessageId
        : null;

    const replyToGmailMessageId =
      typeof payload.replyToGmailMessageId === "string" && payload.replyToGmailMessageId
        ? payload.replyToGmailMessageId
        : null;

    const directGmailThreadId =
      typeof payload.gmailThreadId === "string" && payload.gmailThreadId
        ? payload.gmailThreadId
        : null;

    if (!replyToMessageId && !(replyToGmailMessageId && directGmailThreadId)) {
      return jsonError("No reply target was provided.");
    }

    const body =
      normalizeMessage(
        payload.body
      );

    if (
      !body
    ) {
      return jsonError(
        "Write a message before scheduling."
      );
    }

    const scheduledDate =
      validateSchedule(
        payload.scheduledFor
      );

    if (
      !scheduledDate
    ) {
      return jsonError(
        "Choose a valid future send time."
      );
    }

    const scheduledFor =
      scheduledDate
        .toISOString();

    const parsedCc =
      parseEmailList(
        payload.cc
      );

    const parsedBcc =
      parseEmailList(
        payload.bcc
      );

    const invalidAddresses = [
      ...parsedCc.invalid,
      ...parsedBcc.invalid,
    ];

    if (
      invalidAddresses.length >
      0
    ) {
      return jsonError(
        `Invalid email address: ${invalidAddresses.join(
          ", "
        )}`
      );
    }

    const attachmentResult =
      parseAttachments(
        payload.attachments
      );

    if (
      !attachmentResult.ok
    ) {
      return jsonError(
        attachmentResult.error
      );
    }

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    let resolvedReplyToMessageId = replyToMessageId;
    let virtualTarget: {
      outreachDraftId: string;
      gmailMessageId: string;
      gmailThreadId: string;
      recipientEmail: string;
      subject: string;
      body: string;
      sentAt: string;
    } | null = null;

    if (replyToMessageId) {
      const { data: replyTarget, error: replyTargetError } = await supabase
        .from("email_messages")
        .select(`id, lead_id, gmail_message_id, gmail_thread_id, direction`)
        .eq("id", replyToMessageId)
        .eq("lead_id", leadId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (replyTargetError) {
        console.error("Could not verify scheduled reply target:", replyTargetError);
        return jsonError("Could not verify the email being replied to.", 500);
      }

      if (!replyTarget) resolvedReplyToMessageId = null;
    }

    if (!resolvedReplyToMessageId && replyToGmailMessageId && directGmailThreadId) {
      const { data: draftTarget, error: draftTargetError } = await supabase
        .from("outreach_drafts")
        .select(`
          id, subject, body, sent_at, sent_to, gmail_message_id, gmail_thread_id,
          follow_up_body, follow_up_sent_at, follow_up_sent_to,
          gmail_follow_up_message_id, gmail_follow_up_thread_id
        `)
        .eq("user_id", user.id)
        .eq("lead_id", leadId)
        .eq("status", "SENT")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftTargetError) {
        console.error("Could not verify scheduled outreach target:", draftTargetError);
        return jsonError("Could not verify the outreach thread.", 500);
      }

      const isInitial = draftTarget?.gmail_message_id === replyToGmailMessageId && draftTarget?.gmail_thread_id === directGmailThreadId;
      const isFollowUp = draftTarget?.gmail_follow_up_message_id === replyToGmailMessageId && draftTarget?.gmail_follow_up_thread_id === directGmailThreadId;
      const recipientEmail = isFollowUp ? (draftTarget?.follow_up_sent_to ?? draftTarget?.sent_to) : draftTarget?.sent_to;
      const sourceBody = isFollowUp ? draftTarget?.follow_up_body : draftTarget?.body;
      const sentAt = isFollowUp ? draftTarget?.follow_up_sent_at : draftTarget?.sent_at;

      if (draftTarget && (isInitial || isFollowUp) && recipientEmail && sourceBody && sentAt) {
        virtualTarget = {
          outreachDraftId: draftTarget.id,
          gmailMessageId: replyToGmailMessageId,
          gmailThreadId: directGmailThreadId,
          recipientEmail,
          subject: draftTarget.subject ?? "",
          body: sourceBody,
          sentAt,
        };
      }
    }

    if (!resolvedReplyToMessageId && !virtualTarget) {
      return jsonError("The email being replied to could not be found.", 404);
    }

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
        .select(
          "email_address, scopes"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      gmailError ||
      !gmailConnection
    ) {
      return jsonError(
        "Gmail is not connected."
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
      return jsonError(
        "Gmail send permission is missing.",
        403
      );
    }

    if (!resolvedReplyToMessageId && virtualTarget) {
      const { data: materializedTarget, error: materializeError } = await supabase
        .from("email_messages")
        .upsert(
          {
            user_id: user.id,
            lead_id: leadId,
            outreach_draft_id: virtualTarget.outreachDraftId,
            gmail_message_id: virtualTarget.gmailMessageId,
            gmail_thread_id: virtualTarget.gmailThreadId,
            direction: "OUTGOING",
            from_name: "Joel Cimpean",
            from_email: gmailConnection.email_address,
            to_email: virtualTarget.recipientEmail,
            subject: virtualTarget.subject,
            body_text: virtualTarget.body,
            attachments: [],
            received_at: virtualTarget.sentAt,
            is_unread: false,
            read_at: virtualTarget.sentAt,
          },
          { onConflict: "user_id,gmail_message_id" }
        )
        .select("id")
        .single();

      if (materializeError || !materializedTarget) {
        console.error("Could not materialize scheduled outreach target:", materializeError);
        return jsonError("Could not prepare the outreach thread for scheduling.", 500);
      }

      resolvedReplyToMessageId = materializedTarget.id;
    }

    const {
      data:
        existingSchedule,

      error:
        existingScheduleError,
    } =
      await supabase
        .from(
          "scheduled_emails"
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
        .in(
          "status",
          [
            "SCHEDULED",
            "PROCESSING",
          ]
        )
        .limit(
          1
        )
        .maybeSingle();

    if (
      existingScheduleError
    ) {
      console.error(
        "Could not check existing schedules:",
        existingScheduleError
      );

      return jsonError(
        "Could not check existing scheduled emails.",
        500
      );
    }

    if (
      existingSchedule
    ) {
      return jsonError(
        "This lead already has a scheduled reply.",
        409
      );
    }

    const fullBody =
      ensureSignature(
        body
      );

    const {
      data:
        createdSchedule,

      error:
        scheduleError,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .insert({
          user_id:
            user.id,

          lead_id:
            leadId,

          reply_to_email_message_id:
            resolvedReplyToMessageId,

          status:
            "SCHEDULED",

          body:
            fullBody,

          cc_emails:
            parsedCc.emails,

          bcc_emails:
            parsedBcc.emails,

          attachments:
            [],

          scheduled_for:
            scheduledFor,

          cancel_reason:
            null,

          last_error:
            null,
        })
        .select(`
          id,
          lead_id,
          status,
          body,
          cc_emails,
          bcc_emails,
          attachments,
          scheduled_for,
          cancelled_at,
          cancel_reason,
          last_error,
          created_at
        `)
        .single();

    if (
      scheduleError ||
      !createdSchedule
    ) {
      console.error(
        "Could not create scheduled email:",
        scheduleError
      );

      return jsonError(
        "Could not schedule the email.",
        500
      );
    }

    createdScheduleId =
      createdSchedule.id;

    const storedAttachments:
      StoredAttachment[] =
      [];

    for (
      const [
        index,
        attachment,
      ] of
        attachmentResult
          .attachments
          .entries()
    ) {
      const uniquePart =
        crypto.randomUUID();

      const storagePath =
        `${user.id}/${createdSchedule.id}/${index}-${uniquePart}-${attachment.filename}`;

      const {
        error:
          uploadError,
      } =
        await supabase
          .storage
          .from(
            STORAGE_BUCKET
          )
          .upload(
            storagePath,
            attachment.content,
            {
              contentType:
                attachment.contentType,

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          `Could not upload ${attachment.filename}: ${uploadError.message}`
        );
      }

      uploadedPaths.push(
        storagePath
      );

      storedAttachments.push({
        name:
          attachment.filename,

        type:
          attachment.contentType,

        size:
          attachment.size,

        storagePath,
      });
    }

    let finalSchedule =
      createdSchedule;

    if (
      storedAttachments.length >
      0
    ) {
      const {
        data:
          updatedSchedule,

        error:
          attachmentUpdateError,
      } =
        await supabase
          .from(
            "scheduled_emails"
          )
          .update({
            attachments:
              storedAttachments,
          })
          .eq(
            "id",
            createdSchedule.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select(`
            id,
            lead_id,
            status,
            body,
            cc_emails,
            bcc_emails,
            attachments,
            scheduled_for,
            cancelled_at,
            cancel_reason,
            last_error,
            created_at
          `)
          .single();

      if (
        attachmentUpdateError ||
        !updatedSchedule
      ) {
        throw new Error(
          `Could not save attachment metadata: ${
            attachmentUpdateError?.message ??
            "Unknown error"
          }`
        );
      }

      finalSchedule =
        updatedSchedule;
    }

    return NextResponse.json({
      ok:
        true,

      id:
        finalSchedule.id,

      scheduledFor:
        finalSchedule.scheduled_for,

      schedule:
        serializeSchedule(
          finalSchedule as ScheduleRow
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Schedule reply endpoint failed:",
      error
    );

    try {
      const supabase =
        await createClient();

      if (
        uploadedPaths.length >
        0
      ) {
        await supabase
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove(
            uploadedPaths
          );
      }

      if (
        createdScheduleId
      ) {
        await supabase
          .from(
            "scheduled_emails"
          )
          .delete()
          .eq(
            "id",
            createdScheduleId
          );
      }
    } catch (
      cleanupError
    ) {
      console.error(
        "Scheduled email cleanup failed:",
        cleanupError
      );
    }

    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not schedule the reply.",
      500
    );
  }
}

/* =========================================================
   PATCH — EDIT / RESCHEDULE
========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    let payload:
      UpdateScheduleRequest;

    try {
      payload =
        await request.json();
    } catch {
      return jsonError(
        "Invalid JSON request."
      );
    }

    if (
      typeof payload.id !==
        "string" ||
      !payload.id ||
      typeof payload.body !==
        "string"
    ) {
      return jsonError(
        "Invalid update request."
      );
    }

    const body =
      normalizeMessage(
        payload.body
      );

    if (
      !body
    ) {
      return jsonError(
        "Write a message before saving."
      );
    }

    const scheduledDate =
      validateSchedule(
        payload.scheduledFor
      );

    if (
      !scheduledDate
    ) {
      return jsonError(
        "Choose a valid future send time."
      );
    }

    const parsedCc =
      parseEmailList(
        payload.cc
      );

    const parsedBcc =
      parseEmailList(
        payload.bcc
      );

    const invalidAddresses = [
      ...parsedCc.invalid,
      ...parsedBcc.invalid,
    ];

    if (
      invalidAddresses.length >
      0
    ) {
      return jsonError(
        `Invalid email address: ${invalidAddresses.join(
          ", "
        )}`
      );
    }

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    const {
      data:
        updatedSchedule,

      error:
        updateError,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .update({
          body:
            ensureSignature(
              body
            ),

          cc_emails:
            parsedCc.emails,

          bcc_emails:
            parsedBcc.emails,

          scheduled_for:
            scheduledDate.toISOString(),

          last_error:
            null,
        })
        .eq(
          "id",
          payload.id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "SCHEDULED"
        )
        .select(`
          id,
          lead_id,
          status,
          body,
          cc_emails,
          bcc_emails,
          attachments,
          scheduled_for,
          cancelled_at,
          cancel_reason,
          last_error,
          created_at
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Could not update scheduled reply:",
        updateError
      );

      return jsonError(
        "Could not update the scheduled reply.",
        500
      );
    }

    if (
      !updatedSchedule
    ) {
      return jsonError(
        "This scheduled reply can no longer be edited because it is already being processed, sent, or cancelled.",
        409
      );
    }

    return NextResponse.json({
      ok:
        true,

      schedule:
        serializeSchedule(
          updatedSchedule as ScheduleRow
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Update scheduled reply failed:",
      error
    );

    return jsonError(
      "Could not update the scheduled reply.",
      500
    );
  }
}

/* =========================================================
   DELETE — CANCEL
========================================================= */

export async function DELETE(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    const url =
      new URL(
        request.url
      );

    const id =
      url.searchParams.get(
        "id"
      );

    if (
      !id
    ) {
      return jsonError(
        "Scheduled reply ID is required."
      );
    }

    const {
      data:
        existingSchedule,

      error:
        scheduleError,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .select(`
          id,
          lead_id,
          status,
          body,
          cc_emails,
          bcc_emails,
          attachments,
          scheduled_for,
          cancelled_at,
          cancel_reason,
          last_error,
          created_at
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      scheduleError
    ) {
      console.error(
        "Could not load scheduled reply for cancellation:",
        scheduleError
      );

      return jsonError(
        "Could not load the scheduled reply.",
        500
      );
    }

    if (
      !existingSchedule
    ) {
      return jsonError(
        "Scheduled reply not found.",
        404
      );
    }

    if (
      existingSchedule.status !==
        "SCHEDULED"
    ) {
      return jsonError(
        "This scheduled reply can no longer be cancelled.",
        409
      );
    }

    const cancelledAt =
      new Date()
        .toISOString();

    const {
      data:
        cancelledSchedule,

      error:
        cancelError,
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

          cancel_reason:
            "MANUAL",

          processing_started_at:
            null,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "SCHEDULED"
        )
        .select(`
          id,
          lead_id,
          status,
          body,
          cc_emails,
          bcc_emails,
          attachments,
          scheduled_for,
          cancelled_at,
          cancel_reason,
          last_error,
          created_at
        `)
        .maybeSingle();

    if (
      cancelError
    ) {
      console.error(
        "Could not cancel scheduled reply:",
        cancelError
      );

      return jsonError(
        "Could not cancel the scheduled reply.",
        500
      );
    }

    if (
      !cancelledSchedule
    ) {
      return jsonError(
        "The scheduled reply was already claimed by the worker and can no longer be cancelled.",
        409
      );
    }

    const storedAttachments =
      parseStoredAttachments(
        existingSchedule.attachments
      );

    const storagePaths =
      storedAttachments
        .map(
          (
            attachment
          ) =>
            attachment.storagePath
        )
        .filter(Boolean);

    if (
      storagePaths.length >
      0
    ) {
      const {
        error:
          storageError,
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
        storageError
      ) {
        console.error(
          "Scheduled reply was cancelled but temporary attachments could not be deleted:",
          storageError
        );
      }
    }

    return NextResponse.json({
      ok:
        true,

      schedule:
        serializeSchedule(
          cancelledSchedule as ScheduleRow
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Cancel scheduled reply failed:",
      error
    );

    return jsonError(
      "Could not cancel the scheduled reply.",
      500
    );
  }
}