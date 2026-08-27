import "server-only";

import {
  randomUUID,
} from "node:crypto";

import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState,
  OAuthTokens,
} from "@modelcontextprotocol/client";

/* =========================================================
   CONFIG
========================================================= */

export const MAXIBESTOF_MCP_URL =
  "https://maxibestof.one/mcp-server";

/* =========================================================
   COOKIE NAMES
========================================================= */

const COOKIE_PREFIX =
  "leadbase-maxibestof";

const TOKENS_COOKIE =
  `${COOKIE_PREFIX}-tokens`;

const CLIENT_COOKIE =
  `${COOKIE_PREFIX}-client`;

const VERIFIER_COOKIE =
  `${COOKIE_PREFIX}-verifier`;

const DISCOVERY_COOKIE =
  `${COOKIE_PREFIX}-discovery`;

const STATE_COOKIE =
  `${COOKIE_PREFIX}-state`;

/* =========================================================
   COOKIE STORE TYPE
========================================================= */

export type MaxiBestOfCookieStore = {
  get(
    name: string
  ):
    | {
        value: string;
      }
    | undefined;

  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;

      secure?: boolean;

      sameSite?:
        | "lax"
        | "strict"
        | "none";

      path?: string;

      maxAge?: number;
    }
  ): unknown;

  delete(
    name: string
  ): unknown;
};

/* =========================================================
   COOKIE OPTIONS
========================================================= */

function persistentCookieOptions() {
  return {
    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax" as const,

    path:
      "/",

    maxAge:
      60 *
      60 *
      24 *
      30,
  };
}

function temporaryCookieOptions() {
  return {
    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax" as const,

    path:
      "/",

    maxAge:
      60 *
      20,
  };
}

/* =========================================================
   SERIALIZATION
========================================================= */

function encodeJson(
  value: unknown
) {
  return Buffer.from(
    JSON.stringify(
      value
    ),
    "utf8"
  ).toString(
    "base64url"
  );
}

function decodeJson<T>(
  value:
    | string
    | undefined
): T | undefined {
  if (
    !value
  ) {
    return undefined;
  }

  try {
    return JSON.parse(
      Buffer.from(
        value,
        "base64url"
      ).toString(
        "utf8"
      )
    ) as T;
  } catch {
    return undefined;
  }
}

/* =========================================================
   PROVIDER
========================================================= */

export class LeadbaseMaxiBestOfOAuthProvider
  implements OAuthClientProvider
{
  public authorizationUrl:
    URL | null =
    null;

  constructor(
    private readonly cookieStore:
      MaxiBestOfCookieStore,

    private readonly callbackUrl:
      URL,

    private readonly metadata:
      OAuthClientMetadata
  ) {}

  /* =======================================================
     REDIRECT URL
  ======================================================= */

  get redirectUrl() {
    return this.callbackUrl;
  }

  /* =======================================================
     CLIENT METADATA
  ======================================================= */

  get clientMetadata() {
    return this.metadata;
  }

  /* =======================================================
     STATE
  ======================================================= */

  state() {
    const existing =
      this.cookieStore.get(
        STATE_COOKIE
      )?.value;

    if (
      existing
    ) {
      return existing;
    }

    const state =
      randomUUID();

    this.cookieStore.set(
      STATE_COOKIE,
      state,
      temporaryCookieOptions()
    );

    return state;
  }

  /* =======================================================
     CLIENT INFORMATION
  ======================================================= */

  clientInformation() {
    return decodeJson<
      OAuthClientInformationMixed
    >(
      this.cookieStore.get(
        CLIENT_COOKIE
      )?.value
    );
  }

  saveClientInformation(
    clientInformation:
      OAuthClientInformationMixed
  ) {
    this.cookieStore.set(
      CLIENT_COOKIE,
      encodeJson(
        clientInformation
      ),
      persistentCookieOptions()
    );
  }

  /* =======================================================
     TOKENS
  ======================================================= */

  tokens() {
    return decodeJson<
      OAuthTokens
    >(
      this.cookieStore.get(
        TOKENS_COOKIE
      )?.value
    );
  }

  saveTokens(
    tokens:
      OAuthTokens
  ) {
    this.cookieStore.set(
      TOKENS_COOKIE,
      encodeJson(
        tokens
      ),
      persistentCookieOptions()
    );
  }

  /* =======================================================
     AUTH REDIRECT
  ======================================================= */

  redirectToAuthorization(
    authorizationUrl:
      URL
  ) {
    this.authorizationUrl =
      authorizationUrl;
  }

  /* =======================================================
     PKCE
  ======================================================= */

  saveCodeVerifier(
    codeVerifier:
      string
  ) {
    this.cookieStore.set(
      VERIFIER_COOKIE,
      codeVerifier,
      temporaryCookieOptions()
    );
  }

  codeVerifier() {
    const verifier =
      this.cookieStore.get(
        VERIFIER_COOKIE
      )?.value;

    if (
      !verifier
    ) {
      throw new Error(
        "MaxiBestOf OAuth code verifier is missing."
      );
    }

    return verifier;
  }

  /* =======================================================
     DISCOVERY STATE
  ======================================================= */

  saveDiscoveryState(
    state:
      OAuthDiscoveryState
  ) {
    this.cookieStore.set(
      DISCOVERY_COOKIE,
      encodeJson(
        state
      ),
      temporaryCookieOptions()
    );
  }

  discoveryState() {
    return decodeJson<
      OAuthDiscoveryState
    >(
      this.cookieStore.get(
        DISCOVERY_COOKIE
      )?.value
    );
  }

  /* =======================================================
     INVALIDATE
  ======================================================= */

  invalidateCredentials(
    scope:
      | "all"
      | "client"
      | "tokens"
      | "verifier"
      | "discovery"
  ) {
    if (
      scope ===
        "all" ||
      scope ===
        "client"
    ) {
      this.cookieStore.delete(
        CLIENT_COOKIE
      );
    }

    if (
      scope ===
        "all" ||
      scope ===
        "tokens"
    ) {
      this.cookieStore.delete(
        TOKENS_COOKIE
      );
    }

    if (
      scope ===
        "all" ||
      scope ===
        "verifier"
    ) {
      this.cookieStore.delete(
        VERIFIER_COOKIE
      );
    }

    if (
      scope ===
        "all" ||
      scope ===
        "discovery"
    ) {
      this.cookieStore.delete(
        DISCOVERY_COOKIE
      );
    }

    if (
      scope ===
      "all"
    ) {
      this.cookieStore.delete(
        STATE_COOKIE
      );
    }
  }
}

/* =========================================================
   CREATE PROVIDER
========================================================= */

export function createMaxiBestOfOAuthProvider({
  cookieStore,
  origin,
}: {
  cookieStore:
    MaxiBestOfCookieStore;

  origin:
    string;
}) {
  const callbackUrl =
    new URL(
      "/api/integrations/maxibestof/callback",
      origin
    );

  const hostname =
    callbackUrl.hostname
      .toLowerCase();

  const isLoopback =
    hostname ===
      "localhost" ||
    hostname ===
      "127.0.0.1" ||
    hostname ===
      "::1";

  const metadata:
    OAuthClientMetadata = {
    client_name:
      "Leadbase Redesign Research",

    redirect_uris: [
      callbackUrl.toString(),
    ],

    grant_types: [
      "authorization_code",
      "refresh_token",
    ],

    response_types: [
      "code",
    ],

    token_endpoint_auth_method:
      "none",

    application_type:
      isLoopback
        ? "native"
        : "web",
  };

  return new LeadbaseMaxiBestOfOAuthProvider(
    cookieStore,
    callbackUrl,
    metadata
  );
}

/* =========================================================
   NEW AUTH ATTEMPT
========================================================= */

export function prepareMaxiBestOfOAuthAttempt(
  cookieStore:
    MaxiBestOfCookieStore
) {
  cookieStore.set(
    STATE_COOKIE,
    randomUUID(),
    temporaryCookieOptions()
  );

  cookieStore.delete(
    VERIFIER_COOKIE
  );

  cookieStore.delete(
    DISCOVERY_COOKIE
  );
}

/* =========================================================
   ACCESS TOKEN
========================================================= */

export function getStoredMaxiBestOfAccessToken(
  cookieStore:
    MaxiBestOfCookieStore
) {
  const tokens =
    decodeJson<
      OAuthTokens
    >(
      cookieStore.get(
        TOKENS_COOKIE
      )?.value
    );

  return tokens
    ?.access_token ??
    null;
}

/* =========================================================
   CONNECTED
========================================================= */

export function hasMaxiBestOfConnection(
  cookieStore:
    MaxiBestOfCookieStore
) {
  return Boolean(
    getStoredMaxiBestOfAccessToken(
      cookieStore
    )
  );
}