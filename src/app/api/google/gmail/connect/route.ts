import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createGmailOAuthClient,
  createGmailOAuthState,
  GMAIL_OAUTH_SCOPES,
} from "@/lib/gmail-oauth";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

/* =========================================================
   CONNECT GMAIL
========================================================= */

export async function GET(
  request: NextRequest
) {
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
        "/",
        request.url
      )
    );
  }

  /* =======================================================
     CREATE SIGNED STATE
  ======================================================= */

  const state =
    createGmailOAuthState(
      user.id
    );

  /* =======================================================
     GOOGLE AUTH URL
  ======================================================= */

  const oauth2Client =
    createGmailOAuthClient();

  const authorizationUrl =
    oauth2Client.generateAuthUrl({
      /*
       * We need a refresh token because sending may happen
       * after the initial Google login.
       */
      access_type:
        "offline",

      scope:
        GMAIL_OAUTH_SCOPES,

      include_granted_scopes:
        true,

      /*
       * Forces the consent flow again so Google can return
       * the required offline credentials during setup.
       */
      prompt:
        "consent",

      state,
    });

  const returnTo =
    request.nextUrl.searchParams.get("returnTo") === "/"
      ? "/"
      : "/settings";

  const response = NextResponse.redirect(
    authorizationUrl
  );

  response.cookies.set("leadbase_gmail_return_to", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}