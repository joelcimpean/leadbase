import "server-only";

import { randomBytes } from "node:crypto";

import { google } from "googleapis";

import {
  createGmailOAuthClient,
  decryptGmailToken,
} from "@/lib/gmail-oauth";

/* =========================================================
   TYPES
========================================================= */

type SendGmailMessageInput = {
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  htmlBody?:
    | string
    | null;
  inlineImages?:
    GmailInlineImage[];
  encryptedRefreshToken: string;
};

export type GmailInlineImage = {
  filename: string;
  contentType: string;
  content: Buffer;
  contentId: string;
};

export type GmailAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

type SendGmailReplyInput = {
  fromEmail: string;
  body: string;
  encryptedRefreshToken: string;

  replyToGmailMessageId: string;
  gmailThreadId: string;

  ccEmails?: string[];
  bccEmails?: string[];

  attachments?: GmailAttachment[];
};

type GmailHeader = {
  name?: string | null;
  value?: string | null;
};

/* =========================================================
   HEADER HELPERS
========================================================= */

function sanitizeHeader(
  value: string
) {
  return value
    .replace(
      /[\r\n]+/g,
      " "
    )
    .trim();
}

function encodeSubject(
  value: string
) {
  const encoded =
    Buffer.from(
      value,
      "utf8"
    ).toString(
      "base64"
    );

  return `=?UTF-8?B?${encoded}?=`;
}

function getHeader(
  headers:
    | GmailHeader[]
    | null
    | undefined,
  name: string
) {
  const header =
    (
      headers ??
      []
    ).find(
      (item) =>
        item.name?.toLowerCase() ===
        name.toLowerCase()
    );

  return (
    header?.value?.trim() ??
    null
  );
}

function extractEmailAddress(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  const angleMatch =
    value.match(
      /<([^>]+)>/
    );

  if (
    angleMatch?.[1]
  ) {
    return angleMatch[1]
      .trim()
      .toLowerCase();
  }

  const emailMatch =
    value.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  if (
    !emailMatch
  ) {
    return null;
  }

  return emailMatch[0]
    .trim()
    .toLowerCase();
}

function formatAddressList(
  emails:
    | string[]
    | undefined
) {
  return (
    emails ??
    []
  )
    .map(
      sanitizeHeader
    )
    .filter(Boolean)
    .join(", ");
}

/* =========================================================
   ATTACHMENT HELPERS
========================================================= */

function wrapBase64(
  value: string
) {
  return (
    value.match(
      /.{1,76}/g
    ) ?? []
  ).join(
    "\r\n"
  );
}

function safeContentType(
  value: string
) {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(
      normalized
    )
  ) {
    return normalized;
  }

  return "application/octet-stream";
}

function safeAsciiFilename(
  value: string
) {
  const cleaned =
    value
      .replace(
        /[\r\n"]/g,
        ""
      )
      .replace(
        /[^\x20-\x7E]/g,
        "_"
      )
      .trim();

  return (
    cleaned ||
    "attachment"
  );
}

function encodeFilename(
  value: string
) {
  return encodeURIComponent(
    value
  ).replace(
    /'/g,
    "%27"
  );
}

/* =========================================================
   NORMAL MESSAGE
========================================================= */

function createRawMessage({
  fromEmail,
  toEmail,
  subject,
  body,
  htmlBody,
  inlineImages = [],
}: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  htmlBody?:
    | string
    | null;
  inlineImages?:
    GmailInlineImage[];
}) {
  const safeFrom =
    sanitizeHeader(
      fromEmail
    );

  const safeTo =
    sanitizeHeader(
      toEmail
    );

  const safeSubject =
    sanitizeHeader(
      subject
    );

  const headers = [
    `From: Joel Cimpean <${safeFrom}>`,
    `To: ${safeTo}`,
    `Subject: ${encodeSubject(
      safeSubject
    )}`,
    "MIME-Version: 1.0",
  ];

  if (
    !htmlBody
      ?.trim()
  ) {
    const message = [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
    ].join(
      "\r\n"
    );

    return Buffer.from(
      message,
      "utf8"
    ).toString(
      "base64url"
    );
  }

  const alternativeBoundary =
    `joel-leados-alt-${randomBytes(
      18
    ).toString(
      "hex"
    )}`;

  /*
   * No inline images:
   * keep the lightweight multipart/alternative message.
   */
  if (
    inlineImages.length ===
    0
  ) {
    const message = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      `--${alternativeBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
      `--${alternativeBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      htmlBody,
      `--${alternativeBoundary}--`,
      "",
    ].join(
      "\r\n"
    );

    return Buffer.from(
      message,
      "utf8"
    ).toString(
      "base64url"
    );
  }

  /*
   * Inline images need multipart/related around the normal
   * multipart/alternative body.
   *
   * HTML references the image with:
   *   <img src="cid:leadbase-preview-gif">
   *
   * This is much more reliable in Gmail than depending on a
   * remote Supabase image URL being fetched by the mail client.
   */
  const relatedBoundary =
    `joel-leados-related-${randomBytes(
      18
    ).toString(
      "hex"
    )}`;

  const messageParts: string[] = [
    ...headers,

    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,

    "",

    `--${relatedBoundary}`,

    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,

    "",

    `--${alternativeBoundary}`,

    'Content-Type: text/plain; charset="UTF-8"',

    "Content-Transfer-Encoding: 8bit",

    "",

    body,

    `--${alternativeBoundary}`,

    'Content-Type: text/html; charset="UTF-8"',

    "Content-Transfer-Encoding: 8bit",

    "",

    htmlBody,

    `--${alternativeBoundary}--`,

    "",
  ];

  for (
    const inlineImage of
      inlineImages
  ) {
    const fallbackName =
      safeAsciiFilename(
        inlineImage.filename
      );

    const utf8Name =
      encodeFilename(
        inlineImage.filename
      );

    const contentType =
      safeContentType(
        inlineImage.contentType
      );

    const cleanContentId =
      inlineImage.contentId
        .replace(
          /[^A-Za-z0-9._@+-]/g,
          ""
        )
        .trim() ||
      `inline-${randomBytes(
        8
      ).toString(
        "hex"
      )}@leadbase`;

    const base64Content =
      wrapBase64(
        inlineImage.content.toString(
          "base64"
        )
      );

    messageParts.push(
      `--${relatedBoundary}`,

      `Content-Type: ${contentType}; name="${fallbackName}"`,

      "Content-Transfer-Encoding: base64",

      `Content-ID: <${cleanContentId}>`,

      `X-Attachment-Id: ${cleanContentId}`,

      `Content-Disposition: inline; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`,

      "",

      base64Content
    );
  }

  messageParts.push(
    `--${relatedBoundary}--`,
    ""
  );

  const rawMessage =
    messageParts.join(
      "\r\n"
    );

  return Buffer.from(
    rawMessage,
    "utf8"
  ).toString(
    "base64url"
  );
}

/* =========================================================
   REPLY MIME MESSAGE
========================================================= */

function createRawReply({
  fromEmail,
  toEmail,
  ccEmails,
  bccEmails,
  subject,
  body,
  inReplyTo,
  references,
  attachments,
}: {
  fromEmail: string;
  toEmail: string;
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  body: string;
  inReplyTo: string;
  references: string;
  attachments: GmailAttachment[];
}) {
  const safeFrom =
    sanitizeHeader(
      fromEmail
    );

  const safeTo =
    sanitizeHeader(
      toEmail
    );

  const safeSubject =
    sanitizeHeader(
      subject
    );

  const safeInReplyTo =
    sanitizeHeader(
      inReplyTo
    );

  const safeReferences =
    sanitizeHeader(
      references
    );

  const cc =
    formatAddressList(
      ccEmails
    );

  const bcc =
    formatAddressList(
      bccEmails
    );

  const headers: string[] = [
    `From: Joel Cimpean <${safeFrom}>`,
    `To: ${safeTo}`,
  ];

  if (cc) {
    headers.push(
      `Cc: ${cc}`
    );
  }

  if (bcc) {
    headers.push(
      `Bcc: ${bcc}`
    );
  }

  headers.push(
    `Subject: ${encodeSubject(
      safeSubject
    )}`,
    `In-Reply-To: ${safeInReplyTo}`,
    `References: ${safeReferences}`,
    "MIME-Version: 1.0"
  );

  /* =======================================================
     NO ATTACHMENTS
  ======================================================= */

  if (
    attachments.length ===
    0
  ) {
    const message = [
      ...headers,

      'Content-Type: text/plain; charset="UTF-8"',

      "Content-Transfer-Encoding: 8bit",

      "",

      body,
    ].join(
      "\r\n"
    );

    return Buffer.from(
      message,
      "utf8"
    ).toString(
      "base64url"
    );
  }

  /* =======================================================
     MULTIPART MESSAGE
  ======================================================= */

  const boundary =
    `joel-leados-${randomBytes(
      18
    ).toString(
      "hex"
    )}`;

  const messageParts: string[] = [
    ...headers,

    `Content-Type: multipart/mixed; boundary="${boundary}"`,

    "",

    `--${boundary}`,

    'Content-Type: text/plain; charset="UTF-8"',

    "Content-Transfer-Encoding: 8bit",

    "",

    body,
  ];

  for (
    const attachment of
      attachments
  ) {
    const fallbackName =
      safeAsciiFilename(
        attachment.filename
      );

    const utf8Name =
      encodeFilename(
        attachment.filename
      );

    const contentType =
      safeContentType(
        attachment.contentType
      );

    const base64Content =
      wrapBase64(
        attachment.content.toString(
          "base64"
        )
      );

    messageParts.push(
      `--${boundary}`,

      `Content-Type: ${contentType}; name="${fallbackName}"`,

      `Content-Disposition: attachment; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`,

      "Content-Transfer-Encoding: base64",

      "",

      base64Content
    );
  }

  messageParts.push(
    `--${boundary}--`,
    ""
  );

  const rawMessage =
    messageParts.join(
      "\r\n"
    );

  return Buffer.from(
    rawMessage,
    "utf8"
  ).toString(
    "base64url"
  );
}

/* =========================================================
   AUTHENTICATED CLIENT
========================================================= */

function createAuthenticatedGmailClient(
  encryptedRefreshToken: string
) {
  const refreshToken =
    decryptGmailToken(
      encryptedRefreshToken
    );

  const oauth2Client =
    createGmailOAuthClient();

  oauth2Client.setCredentials({
    refresh_token:
      refreshToken,
  });

  return google.gmail({
    version:
      "v1",

    auth:
      oauth2Client,
  });
}

/* =========================================================
   SEND NORMAL MESSAGE
========================================================= */

export async function sendGmailMessage({
  fromEmail,
  toEmail,
  subject,
  body,
  htmlBody,
  inlineImages = [],
  encryptedRefreshToken,
}: SendGmailMessageInput) {
  const gmail =
    createAuthenticatedGmailClient(
      encryptedRefreshToken
    );

  const raw =
    createRawMessage({
      fromEmail,
      toEmail,
      subject,
      body,
      htmlBody,
      inlineImages,
    });

  const response =
    await gmail.users.messages.send({
      userId:
        "me",

      requestBody: {
        raw,
      },
    });

  if (
    !response.data.id
  ) {
    throw new Error(
      "Gmail did not return a message ID."
    );
  }

  return {
    messageId:
      response.data.id,

    threadId:
      response.data.threadId ??
      null,
  };
}

/* =========================================================
   SEND REPLY
========================================================= */

export async function sendGmailReply({
  fromEmail,
  body,
  encryptedRefreshToken,
  replyToGmailMessageId,
  gmailThreadId,
  ccEmails = [],
  bccEmails = [],
  attachments = [],
}: SendGmailReplyInput) {
  const gmail =
    createAuthenticatedGmailClient(
      encryptedRefreshToken
    );

  /* =======================================================
     LOAD PARENT MESSAGE
  ======================================================= */

  const parentResponse =
    await gmail.users.messages.get({
      userId:
        "me",

      id:
        replyToGmailMessageId,

      format:
        "metadata",

      metadataHeaders: [
        "From",
        "Reply-To",
        "Subject",
        "Message-ID",
        "References",
      ],
    });

  const headers =
    parentResponse.data
      .payload
      ?.headers ??
    [];

  const parentFrom =
    getHeader(
      headers,
      "From"
    );

  const parentReplyTo =
    getHeader(
      headers,
      "Reply-To"
    );

  const parentSubject =
    getHeader(
      headers,
      "Subject"
    );

  const parentMessageId =
    getHeader(
      headers,
      "Message-ID"
    );

  const parentReferences =
    getHeader(
      headers,
      "References"
    );

  /* =======================================================
     RECIPIENT
  ======================================================= */

  const toEmail =
    extractEmailAddress(
      parentReplyTo
    ) ??
    extractEmailAddress(
      parentFrom
    );

  if (
    !toEmail
  ) {
    throw new Error(
      "Could not determine the reply recipient."
    );
  }

  if (
    !parentSubject
  ) {
    throw new Error(
      "The email being replied to has no subject."
    );
  }

  if (
    !parentMessageId
  ) {
    throw new Error(
      "The email being replied to has no RFC Message-ID."
    );
  }

  const references =
    [
      parentReferences,
      parentMessageId,
    ]
      .filter(Boolean)
      .join(" ");

  /* =======================================================
     CREATE MIME MESSAGE
  ======================================================= */

  const raw =
    createRawReply({
      fromEmail,

      toEmail,

      ccEmails,

      bccEmails,

      subject:
        parentSubject,

      body,

      inReplyTo:
        parentMessageId,

      references,

      attachments,
    });

  /* =======================================================
     SEND
  ======================================================= */

  const response =
    await gmail.users.messages.send({
      userId:
        "me",

      requestBody: {
        raw,

        threadId:
          gmailThreadId,
      },
    });

  if (
    !response.data.id
  ) {
    throw new Error(
      "Gmail did not return a message ID for the reply."
    );
  }

  return {
    messageId:
      response.data.id,

    threadId:
      response.data.threadId ??
      gmailThreadId,

    toEmail,

    subject:
      parentSubject,
  };
}