import {
    NextResponse,
  } from "next/server";
  
  import {
    sendGmailMessage,
  } from "@/lib/gmail-send";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  export const runtime =
    "nodejs";
  
  /* =========================================================
     TEST SEND
  ========================================================= */
  
  export async function GET() {
    const supabase =
      await createClient();
  
    /* =======================================================
       AUTH
    ======================================================= */
  
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
      return NextResponse.json(
        {
          ok: false,
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }
  
    /* =======================================================
       LOAD GMAIL CONNECTION
    ======================================================= */
  
    const {
      data:
        connection,
  
      error:
        connectionError,
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
      connectionError
    ) {
      console.error(
        "Could not load Gmail connection:",
        connectionError
      );
  
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load Gmail connection.",
        },
        {
          status: 500,
        }
      );
    }
  
    if (
      !connection
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gmail is not connected.",
        },
        {
          status: 400,
        }
      );
    }
  
    /* =======================================================
       VERIFY SEND SCOPE
    ======================================================= */
  
    const hasSendScope =
      Array.isArray(
        connection.scopes
      ) &&
      connection.scopes.includes(
        "https://www.googleapis.com/auth/gmail.send"
      );
  
    if (
      !hasSendScope
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The Gmail connection does not have gmail.send permission.",
        },
        {
          status: 403,
        }
      );
    }
  
    /* =======================================================
       TEST EMAIL
  
       For the first test we intentionally send from the
       connected Gmail account back to the same mailbox.
  
       This prevents accidentally contacting a real lead.
    ======================================================= */
  
    const recipient =
      connection.email_address;
  
    const subject =
      "JOEL LEADOS – Gmail Test";
  
    const body = [
      "Hallo Joel,",
      "",
      "wenn du diese E-Mail siehst, funktioniert der Gmail-Versand aus JOEL LEADOS erfolgreich.",
      "",
      "Diese Nachricht wurde über die Gmail API gesendet.",
      "",
      "Mit freundlichen Grüßen / Kind regards,",
      "",
      "Joel Cimpean",
      "hello@joelcimpean.com / joelcimpean.com",
    ].join(
      "\n"
    );
  
    /* =======================================================
       SEND
    ======================================================= */
  
    try {
      const result =
        await sendGmailMessage({
          fromEmail:
            connection.email_address,
  
          toEmail:
            recipient,
  
          subject,
  
          body,
  
          encryptedRefreshToken:
            connection.encrypted_refresh_token,
        });
  
      return NextResponse.json({
        ok: true,
  
        message:
          "Test email sent successfully.",
  
        from:
          connection.email_address,
  
        to:
          recipient,
  
        gmailMessageId:
          result.messageId,
  
        gmailThreadId:
          result.threadId,
      });
    } catch (error) {
      console.error(
        "Gmail test send failed:",
        error
      );
  
      return NextResponse.json(
        {
          ok: false,
  
          error:
            error instanceof Error
              ? error.message
              : "Unknown Gmail send error.",
        },
        {
          status: 500,
        }
      );
    }
  }