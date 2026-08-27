import {
    cookies,
  } from "next/headers";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    Client,
    StreamableHTTPClientTransport,
  } from "@modelcontextprotocol/client";
  
  import {
    createMaxiBestOfOAuthProvider,
    MAXIBESTOF_MCP_URL,
  } from "@/lib/maxibestof-oauth";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    request: Request
  ) {
    const url =
      new URL(
        request.url
      );
  
    /* =======================================================
       OAUTH ERROR
    ======================================================= */
  
    const oauthError =
      url.searchParams.get(
        "error"
      );
  
    if (
      oauthError
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            oauthError,
  
          description:
            url.searchParams.get(
              "error_description"
            ),
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       AUTHENTICATED LEADBASE USER
    ======================================================= */
  
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
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }
  
    /* =======================================================
       PROVIDER
    ======================================================= */
  
    const cookieStore =
      await cookies();
  
    const provider =
      createMaxiBestOfOAuthProvider({
        cookieStore,
  
        origin:
          url.origin,
      });
  
    const transport =
      new StreamableHTTPClientTransport(
        new URL(
          MAXIBESTOF_MCP_URL
        ),
        {
          authProvider:
            provider,
        }
      );
  
    /* =======================================================
       FINISH OAUTH
    ======================================================= */
  
    try {
      /*
       * finishAuth validates the callback and exchanges
       * the authorization code for the access token.
       */
  
      await transport.finishAuth(
        url.searchParams
      );
  
      /* =====================================================
         VERIFY CONNECTION
      ===================================================== */
  
      const client =
        new Client({
          name:
            "leadbase-maxibestof",
  
          version:
            "1.0.0",
        });
  
      await client.connect(
        transport
      );
  
      await client.close();
  
      /*
       * Immediately run our website-side MCP test.
       */
  
      return NextResponse.redirect(
        new URL(
          "/api/integrations/maxibestof/test",
          request.url
        )
      );
    } catch (
      error
    ) {
      console.error(
        "MaxiBestOf OAuth callback failed:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            error instanceof
              Error
              ? error.message
              : "MaxiBestOf authorization failed.",
        },
        {
          status:
            500,
        }
      );
    }
  }