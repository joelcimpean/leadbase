import {
    google,
  } from "googleapis";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    createGmailOAuthClient,
    decryptGmailToken,
  } from "@/lib/gmail-oauth";
  
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
  
  const GMAIL_READ_SCOPE =
    "https://www.googleapis.com/auth/gmail.readonly";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type GmailMessagePart = {
    filename?:
      | string
      | null;
  
    mimeType?:
      | string
      | null;
  
    body?: {
      data?:
        | string
        | null;
  
      attachmentId?:
        | string
        | null;
    } | null;
  
    parts?:
      | GmailMessagePart[]
      | null;
  };
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function jsonError(
    error: string,
    status = 400
  ) {
    return NextResponse.json(
      {
        ok:
          false,
  
        error,
      },
      {
        status,
      }
    );
  }
  
  function findAttachmentPart(
    part:
      | GmailMessagePart
      | null
      | undefined,
    filename: string
  ): GmailMessagePart | null {
    if (
      !part
    ) {
      return null;
    }
  
    if (
      part.filename ===
      filename
    ) {
      return part;
    }
  
    for (
      const child of
        part.parts ??
        []
    ) {
      const found =
        findAttachmentPart(
          child,
          filename
        );
  
      if (
        found
      ) {
        return found;
      }
    }
  
    return null;
  }
  
  function safeFilename(
    value: string
  ) {
    return value
      .replace(
        /[\r\n"]/g,
        "_"
      )
      .trim();
  }
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    request: Request
  ) {
    try {
      const url =
        new URL(
          request.url
        );
  
      const messageId =
        url.searchParams.get(
          "messageId"
        );
  
      const filename =
        url.searchParams.get(
          "filename"
        );
  
      const download =
        url.searchParams.get(
          "download"
        ) ===
        "1";
  
      if (
        !messageId ||
        !filename
      ) {
        return jsonError(
          "Missing attachment parameters."
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
      } =
        await supabase.auth.getUser();
  
      if (
        !user
      ) {
        return jsonError(
          "Not authenticated.",
          401
        );
      }
  
      /* =====================================================
         VERIFY MESSAGE BELONGS TO USER
      ===================================================== */
  
      const {
        data:
          storedMessage,
  
        error:
          messageError,
      } =
        await supabase
          .from(
            "email_messages"
          )
          .select(`
            id,
            gmail_message_id
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "gmail_message_id",
            messageId
          )
          .maybeSingle();
  
      if (
        messageError
      ) {
        console.error(
          "Could not verify attachment message:",
          messageError
        );
  
        return jsonError(
          "Could not verify the email.",
          500
        );
      }
  
      if (
        !storedMessage
      ) {
        return jsonError(
          "Email not found.",
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
            encrypted_refresh_token,
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
          "Gmail is not connected.",
          400
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
          GMAIL_READ_SCOPE
        )
      ) {
        return jsonError(
          "Gmail read access is missing.",
          403
        );
      }
  
      /* =====================================================
         GMAIL CLIENT
      ===================================================== */
  
      const refreshToken =
        decryptGmailToken(
          gmailConnection.encrypted_refresh_token
        );
  
      const oauth2Client =
        createGmailOAuthClient();
  
      oauth2Client.setCredentials({
        refresh_token:
          refreshToken,
      });
  
      const gmail =
        google.gmail({
          version:
            "v1",
  
          auth:
            oauth2Client,
        });
  
      /* =====================================================
         LOAD MESSAGE
      ===================================================== */
  
      const messageResponse =
        await gmail.users.messages.get({
          userId:
            "me",
  
          id:
            messageId,
  
          format:
            "full",
        });
  
      const payload =
        messageResponse.data
          .payload as
          | GmailMessagePart
          | undefined;
  
      const part =
        findAttachmentPart(
          payload,
          filename
        );
  
      if (
        !part
      ) {
        return jsonError(
          "Attachment not found in Gmail.",
          404
        );
      }
  
      /* =====================================================
         LOAD DATA
      ===================================================== */
  
      let encodedData:
        string | null =
        part.body?.data ??
        null;
  
      const attachmentId =
        part.body?.attachmentId ??
        null;
  
      if (
        !encodedData &&
        attachmentId
      ) {
        const attachmentResponse =
          await gmail.users.messages.attachments.get({
            userId:
              "me",
  
            messageId,
  
            id:
              attachmentId,
          });
  
        encodedData =
          attachmentResponse
            .data
            .data ??
          null;
      }
  
      if (
        !encodedData
      ) {
        return jsonError(
          "Attachment data is unavailable.",
          404
        );
      }
  
      const buffer =
        Buffer.from(
          encodedData,
          "base64url"
        );
  
      const contentType =
        part.mimeType ||
        "application/octet-stream";
  
      const cleanFilename =
        safeFilename(
          filename
        );
  
      return new Response(
        new Uint8Array(
          buffer
        ),
        {
          status:
            200,
  
          headers: {
            "Content-Type":
              contentType,
  
            "Content-Length":
              String(
                buffer.length
              ),
  
            "Content-Disposition":
              `${
                download
                  ? "attachment"
                  : "inline"
              }; filename="${cleanFilename}"`,
  
            "Cache-Control":
              "private, max-age=300",
          },
        }
      );
    } catch (error) {
      console.error(
        "Attachment endpoint failed:",
        error
      );
  
      return jsonError(
        "Could not load attachment.",
        500
      );
    }
  }