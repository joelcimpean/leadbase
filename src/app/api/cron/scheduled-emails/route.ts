import {
    timingSafeEqual,
  } from "node:crypto";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
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
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type StoredAttachment = {
    name: string;
    type: string;
    size: number;
    storagePath: string;
  };
  
  type ScheduledEmail = {
    id: string;
  
    user_id: string;
    lead_id: string;
  
    reply_to_email_message_id: string;
  
    body: string;
  
    cc_emails:
      | string[]
      | null;
  
    bcc_emails:
      | string[]
      | null;
  
    attachments:
      unknown;
  
    scheduled_for: string;
  
    attempt_count: number;
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
  
  /* =========================================================
     PROCESS ONE EMAIL
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
  
    /* =======================================================
       CLAIM
  
       Only SCHEDULED rows can become PROCESSING.
       This prevents two worker runs from sending the same
       scheduled email at the same time.
    ======================================================= */
  
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
            schedule.attempt_count +
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
  
    /* =======================================================
       EVERYTHING BEFORE GMAIL SEND MAY SAFELY FAIL.
  
       In that case we mark the schedule FAILED because no
       email has left Gmail yet.
    ======================================================= */
  
    try {
      /* REPLY TARGET */
  
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
  
      /* GMAIL CONNECTION */
  
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
            schedule.user_id
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
  
      /* ATTACHMENTS */
  
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
  
      /* =====================================================
         SEND THROUGH GMAIL
  
         Gmail threading uses the stored thread ID and the
         original Gmail message being replied to.
      ===================================================== */
  
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
        const message =
          errorMessage(
            sendError
          );
  
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
              message,
          })
          .eq(
            "id",
            schedule.id
          )
          .eq(
            "status",
            "PROCESSING"
          );
  
        console.error(
          `Scheduled Gmail send failed for ${schedule.id}:`,
          sendError
        );
  
        return {
          id:
            schedule.id,
  
          result:
            "FAILED",
        };
      }
  
      /* =====================================================
         CRITICAL SAFETY POINT
  
         Gmail has now accepted the email.
  
         Therefore we immediately mark the schedule SENT
         before doing any secondary bookkeeping.
  
         If this database write fails, we deliberately DO NOT
         move the row back to SCHEDULED/FAILED because that
         could cause a duplicate email later.
      ===================================================== */
  
      const sentAt =
        new Date()
          .toISOString();
  
      const {
        error:
          sentStateError,
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
              sendResult.messageId,
  
            gmail_thread_id:
              sendResult.threadId,
  
            last_error:
              null,
          })
          .eq(
            "id",
            schedule.id
          )
          .eq(
            "status",
            "PROCESSING"
          );
  
      if (
        sentStateError
      ) {
        console.error(
          `CRITICAL: Gmail sent schedule ${schedule.id}, but SENT state could not be stored:`,
          sentStateError
        );
  
        /*
         * Never retry automatically here.
         *
         * Leaving the row PROCESSING is safer than sending
         * the same customer email twice.
         */
  
        return {
          id:
            schedule.id,
  
          result:
            "SENT_STATE_WRITE_FAILED",
        };
      }
  
      /* =====================================================
         STORE OUTGOING CRM MESSAGE
      ===================================================== */
  
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
          `Scheduled email ${schedule.id} was sent but could not be stored in email_messages:`,
          messageInsertError
        );
      }
  
      /* =====================================================
         UPDATE LEAD
      ===================================================== */
  
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
          `Scheduled email sent but lead ${schedule.lead_id} could not be updated:`,
          leadError
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
          "Scheduled email sent but activity logging failed:",
          activityError
        );
      }
  
      /* =====================================================
         DELETE TEMPORARY STORAGE FILES
  
         Gmail now owns the actual sent attachments, so the
         temporary scheduled versions are no longer needed.
      ===================================================== */
  
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
            `Scheduled email ${schedule.id} was sent, but temporary attachments could not be deleted:`,
            deleteStorageError
          );
        }
      }
  
      return {
        id:
          schedule.id,
  
        result:
          "SENT",
      };
    } catch (
      error
    ) {
      const message =
        errorMessage(
          error
        );
  
      /*
       * This catch only handles failures that occur BEFORE
       * Gmail successfully sends the email.
       */
  
      const {
        error:
          failureStateError,
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
              message,
          })
          .eq(
            "id",
            schedule.id
          )
          .eq(
            "status",
            "PROCESSING"
          );
  
      if (
        failureStateError
      ) {
        console.error(
          "Could not mark scheduled email failed:",
          failureStateError
        );
      }
  
      console.error(
        `Scheduled email ${schedule.id} failed before sending:`,
        error
      );
  
      return {
        id:
          schedule.id,
  
        result:
          "FAILED",
      };
    }
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
     POST
  ========================================================= */
  
  export async function POST(
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