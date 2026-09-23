import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createGmailOAuthClient,
  encryptGmailToken,
  getGmailClientId,
  GMAIL_OAUTH_SCOPES,
  verifyGmailOAuthState,
} from "@/lib/gmail-oauth";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

/* =========================================================
   REDIRECT HELPER
========================================================= */

function redirectToSettings(
  request: NextRequest,
  status: string
) {
  const returnTo =
    request.cookies.get("leadbase_gmail_return_to")?.value === "/"
      ? "/"
      : "/settings";

  const url = new URL(returnTo, request.url);
  url.searchParams.set("gmail", status);

  const response = NextResponse.redirect(url);
  response.cookies.delete("leadbase_gmail_return_to");
  return response;
}

/* =========================================================
   GOOGLE CALLBACK
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
        "/login",
        request.url
      )
    );
  }

  /* =======================================================
     GOOGLE-SIDE ERROR
  ======================================================= */

  const googleError =
    request.nextUrl.searchParams.get(
      "error"
    );

  if (
    googleError
  ) {
    console.error(
      "Google OAuth returned an error:",
      googleError
    );

    return redirectToSettings(
      request,
      "denied"
    );
  }

  /* =======================================================
     VERIFY SIGNED STATE
  ======================================================= */

  const returnedState =
    request.nextUrl.searchParams.get(
      "state"
    );

  if (
    !returnedState ||
    !verifyGmailOAuthState(
      returnedState,
      user.id
    )
  ) {
    console.error(
      "Invalid Gmail OAuth state."
    );

    return redirectToSettings(
      request,
      "invalid-state"
    );
  }

  /* =======================================================
     AUTHORIZATION CODE
  ======================================================= */

  const code =
    request.nextUrl.searchParams.get(
      "code"
    );

  if (!code) {
    console.error(
      "Google did not return an authorization code."
    );

    return redirectToSettings(
      request,
      "missing-code"
    );
  }

  /* =======================================================
     EXCHANGE CODE
  ======================================================= */

  const oauth2Client =
    createGmailOAuthClient();

  let tokens;

  try {
    const result =
      await oauth2Client.getToken(
        code
      );

    tokens =
      result.tokens;
  } catch (error) {
    console.error(
      "Could not exchange Google authorization code:",
      error
    );

    return redirectToSettings(
      request,
      "token-error"
    );
  }

  /* =======================================================
     VERIFY GOOGLE ACCOUNT
  ======================================================= */


  if (
    !tokens.id_token
  ) {
    console.error(
      "Google did not return an ID token."
    );

    return redirectToSettings(
      request,
      "identity-error"
    );
  }

  let authenticatedEmail:
    string | null = null;

  try {
    const ticket =
      await oauth2Client.verifyIdToken({
        idToken:
          tokens.id_token,

        audience:
          getGmailClientId(),
      });

    authenticatedEmail =
      ticket
        .getPayload()
        ?.email
        ?.trim()
        .toLowerCase() ??
      null;
  } catch (error) {
    console.error(
      "Could not verify Google identity:",
      error
    );

    return redirectToSettings(
      request,
      "identity-error"
    );
  }

  if (
    !authenticatedEmail
  ) {
    console.error(
      "Google account email could not be determined."
    );

    return redirectToSettings(
      request,
      "identity-error"
    );
  }

  /*
   * Do not accidentally connect another personal Google
   * account if multiple Google accounts are logged in.
   */

  /* =======================================================
     EXISTING CONNECTION

     Google may not always issue a new refresh token on a
     reconnect. If we already have one stored, keep it.
  ======================================================= */

  const {
    data:
      existingConnection,

    error:
      existingConnectionError,
  } =
    await supabase
      .from(
        "gmail_connections"
      )
      .select(`
        encrypted_refresh_token
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    existingConnectionError
  ) {
    console.error(
      "Could not check existing Gmail connection:",
      existingConnectionError
    );

    return redirectToSettings(
      request,
      "database-error"
    );
  }

  /* =======================================================
     REFRESH TOKEN
  ======================================================= */

  let encryptedRefreshToken =
    existingConnection
      ?.encrypted_refresh_token ??
    null;

  if (
    tokens.refresh_token
  ) {
    try {
      encryptedRefreshToken =
        encryptGmailToken(
          tokens.refresh_token
        );
    } catch (error) {
      console.error(
        "Could not encrypt Gmail refresh token:",
        error
      );

      return redirectToSettings(
        request,
        "encryption-error"
      );
    }
  }

  if (
    !encryptedRefreshToken
  ) {
    console.error(
      "Google did not return a refresh token and there is no existing Gmail connection."
    );

    return redirectToSettings(
      request,
      "missing-refresh-token"
    );
  }

  /* =======================================================
     SCOPES
  ======================================================= */

  const grantedScopes =
    tokens.scope
      ? tokens.scope
          .split(" ")
          .map(
            (scope) =>
              scope.trim()
          )
          .filter(Boolean)
      : GMAIL_OAUTH_SCOPES;

  /* =======================================================
     SAVE CONNECTION
  ======================================================= */

  const {
    error:
      databaseError,
  } =
    await supabase
      .from(
        "gmail_connections"
      )
      .upsert(
        {
          user_id:
            user.id,

          email_address:
            authenticatedEmail,

          encrypted_refresh_token:
            encryptedRefreshToken,

          scopes:
            grantedScopes,

          connected_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (
    databaseError
  ) {
    console.error(
      "Could not save Gmail connection:",
      databaseError
    );

    return redirectToSettings(
      request,
      "database-error"
    );
  }

  /* =======================================================
     SUCCESS
  ======================================================= */

  return redirectToSettings(
    request,
    "connected"
  );
}