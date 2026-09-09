import {
    revalidatePath,
  } from "next/cache";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    sendGmailReply,
    sendGmailThreadFollowUp,
  } from "@/lib/gmail-send";
  
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
  
  const MAX_ATTACHMENTS =
    8;
  
  const MAX_FILE_SIZE =
    8 * 1024 * 1024;
  
  const MAX_TOTAL_ATTACHMENT_SIZE =
    12 * 1024 * 1024;
  
  const OUTREACH_SIGNATURE = [
    "Mit freundlichen Grüßen / Kind regards,",
    "",
    "Joel Cimpean",
    "hello@joelcimpean.com / joelcimpean.com",
  ].join(
    "\n"
  );
  
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
  
  type ReplyRequest = {
    leadId?: unknown;
  
    replyToMessageId?: unknown;

    replyToGmailMessageId?: unknown;

    gmailThreadId?: unknown;
  
    body?: unknown;
  
    cc?: unknown;
  
    bcc?: unknown;
  
    attachments?: unknown;
  };
  
  /* =========================================================
     RESPONSE
  ========================================================= */
  
  function jsonError(
    message: string,
    status = 400
  ) {
    return NextResponse.json(
      {
        ok:
          false,
  
        error:
          message,
      },
      {
        status,
      }
    );
  }
  
  /* =========================================================
     MESSAGE HELPERS
  ========================================================= */
  
  function normalizeMessage(
    value: string
  ) {
    return value
      .replace(
        /\r\n/g,
        "\n"
      )
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
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
     EMAIL HELPERS
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
        emails:
          [] as string[],
  
        invalid:
          [] as string[],
      };
    }
  
    const values =
      value
        .split(
          /[,;\n]+/
        )
        .map(
          (item) =>
            item
              .trim()
              .toLowerCase()
        )
        .filter(Boolean);
  
    const uniqueValues =
      Array.from(
        new Set(
          values
        )
      );
  
    return {
      emails:
        uniqueValues.filter(
          isValidEmail
        ),
  
      invalid:
        uniqueValues.filter(
          (email) =>
            !isValidEmail(
              email
            )
        ),
    };
  }
  
  /* =========================================================
     ATTACHMENTS
  ========================================================= */
  
  function parseAttachments(
    value: unknown
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return {
        ok:
          true as const,
  
        attachments:
          [] as {
            filename: string;
            contentType: string;
            content: Buffer;
          }[],
  
        metadata:
          [] as {
            name: string;
            type: string;
            size: number;
          }[],
      };
    }
  
    if (
      !Array.isArray(
        value
      )
    ) {
      return {
        ok:
          false as const,
  
        error:
          "Invalid attachments.",
      };
    }
  
    if (
      value.length >
      MAX_ATTACHMENTS
    ) {
      return {
        ok:
          false as const,
  
        error:
          `You can attach up to ${MAX_ATTACHMENTS} files.`,
      };
    }
  
    const attachments: {
      filename: string;
      contentType: string;
      content: Buffer;
    }[] = [];
  
    const metadata: {
      name: string;
      type: string;
      size: number;
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
          ok:
            false as const,
  
          error:
            "Invalid attachment.",
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
          ok:
            false as const,
  
          error:
            "Invalid attachment data.",
        };
      }
  
      if (
        attachment.size <=
        0
      ) {
        return {
          ok:
            false as const,
  
          error:
            `${attachment.filename} is empty.`,
        };
      }
  
      if (
        attachment.size >
        MAX_FILE_SIZE
      ) {
        return {
          ok:
            false as const,
  
          error:
            `${attachment.filename} is larger than 8 MB.`,
        };
      }
  
      let content:
        Buffer;
  
      try {
        content =
          Buffer.from(
            attachment.base64,
            "base64"
          );
      } catch {
        return {
          ok:
            false as const,
  
          error:
            `Could not decode ${attachment.filename}.`,
        };
      }
  
      if (
        content.length !==
        attachment.size
      ) {
        return {
          ok:
            false as const,
  
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
          ok:
            false as const,
  
          error:
            "Attachments may be up to 12 MB in total.",
        };
      }
  
      attachments.push({
        filename:
          attachment.filename,
  
        contentType:
          attachment.contentType ||
          "application/octet-stream",
  
        content,
      });
  
      metadata.push({
        name:
          attachment.filename,
  
        type:
          attachment.contentType ||
          "application/octet-stream",
  
        size:
          content.length,
      });
    }
  
    return {
      ok:
        true as const,
  
      attachments,
  
      metadata,
    };
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST(
    request: Request
  ) {
    try {
      /* =====================================================
         IMPORTANT
  
         JSON instead of multipart/form-data.
      ===================================================== */
  
      let payload:
        ReplyRequest;
  
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
        typeof payload.body !==
          "string"
      ) {
        return jsonError(
          "Invalid reply request."
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
          "Write a message before sending."
        );
      }
  
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
         REPLY TARGET
      ===================================================== */
  
      let replyTarget: {
        outreach_draft_id: string | null;
        gmail_message_id: string;
        gmail_thread_id: string;
        direction: "INCOMING" | "OUTGOING";
        to_email: string | null;
      } | null = null;

      if (replyToMessageId) {
        const { data: storedTarget, error: replyTargetError } = await supabase
          .from("email_messages")
          .select(`
            id,
            lead_id,
            outreach_draft_id,
            gmail_message_id,
            gmail_thread_id,
            direction,
            to_email
          `)
          .eq("id", replyToMessageId)
          .eq("lead_id", leadId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (replyTargetError) {
          console.error("Could not load reply target:", replyTargetError);
          return jsonError(`Could not load reply target: ${replyTargetError.message}`, 500);
        }

        if (storedTarget?.gmail_message_id && storedTarget.gmail_thread_id &&
            (storedTarget.direction === "INCOMING" || storedTarget.direction === "OUTGOING")) {
          replyTarget = {
            outreach_draft_id: storedTarget.outreach_draft_id ?? null,
            gmail_message_id: storedTarget.gmail_message_id,
            gmail_thread_id: storedTarget.gmail_thread_id,
            direction: storedTarget.direction,
            to_email: storedTarget.to_email ?? null,
          };
        }
      }

      if (!replyTarget && replyToGmailMessageId && directGmailThreadId) {
        const { data: draftTarget, error: draftTargetError } = await supabase
          .from("outreach_drafts")
          .select(`
            id,
            gmail_message_id,
            gmail_thread_id,
            sent_to,
            gmail_follow_up_message_id,
            gmail_follow_up_thread_id,
            follow_up_sent_to
          `)
          .eq("user_id", user.id)
          .eq("lead_id", leadId)
          .eq("status", "SENT")
          .not("sent_at", "is", null)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draftTargetError) {
          console.error("Could not verify outreach reply target:", draftTargetError);
          return jsonError("Could not verify the outreach thread.", 500);
        }

        const isInitial =
          draftTarget?.gmail_message_id === replyToGmailMessageId &&
          draftTarget?.gmail_thread_id === directGmailThreadId;

        const isFollowUp =
          draftTarget?.gmail_follow_up_message_id === replyToGmailMessageId &&
          draftTarget?.gmail_follow_up_thread_id === directGmailThreadId;

        if (draftTarget && (isInitial || isFollowUp)) {
          replyTarget = {
            outreach_draft_id: draftTarget.id,
            gmail_message_id: replyToGmailMessageId,
            gmail_thread_id: directGmailThreadId,
            direction: "OUTGOING",
            to_email: (isFollowUp ? (draftTarget.follow_up_sent_to ?? draftTarget.sent_to) : draftTarget.sent_to) ?? null,
          };
        }
      }

      if (!replyTarget) {
        return jsonError("The email you are replying to could not be found.", 404);
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
            email_address,
            encrypted_refresh_token,
            scopes
          `)
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();
  
      if (
        gmailError
      ) {
        console.error(
          "Could not load Gmail connection:",
          gmailError
        );
  
        return jsonError(
          `Could not load Gmail connection: ${gmailError.message}`,
          500
        );
      }
  
      if (
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
         SEND
      ===================================================== */
  
      const fullBody =
        ensureSignature(
          body
        );
  
      let sendResult;
  
      try {
        if (replyTarget.direction === "OUTGOING") {
          if (!replyTarget.to_email) {
            return jsonError("Could not determine the outreach recipient.", 400);
          }

          sendResult = await sendGmailThreadFollowUp({
            fromEmail: gmailConnection.email_address,
            toEmail: replyTarget.to_email,
            body: fullBody,
            encryptedRefreshToken: gmailConnection.encrypted_refresh_token,
            replyToGmailMessageId: replyTarget.gmail_message_id,
            gmailThreadId: replyTarget.gmail_thread_id,
            ccEmails: parsedCc.emails,
            bccEmails: parsedBcc.emails,
            attachments: attachmentResult.attachments,
          });
        } else {
          sendResult = await sendGmailReply({
            fromEmail: gmailConnection.email_address,
            body: fullBody,
            encryptedRefreshToken: gmailConnection.encrypted_refresh_token,
            replyToGmailMessageId: replyTarget.gmail_message_id,
            gmailThreadId: replyTarget.gmail_thread_id,
            ccEmails: parsedCc.emails,
            bccEmails: parsedBcc.emails,
            attachments: attachmentResult.attachments,
          });
        }
      } catch (error) {
        console.error(
          "Could not send Gmail reply:",
          error
        );
  
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Gmail error.";
  
        return jsonError(
          `Gmail could not send the reply: ${message}`,
          500
        );
      }
  
      const sentAt =
        new Date()
          .toISOString();
  
      /* =====================================================
         STORE MESSAGE
      ===================================================== */
  
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
                user.id,
  
              lead_id:
                leadId,
  
              outreach_draft_id:
                replyTarget.outreach_draft_id,
  
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
                parsedCc.emails,
  
              bcc_emails:
                parsedBcc.emails,
  
              subject:
                sendResult.subject,
  
              body_text:
                fullBody,
  
              attachments:
                attachmentResult.metadata,
  
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
          "Reply was sent but could not be saved in LEADOS:",
          messageInsertError
        );
      }
  
      /* =====================================================
         UPDATE LEAD
      ===================================================== */
  
      const {
        error:
          leadUpdateError,
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
            leadId
          )
          .eq(
            "user_id",
            user.id
          );
  
      if (
        leadUpdateError
      ) {
        console.error(
          "Reply sent but lead update failed:",
          leadUpdateError
        );
      }
  
      /* =====================================================
         ACTIVITY
      ===================================================== */
  
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
              user.id,
  
            lead_id:
              leadId,
  
            activity_type:
              "EMAIL_SENT",
  
            title:
              "Reply email sent",
  
            description:
              `Reply sent to ${sendResult.toEmail}.`,
          });
  
      if (
        activityError
      ) {
        console.error(
          "Reply sent but activity logging failed:",
          activityError
        );
      }
  
      /* =====================================================
         REVALIDATE
      ===================================================== */
  
      revalidatePath(
        "/inbox"
      );
  
      revalidatePath(
        "/leads"
      );
  
      revalidatePath(
        `/leads/${leadId}`
      );
  
      revalidatePath(
        "/",
        "layout"
      );
  
      /* =====================================================
         SUCCESS
      ===================================================== */
  
      return NextResponse.json({
        ok:
          true,
  
        messageId:
          sendResult.messageId,
  
        threadId:
          sendResult.threadId,
      });
    } catch (error) {
      console.error(
        "Unexpected reply endpoint error:",
        error
      );
  
      const message =
        error instanceof Error
          ? error.message
          : "Unknown server error.";
  
      return jsonError(
        `Something went wrong while sending the reply: ${message}`,
        500
      );
    }
  }