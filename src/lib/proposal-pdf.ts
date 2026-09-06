import "server-only";

import {
  launchServerBrowser,
} from "@/lib/server-browser";

import {
  defaultProposalCustomSections,
  normalizeProposalSections,
  type ProposalCustomSection,
} from "@/lib/proposal-sections";

export type ProposalPdfData = {
  title: string;
  clientName: string;
  contactName?: string | null;
  websiteUrl?: string | null;
  introText?: string | null;
  scope: string[];
  timelineText?: string | null;
  price: number;
  currency: string;
  validUntil?: string | null;
  notes?: string | null;
  customSections?: ProposalCustomSection[];
  accentColor?: string | null;
  logoUrl?: string | null;
  firstTimeClient: boolean;
  issuedAt?: string | null;
  acceptedAt?: string | null;
  acceptedByName?: string | null;
  acceptanceStatement?: string | null;
  publicToken?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeColor(value?: string | null) {
  const normalized =
    value?.trim() ?? "";

  return /^#[0-9A-F]{6}$/i.test(
    normalized
  )
    ? normalized.toUpperCase()
    : "#002BBA";
}

function formatMoney(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency,
      maximumFractionDigits:
        Number.isInteger(value)
          ? 0
          : 2,
    }
  ).format(value);
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T12:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone: "Europe/Berlin",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function normalizeUrl(
  value?: string | null
) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`
    );

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function paragraphHtml(
  value?: string | null
) {
  if (!value?.trim()) {
    return "";
  }

  return escapeHtml(value.trim())
    .replace(/\n/g, "<br>");
}

function customSectionHtml(content: string) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n");

  const output: string[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join(" ").trim();
    if (value) {
      output.push(`<p>${escapeHtml(value)}</p>`);
    }
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length > 0) {
      output.push(
        `<ul>${bullets
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`
      );
    }
    bullets = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (/^[-•]\s+/.test(line)) {
      flushParagraph();
      bullets.push(line.replace(/^[-•]\s+/, ""));
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushBullets();

  return output.join("");
}

function buildProposalHtml(
  data: ProposalPdfData
) {
  const accent =
    safeColor(
      data.accentColor
    );

  const websiteUrl =
    normalizeUrl(
      data.websiteUrl
    );

  const proposalNumber =
    data.publicToken
      ? `ANG-${(
          data.issuedAt ??
          new Date().toISOString()
        ).slice(0, 4)}-${data.publicToken
          .replace(/[^a-z0-9]/gi, "")
          .slice(0, 6)
          .toUpperCase()}`
      : "ANGEBOT";

  const scopeHtml =
    data.scope.length > 0
      ? data.scope
          .map(
            (item) => `
              <tr>
                <td class="check">✓</td>
                <td>${escapeHtml(item)}</td>
              </tr>`
          )
          .join("")
      : `
        <tr>
          <td class="check">✓</td>
          <td>Individuell abgestimmter Projektumfang</td>
        </tr>`;

  const storedCustomSections =
    normalizeProposalSections(
      data.customSections ?? []
    );

  const customSections =
    storedCustomSections.length > 0
      ? storedCustomSections
      : defaultProposalCustomSections("de");

  const customSectionsHtml =
    customSections
      .map((section, index) => `
        <section>
          <div class="section-title"><span>${String(index + 4).padStart(2, "0")}.</span> ${escapeHtml(section.title)}</div>
          ${customSectionHtml(section.content)}
        </section>`)
      .join("");

  const guaranteeNumber =
    String(customSections.length + 4).padStart(2, "0");

  const acceptanceNumber =
    String(
      customSections.length +
      (data.firstTimeClient ? 5 : 4)
    ).padStart(2, "0");

  const guaranteeHtml =
    data.firstTimeClient
      ? `
        <section>
          <div class="section-title"><span>${guaranteeNumber}.</span> GELD-ZURÜCK-GARANTIE FÜR ERSTKUNDEN</div>
          <p>
            Sollte die erste vorgestellte Designrichtung nicht zu den Erwartungen passen, kann das Projekt vor Beginn der Umsetzung beendet werden. Bereits gezahlte Website-Honorare werden in diesem Fall zurückerstattet, sofern die Rückmeldung innerhalb von fünf Werktagen nach Präsentation schriftlich erfolgt.
          </p>
          <ul>
            <li>Die Garantie gilt nur, solange noch keine Designrichtung freigegeben oder umgesetzt wurde.</li>
            <li>Geänderte Anforderungen, verspätete Kunden-Inputs und Drittanbieter-Kosten sind ausgenommen.</li>
            <li>Bei einer Rückerstattung verbleiben die vorgestellten Konzepte beim Anbieter und dürfen nicht weiterverwendet werden.</li>
          </ul>
        </section>`
      : "";

  const acceptanceHtml =
    data.acceptedAt
      ? `
        <div class="acceptance accepted">
          <div class="accepted-mark">✓</div>
          <div>
            <strong>Verbindlich online angenommen</strong>
            <div>${escapeHtml(
              data.acceptedByName?.trim()
                ? `${data.acceptedByName.trim()} · ${formatDateTime(data.acceptedAt)}`
                : formatDateTime(data.acceptedAt)
            )}</div>
            ${
              data.acceptanceStatement?.trim()
                ? `<div class="acceptance-statement">${escapeHtml(
                    data.acceptanceStatement.trim()
                  )}</div>`
                : ""
            }
          </div>
        </div>`
      : `
        <div class="acceptance">
          <strong>Angebotsstatus</strong>
          <div>Noch nicht angenommen</div>
        </div>`;

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 21mm 16mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #141414;
      background: #ffffff;
      font-size: 10.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .footer {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-top: 10mm;
      border-top: 1px solid #d8d8d8;
      padding-top: 7px;
      font-size: 7.6pt;
      line-height: 1.35;
      color: #777;
    }

    .footer strong { color: #222; }

    .topline {
      display: grid;
      grid-template-columns: 1.5fr .72fr .72fr .9fr;
      gap: 18px;
      align-items: start;
      margin-bottom: 19mm;
    }

    .logo {
      max-width: 205px;
      max-height: 58px;
      object-fit: contain;
      object-position: left center;
    }

    .provider-name {
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: -.02em;
    }

    .eyebrow {
      margin-bottom: 4px;
      font-size: 7.4pt;
      font-weight: 700;
      letter-spacing: .16em;
      text-transform: uppercase;
      color: #8a8a8a;
    }

    .meta-value {
      font-size: 9pt;
      font-weight: 600;
      line-height: 1.35;
    }

    .accent-eyebrow {
      margin-bottom: 7px;
      font-size: 7.7pt;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: ${accent};
    }

    h1 {
      margin: 0;
      max-width: 150mm;
      font-size: 28pt;
      line-height: 1.05;
      letter-spacing: -.045em;
      font-weight: 700;
    }

    .intro {
      max-width: 150mm;
      margin: 12px 0 0;
      color: #555;
      font-size: 11pt;
      line-height: 1.6;
    }

    .hero {
      padding-bottom: 14mm;
    }

    section {
      page-break-inside: avoid;
      border-top: 1.2px solid #181818;
      padding: 8mm 0 7mm;
    }

    .section-title {
      display: flex;
      gap: 7px;
      margin-bottom: 5mm;
      font-size: 8.2pt;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .section-title span {
      color: ${accent};
    }

    .party-grid {
      display: grid;
      grid-template-columns: 42mm 1fr;
      gap: 5mm 12mm;
      align-items: start;
    }

    .party-label {
      color: #666;
      font-size: 9pt;
    }

    .party-value {
      font-weight: 600;
    }

    .scope-table {
      width: 100%;
      border-collapse: collapse;
    }

    .scope-table td {
      border-bottom: 1px solid #e6e6e6;
      padding: 8px 0;
      vertical-align: top;
    }

    .scope-table tr:last-child td {
      border-bottom: 0;
    }

    .check {
      width: 26px;
      color: ${accent};
      font-weight: 800;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid #252525;
    }

    .metric {
      min-height: 25mm;
      padding: 10px 12px;
      border-right: 1px solid #252525;
    }

    .metric:last-child {
      border-right: 0;
    }

    .metric-label {
      margin-bottom: 3px;
      font-size: 7.4pt;
      letter-spacing: .13em;
      text-transform: uppercase;
      color: #777;
    }

    .metric-value {
      font-size: 15pt;
      font-weight: 700;
      letter-spacing: -.025em;
    }

    .metric-note {
      margin-top: 2px;
      font-size: 8.2pt;
      line-height: 1.35;
      color: #666;
    }

    p {
      margin: 0 0 8px;
    }

    ul {
      margin: 7px 0 0 17px;
      padding: 0;
    }

    li {
      margin: 4px 0;
    }

    .note-box {
      margin-top: 7mm;
      border-left: 3px solid ${accent};
      background: #f6f6f6;
      padding: 10px 12px;
      color: #4d4d4d;
    }

    .acceptance {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 3mm;
      border: 1px solid #d9d9d9;
      border-radius: 9px;
      padding: 10px 12px;
    }

    .acceptance.accepted {
      border-color: ${accent};
      background: #fafafa;
    }

    .accepted-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: ${accent};
      color: #fff;
      font-weight: 700;
    }

    .acceptance-statement {
      margin-top: 4px;
      color: #666;
      font-size: 9pt;
    }

    .muted { color: #666; }
  </style>
</head>
<body>
  <div class="topline">
    <div>
      ${data.logoUrl
        ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt="Logo">`
        : `<div class="provider-name">Joel Cimpean</div>`}
    </div>
    <div>
      <div class="eyebrow">Gültig bis</div>
      <div class="meta-value">${escapeHtml(formatDate(data.validUntil))}</div>
    </div>
    <div>
      <div class="eyebrow">Ausgestellt</div>
      <div class="meta-value">${escapeHtml(formatDate(data.issuedAt ?? new Date().toISOString()))}</div>
    </div>
    <div>
      <div class="eyebrow">Angebot Nr.</div>
      <div class="meta-value">${escapeHtml(proposalNumber)}</div>
    </div>
  </div>

  <div class="hero">
    <div class="accent-eyebrow">Projektangebot</div>
    <h1>${escapeHtml(data.title)}</h1>
    ${data.introText
      ? `<div class="intro">${paragraphHtml(data.introText)}</div>`
      : ""}
  </div>

  <section>
    <div class="section-title"><span>01.</span> PARTEIEN</div>
    <div class="party-grid">
      <div class="party-label">Anbieter</div>
      <div class="party-value">Joel Cimpean · Webdesign & Webentwicklung · hello@joelcimpean.com</div>
      <div class="party-label">Kunde</div>
      <div class="party-value">
        ${escapeHtml(data.clientName)}
        ${data.contactName ? `<br><span class="muted">${escapeHtml(data.contactName)}</span>` : ""}
        ${websiteUrl ? `<br><span class="muted">${escapeHtml(websiteUrl)}</span>` : ""}
      </div>
    </div>
  </section>

  <section>
    <div class="section-title"><span>02.</span> LEISTUNGSUMFANG</div>
    <table class="scope-table">${scopeHtml}</table>
  </section>

  <section>
    <div class="section-title"><span>03.</span> INVESTITION & ZEITRAHMEN</div>
    <div class="metric-grid">
      <div class="metric">
        <div class="metric-label">Projektpreis</div>
        <div class="metric-value">${escapeHtml(formatMoney(data.price, data.currency))}</div>
        <div class="metric-note">vereinbarter Projektumfang</div>
      </div>
      <div class="metric">
        <div class="metric-label">Zeitrahmen</div>
        <div class="metric-value" style="font-size:12pt">${escapeHtml(data.timelineText?.trim() || "Individuell")}</div>
        <div class="metric-note">ab Projektstart</div>
      </div>
      <div class="metric">
        <div class="metric-label">Gültigkeit</div>
        <div class="metric-value" style="font-size:12pt">${escapeHtml(formatDate(data.validUntil))}</div>
        <div class="metric-note">Annahme bis zu diesem Datum</div>
      </div>
    </div>
    ${data.notes ? `<div class="note-box">${paragraphHtml(data.notes)}</div>` : ""}
  </section>


  ${customSectionsHtml}

  ${guaranteeHtml}

  <section>
    <div class="section-title"><span>${acceptanceNumber}.</span> ANNAHME</div>
    <p>Mit der Annahme bestätigt der Kunde den oben beschriebenen Projektumfang, den Preis und die aufgeführten Rahmenbedingungen.</p>
    ${acceptanceHtml}
  </section>

  <div class="footer">
    <div>
      <strong>Joel Cimpean</strong> · Webdesign & Webentwicklung<br>
      hello@joelcimpean.com · joelcimpean.com
    </div>
    <div style="text-align:right">
      ${escapeHtml(proposalNumber)}<br>
      ${escapeHtml(formatMoney(data.price, data.currency))}
    </div>
  </div>
</body>
</html>`;
}

export async function buildProposalPdf(
  data: ProposalPdfData
) {
  const browser =
    await launchServerBrowser();

  try {
    const context =
      await browser.newContext({
        locale: "de-DE",
        serviceWorkers: "block",
      });

    try {
      const page =
        await context.newPage();

      await page.setContent(
        buildProposalHtml(data),
        {
          waitUntil:
            "networkidle",
        }
      );

      await page.emulateMedia({
        media: "print",
      });

      const pdf =
        await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });

      return Buffer.from(pdf);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

export function proposalPdfFilename(
  clientName: string
) {
  const safe = clientName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `Angebot-${safe || "Kunde"}.pdf`;
}
