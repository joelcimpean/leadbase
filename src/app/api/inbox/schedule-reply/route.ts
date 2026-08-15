import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  const GMAIL_SEND_SCOPE =
    "https://www.googleapis.com/auth/gmail.send";
  
  const STORAGE_BUCKET =
    "scheduled-email-attachments";
  
  const MAX_ATTACHMENTS =
    8;
  
  const MAX_FILE_SIZE =
    8 * 1024 * 1024;
  
  const MAX_TOTAL_ATTACHMENT_SIZE =
    12 * 1024 * 1024;
  
  const MAX_SCHEDULE_DAYS =
    180;
  
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
  
    body?: unknown;
  
    cc?: unknown;
    bcc?: unknown;
  
    scheduledFor?: unknown;
  
    attachments?: unknown;
  };
  
  type StoredAttachment = {
    name: string;
    type: string;
    size: number;
    storagePath: string;
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
  
    let totalSize =
      0;
  
    for (
      const item of
        value
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
        attachment.size <=
        0
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
  
    /*
     * Require at least roughly one minute in the future.
     */
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
  
  /* =========================================================
     POST
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
      /* =====================================================
         JSON
      ===================================================== */
  
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
  
      /* =====================================================
         BASIC INPUT
      ===================================================== */
  
      if (
        typeof payload.leadId !==
          "string" ||
        !payload.leadId ||
        typeof payload.replyToMessageId !==
          "string" ||
        !payload.replyToMessageId ||
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
        payload.replyToMessageId;
  
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
  
      /* =====================================================
         SCHEDULE TIME
      ===================================================== */
  
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
  
      /* =====================================================
         CC / BCC
      ===================================================== */
  
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
  
      /* =====================================================
         ATTACHMENTS
      ===================================================== */
  
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
  
      /* =====================================================
         AUTH
      ===================================================== */
  
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
  
      /* =====================================================
         VERIFY REPLY TARGET
      ===================================================== */
  
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
            id,
            lead_id,
            gmail_message_id,
            gmail_thread_id
          `)
          .eq(
            "id",
            replyToMessageId
          )
          .eq(
            "lead_id",
            leadId
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "direction",
            "INCOMING"
          )
          .maybeSingle();
  
      if (
        replyTargetError
      ) {
        console.error(
          "Could not verify scheduled reply target:",
          replyTargetError
        );
  
        return jsonError(
          "Could not verify the email being replied to.",
          500
        );
      }
  
      if (
        !replyTarget
      ) {
        return jsonError(
          "The email being replied to could not be found.",
          404
        );
      }
  
      /* =====================================================
         GMAIL CONNECTION
      ===================================================== */
  
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
            scopes
          `)
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
  
      /* =====================================================
         ONLY ONE ACTIVE SCHEDULE PER LEAD FOR NOW
      ===================================================== */
  
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
          .select(`
            id,
            scheduled_for
          `)
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
  
      /* =====================================================
         CREATE SCHEDULE FIRST
  
         This gives us the UUID needed for the private
         Storage path.
      ===================================================== */
  
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
              replyToMessageId,
  
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
          })
          .select(`
            id,
            scheduled_for
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
  
      /* =====================================================
         UPLOAD ATTACHMENTS
      ===================================================== */
  
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
  
      /* =====================================================
         SAVE ATTACHMENT METADATA
      ===================================================== */
  
      if (
        storedAttachments.length >
        0
      ) {
        const {
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
              user.id);
  
        if (
          attachmentUpdateError
        ) {
          throw new Error(
            `Could not save attachment metadata: ${attachmentUpdateError.message}`
          );
        }
      }
  
      /* =====================================================
         SUCCESS
      ===================================================== */
  
      return NextResponse.json({
        ok:
          true,
  
        id:
          createdSchedule.id,
  
        scheduledFor:
          createdSchedule.scheduled_for,
  
        attachments:
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
          ),
      });
    } catch (error) {
      console.error(
        "Schedule reply endpoint failed:",
        error
      );
  
      /*
       * Cleanup partially uploaded files / DB row.
       */
  
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