import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  google,
} from "googleapis";

/* =========================================================
   SCOPES
========================================================= */

export const GMAIL_OAUTH_SCOPES = [
  "openid",
  "email",

  /*
   * Sending outreach.
   */
  "https://www.googleapis.com/auth/gmail.send",

  /*
   * Reading replies in threads that JOEL LEADOS
   * previously created.
   */
  "https://www.googleapis.com/auth/gmail.readonly",
];

/* =========================================================
   ENV
========================================================= */

function getRequiredEnv(
  name: string
) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `${name} is missing from the environment.`
    );
  }

  return value;
}

export function getGmailClientId() {
  return getRequiredEnv(
    "GOOGLE_GMAIL_CLIENT_ID"
  );
}

/* =========================================================
   OAUTH CLIENT
========================================================= */

export function createGmailOAuthClient() {
  const clientId =
    getRequiredEnv(
      "GOOGLE_GMAIL_CLIENT_ID"
    );

  const clientSecret =
    getRequiredEnv(
      "GOOGLE_GMAIL_CLIENT_SECRET"
    );

  const redirectUri =
    getRequiredEnv(
      "GOOGLE_GMAIL_REDIRECT_URI"
    );

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/* =========================================================
   CONFIGURED ACCOUNT
========================================================= */

export function getConfiguredGmailAddress() {
  return getRequiredEnv(
    "GOOGLE_GMAIL_ACCOUNT_EMAIL"
  )
    .trim()
    .toLowerCase();
}

/* =========================================================
   ENCRYPTION KEY
========================================================= */

function getEncryptionKey() {
  const encoded =
    getRequiredEnv(
      "GOOGLE_GMAIL_TOKEN_ENCRYPTION_KEY"
    );

  const key =
    Buffer.from(
      encoded,
      "base64"
    );

  if (
    key.length !== 32
  ) {
    throw new Error(
      "GOOGLE_GMAIL_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
}

/* =========================================================
   REFRESH TOKEN ENCRYPTION
========================================================= */

export function encryptGmailToken(
  value: string
) {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        "utf8"
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    iv.toString(
      "base64url"
    ),

    authTag.toString(
      "base64url"
    ),

    encrypted.toString(
      "base64url"
    ),
  ].join(".");
}

/* =========================================================
   REFRESH TOKEN DECRYPTION
========================================================= */

export function decryptGmailToken(
  value: string
) {
  const parts =
    value.split(".");

  if (
    parts.length !== 3
  ) {
    throw new Error(
      "Invalid encrypted Gmail token."
    );
  }

  const [
    ivPart,
    authTagPart,
    encryptedPart,
  ] = parts;

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(
      ivPart,
      "base64url"
    );

  const authTag =
    Buffer.from(
      authTagPart,
      "base64url"
    );

  const encrypted =
    Buffer.from(
      encryptedPart,
      "base64url"
    );

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  decipher.setAuthTag(
    authTag
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encrypted
      ),

      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8"
  );
}

/* =========================================================
   OAUTH STATE
========================================================= */

type GmailOAuthStatePayload = {
  userId: string;
  nonce: string;
  issuedAt: number;
};

export function createGmailOAuthState(
  userId: string
) {
  const payload:
    GmailOAuthStatePayload = {
      userId,

      nonce:
        randomBytes(24)
          .toString(
            "base64url"
          ),

      issuedAt:
        Date.now(),
    };

  const encodedPayload =
    Buffer.from(
      JSON.stringify(
        payload
      ),
      "utf8"
    ).toString(
      "base64url"
    );

  const signature =
    createHmac(
      "sha256",
      getEncryptionKey()
    )
      .update(
        encodedPayload
      )
      .digest(
        "base64url"
      );

  return `${encodedPayload}.${signature}`;
}

/* =========================================================
   VERIFY OAUTH STATE
========================================================= */

export function verifyGmailOAuthState(
  state: string,
  expectedUserId: string
) {
  try {
    const parts =
      state.split(".");

    if (
      parts.length !== 2
    ) {
      return false;
    }

    const [
      encodedPayload,
      receivedSignature,
    ] = parts;

    const expectedSignature =
      createHmac(
        "sha256",
        getEncryptionKey()
      )
        .update(
          encodedPayload
        )
        .digest(
          "base64url"
        );

    const receivedBuffer =
      Buffer.from(
        receivedSignature,
        "base64url"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "base64url"
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    const validSignature =
      timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      );

    if (
      !validSignature
    ) {
      return false;
    }

    const rawPayload =
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString(
        "utf8"
      );

    const payload =
      JSON.parse(
        rawPayload
      ) as GmailOAuthStatePayload;

    if (
      !payload.userId ||
      !payload.nonce ||
      !payload.issuedAt
    ) {
      return false;
    }

    if (
      payload.userId !==
      expectedUserId
    ) {
      return false;
    }

    const age =
      Date.now() -
      payload.issuedAt;

    if (
      age < -60_000 ||
      age >
        10 * 60 * 1000
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}