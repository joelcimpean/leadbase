import {
    cookies,
  } from "next/headers";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    Client,
    StreamableHTTPClientTransport,
    UnauthorizedError,
  } from "@modelcontextprotocol/client";
  
  import {
    createMaxiBestOfOAuthProvider,
    MAXIBESTOF_MCP_URL,
    prepareMaxiBestOfOAuthAttempt,
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
    /* =======================================================
       AUTH
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
       COOKIES
    ======================================================= */
  
    const cookieStore =
      await cookies();
  
    prepareMaxiBestOfOAuthAttempt(
      cookieStore
    );
  
    /* =======================================================
       PROVIDER
    ======================================================= */
  
    const origin =
      new URL(
        request.url
      ).origin;
  
    const provider =
      createMaxiBestOfOAuthProvider({
        cookieStore,
  
        origin,
      });
  
    /* =======================================================
       MCP CLIENT
    ======================================================= */
  
    const client =
      new Client({
        name:
          "leadbase-maxibestof",
  
        version:
          "1.0.0",
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
       CONNECT
    ======================================================= */
  
    try {
      await client.connect(
        transport
      );
  
      await client.close();
  
      /*
       * Already authenticated.
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
      if (
        error instanceof
        UnauthorizedError
      ) {
        const authorizationUrl =
          provider.authorizationUrl;
  
        if (
          authorizationUrl
        ) {
          return NextResponse.redirect(
            authorizationUrl
          );
        }
  
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "MaxiBestOf requires authorization, but no OAuth URL was returned.",
          },
          {
            status:
              500,
          }
        );
      }
  
      console.error(
        "Could not connect to MaxiBestOf MCP:",
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
              : "Could not connect to MaxiBestOf.",
        },
        {
          status:
            500,
        }
      );
    }
  }