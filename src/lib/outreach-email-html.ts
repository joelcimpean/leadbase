import "server-only";

import { normalizeBrandColor, readableTextColor } from "@/lib/brand-kit";

/* =========================================================
   TYPES
========================================================= */

type BuildOutreachHtmlInput = {
  textBody: string;
  previewUrl: string;
  gifContentId: string;
  language?: string | null;
  brandColor?: string | null;
};

/* =========================================================
   SAFETY
========================================================= */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function sanitizeContentId(value: string) {
  return value
    .replace(/[^A-Za-z0-9._@+-]/g, "")
    .trim();
}

/* =========================================================
   TEXT RENDERING
========================================================= */

function renderInlineText(value: string) {
  const urlPattern =
    /(https?:\/\/[^\s<>]+)/gi;

  const parts =
    value.split(urlPattern);

  return parts
    .map((part) => {
      if (isHttpUrl(part)) {
        const href =
          escapeAttribute(part);

        const label =
          escapeHtml(part);

        return `<a href="${href}" target="_blank" style="color:#002BBA;text-decoration:underline;text-underline-offset:2px;word-break:break-word;">${label}</a>`;
      }

      return escapeHtml(part);
    })
    .join("");
}

function renderTextBlock(value: string) {
  const normalized =
    value
      .replace(/\r\n/g, "\n")
      .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<div style="margin:0 0 18px 0;">${renderInlineText(
          paragraph
        ).replace(/\n/g, "<br>")}</div>`
    )
    .join("");
}

/* =========================================================
   PREVIEW PLACEMENT
========================================================= */

function splitAroundPreviewUrl({
  textBody,
  previewUrl,
}: {
  textBody: string;
  previewUrl: string;
}) {
  const exactIndex =
    textBody.indexOf(previewUrl);

  if (exactIndex >= 0) {
    return {
      before:
        textBody
          .slice(0, exactIndex)
          .trimEnd(),

      after:
        textBody
          .slice(
            exactIndex +
              previewUrl.length
          )
          .trimStart(),
    };
  }

  const conceptUrlPattern =
    /https?:\/\/[^\s<>]+\/concept\/[^\s<>]+/i;

  const match =
    textBody.match(
      conceptUrlPattern
    );

  if (
    match?.index !== undefined
  ) {
    return {
      before:
        textBody
          .slice(0, match.index)
          .trimEnd(),

      after:
        textBody
          .slice(
            match.index +
              match[0].length
          )
          .trimStart(),
    };
  }

  const signatureMarker =
    "Mit freundlichen Grüßen / Kind regards,";

  const signatureIndex =
    textBody.indexOf(
      signatureMarker
    );

  if (signatureIndex >= 0) {
    return {
      before:
        textBody
          .slice(
            0,
            signatureIndex
          )
          .trimEnd(),

      after:
        textBody
          .slice(
            signatureIndex
          )
          .trimStart(),
    };
  }

  return {
    before:
      textBody.trim(),
    after: "",
  };
}

/* =========================================================
   EMAIL HTML
========================================================= */

export function buildOutreachHtmlEmail({
  textBody,
  previewUrl,
  gifContentId,
  language,
  brandColor,
}: BuildOutreachHtmlInput) {
  const cleanTextBody =
    textBody.trim();

  const cleanContentId =
    sanitizeContentId(
      gifContentId
    );

  const accentColor =
    normalizeBrandColor(
      brandColor
    );

  const accentTextColor =
    readableTextColor(
      accentColor
    );

  if (
    !cleanTextBody ||
    !isHttpUrl(previewUrl) ||
    !cleanContentId
  ) {
    return null;
  }

  const safePreviewUrl =
    escapeAttribute(
      previewUrl
    );

  const safeContentId =
    escapeAttribute(
      cleanContentId
    );

  const normalizedLanguage =
    language
      ?.trim()
      .toUpperCase();

  const isEnglish =
    normalizedLanguage === "EN" ||
    normalizedLanguage ===
      "ENGLISH";

  const previewLabel =
    isEnglish
      ? "Website design preview"
      : "Unverbindliche Designvorschau";

  const buttonLabel =
    isEnglish
      ? "View design preview"
      : "Designvorschau ansehen";

  const imageAlt =
    isEnglish
      ? "Preview of a possible website redesign"
      : "Vorschau einer möglichen neuen Website-Richtung";

  const {
    before,
    after,
  } = splitAroundPreviewUrl({
    textBody: cleanTextBody,
    previewUrl,
  });

  const beforeHtml =
    renderTextBlock(before);

  const afterHtml =
    renderTextBlock(after);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    >
    <meta
      name="format-detection"
      content="telephone=no,date=no,address=no,email=no,url=no"
    >

    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }

      img {
        border: 0;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
      }

      /*
       * Keep the CTA background on the saved Brand Color.
       *
       * Gmail mobile dark mode can rewrite normal
       * background-color values. The gradient provides
       * another layer that Gmail generally preserves.
       */
      .leadbase-button-cell {
        background-color: ${accentColor} !important;
        background-image:
          linear-gradient(
            ${accentColor},
            ${accentColor}
          ) !important;
      }

      .leadbase-button-link {
        color: ${accentTextColor} !important;
        -webkit-text-fill-color:
          ${accentTextColor} !important;
        text-decoration: none !important;
      }

      /*
       * Gmail iOS / mobile dark mode workaround.
       *
       * The Gmail-specific "u + .body" selector prevents
       * these blend modes from affecting normal clients.
       *
       * The nested screen/difference layers are placed
       * directly around the CTA text so Gmail's dark-mode
       * color transformation is neutralized as reliably
       * as possible.
       */
      u + .body
        .gmail-blend-screen {
        background: #000000;
        mix-blend-mode: screen;
      }

      u + .body
        .gmail-blend-difference {
        background: #000000;
        mix-blend-mode: difference;
        color: ${accentTextColor} !important;
        -webkit-text-fill-color:
          ${accentTextColor} !important;
      }

      u + .body
        .gmail-blend-difference span {
        color: ${accentTextColor} !important;
        -webkit-text-fill-color:
          ${accentTextColor} !important;
      }

      @media only screen and (max-width: 620px) {
        .leadbase-body {
          background: transparent !important;
          background-color:
            transparent !important;
        }

        .leadbase-mobile-padding {
          padding-left: 4px !important;
          padding-right: 4px !important;
          background:
            transparent !important;
        }

        .leadbase-shell,
        .leadbase-content {
          background:
            transparent !important;
          background-color:
            transparent !important;
        }

        .leadbase-content,
        .leadbase-preview-table {
          width: 100% !important;
          max-width:
            100% !important;
        }

        .leadbase-preview-image {
          width: 100% !important;
          max-width:
            100% !important;
          height: auto !important;
        }

        .leadbase-button-link {
          color: ${accentTextColor} !important;
          -webkit-text-fill-color:
            ${accentTextColor} !important;
        }
      }
    </style>
  </head>

  <body
    class="body leadbase-body"
    style="
      margin:0;
      padding:0;
      background:#ffffff;
      color:#171717;
      width:100%;
      -webkit-text-size-adjust:100%;
      text-size-adjust:100%;
    "
  >
    <table
      class="leadbase-shell"
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width:100%;
        margin:0;
        padding:0;
        border-collapse:collapse;
        background:transparent;
      "
    >
      <tr>
        <td
          class="leadbase-mobile-padding"
          align="left"
          style="padding:0;"
        >
          <table
            class="leadbase-content"
            role="presentation"
            width="620"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:100%;
              max-width:620px;
              margin:0;
              border-collapse:collapse;
            "
          >
            <tr>
              <td
                style="
                  padding:0;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;
                  font-size:16px;
                  line-height:1.65;
                  color:#171717;
                "
              >
                ${beforeHtml}

                <table
                  class="leadbase-preview-table"
                  role="presentation"
                  width="560"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    width:100%;
                    max-width:560px;
                    margin:24px 0;
                    border-collapse:separate;
                    border-spacing:0;
                  "
                >
                  <tr>
                    <td style="padding:0;">
                      <a
                        href="${safePreviewUrl}"
                        target="_blank"
                        style="
                          display:block;
                          width:100%;
                          max-width:560px;
                          text-decoration:none;
                          border:0;
                          outline:none;
                          border-radius:14px;
                          overflow:hidden;
                        "
                      >
                        <img
                          class="leadbase-preview-image"
                          src="cid:${safeContentId}"
                          alt="${escapeAttribute(
                            imageAlt
                          )}"
                          width="560"
                          style="
                            display:block;
                            width:100%;
                            max-width:560px;
                            height:auto;
                            margin:0;
                            border:1px solid #e5e7eb;
                            border-radius:14px;
                            background:#f7f7f8;
                            box-sizing:border-box;
                          "
                        >
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:12px 2px 0 2px;
                        font-size:12px;
                        line-height:1.45;
                        font-weight:600;
                        letter-spacing:0.01em;
                        color:#737373;
                      "
                    >
                      ${escapeHtml(
                        previewLabel
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:10px 0 0 0;
                      "
                    >
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                          border-collapse:separate;
                          border-spacing:0;
                        "
                      >
                        <tr>
                          <td
                            class="leadbase-button-cell"
                            bgcolor="${accentColor}"
                            style="
                              border-radius:9px;
                              background-color:${accentColor};
                              background-image:linear-gradient(
                                ${accentColor},
                                ${accentColor}
                              );
                              color:${accentTextColor};
                            "
                          >
                            <a
                              class="leadbase-button-link"
                              href="${safePreviewUrl}"
                              target="_blank"
                              style="
                                display:inline-block;
                                padding:10px 15px;
                                border-radius:9px;
                                color:${accentTextColor} !important;
                                -webkit-text-fill-color:${accentTextColor} !important;
                                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;
                                font-size:14px;
                                line-height:20px;
                                font-weight:600;
                                text-decoration:none;
                              "
                            >
                              <div
                                class="gmail-blend-screen"
                              >
                                <div
                                  class="gmail-blend-difference"
                                  style="
                                    color:${accentTextColor} !important;
                                    -webkit-text-fill-color:${accentTextColor} !important;
                                  "
                                >
                                  <span
                                    style="
                                      color:${accentTextColor} !important;
                                      -webkit-text-fill-color:${accentTextColor} !important;
                                    "
                                  >
                                    ${escapeHtml(
                                      buttonLabel
                                    )} &#8594;
                                  </span>
                                </div>
                              </div>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${afterHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}