import { formatAccountMoney } from "@/lib/account-currency";
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
  language?: "de" | "en";
  issuedAt?: string | null;
  acceptedAt?: string | null;
  acceptedByName?: string | null;
  acceptanceStatement?: string | null;
  publicToken?: string | null;
  proposalNumber?: string | null;
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
  currency: string,
  language: "de" | "en"
) {
  return formatAccountMoney(value, currency || "EUR", language);
}

function formatDate(
  value: string | null | undefined,
  language: "de" | "en"
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
    language === "de"
      ? "de-DE"
      : "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value: string | null | undefined,
  language: "de" | "en"
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
    language === "de"
      ? "de-DE"
      : "en-GB",
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
  const language:
    "de" | "en" =
      data.language === "en"
        ? "en"
        : "de";

  const isGerman =
    language === "de";

  const copy =
    isGerman
      ? {
          proposal: "Projektangebot",
          validUntil: "Gültig bis",
          issued: "Ausgestellt",
          proposalNo: "Angebot Nr.",
          parties: "Parteien",
          provider: "Anbieter",
          client: "Kunde",
          scope: "Leistungsumfang",
          scopeFallback: "Individuell abgestimmter Projektumfang",
          investment: "Investition & Zeitrahmen",
          projectPrice: "Projektpreis",
          projectPriceNote: "vereinbarter Projektumfang",
          timeline: "Zeitrahmen",
          individual: "Individuell",
          fromProjectStart: "ab Projektstart",
          validity: "Gültigkeit",
          acceptBy: "Annahme bis zu diesem Datum",
          guarantee: "Geld-zurück-Garantie für Erstkunden",
          guaranteeBody: "Sollte die erste vorgestellte Designrichtung nicht zu den Erwartungen passen, kann das Projekt vor Beginn der Umsetzung beendet werden. Bereits gezahlte Website-Honorare werden in diesem Fall zurückerstattet, sofern die Rückmeldung innerhalb von fünf Werktagen nach Präsentation schriftlich erfolgt.",
          guaranteeItems: [
            "Die Garantie gilt nur, solange noch keine Designrichtung freigegeben oder umgesetzt wurde.",
            "Geänderte Anforderungen, verspätete Kunden-Inputs und Drittanbieter-Kosten sind ausgenommen.",
            "Bei einer Rückerstattung verbleiben die vorgestellten Konzepte beim Anbieter und dürfen nicht weiterverwendet werden.",
          ],
          acceptance: "Annahme",
          acceptanceIntro: "Mit der Annahme bestätigt der Kunde den oben beschriebenen Projektumfang, den Preis und die aufgeführten Rahmenbedingungen.",
          acceptedOnline: "Verbindlich online angenommen",
          status: "Angebotsstatus",
          notAccepted: "Noch nicht angenommen",
        }
      : {
          proposal: "Project proposal",
          validUntil: "Valid until",
          issued: "Issued",
          proposalNo: "Proposal no.",
          parties: "Parties",
          provider: "Provider",
          client: "Client",
          scope: "Scope",
          scopeFallback: "Individually agreed project scope",
          investment: "Investment & timeline",
          projectPrice: "Project price",
          projectPriceNote: "agreed project scope",
          timeline: "Timeline",
          individual: "Individual",
          fromProjectStart: "from project start",
          validity: "Validity",
          acceptBy: "Acceptance by this date",
          guarantee: "First-client money-back guarantee",
          guaranteeBody: "If the first proposed design direction does not meet expectations, the project can be ended before implementation begins. Website fees already paid will be refunded if written feedback is provided within five business days of the presentation.",
          guaranteeItems: [
            "The guarantee applies while no design direction has been approved or implemented.",
            "Changed requirements, delayed client inputs and third-party costs are excluded.",
            "If refunded, the presented concepts remain with the provider and may not be reused.",
          ],
          acceptance: "Acceptance",
          acceptanceIntro: "By accepting, the client confirms the project scope, price and terms stated above.",
          acceptedOnline: "Accepted online",
          status: "Proposal status",
          notAccepted: "Not yet accepted",
        };

  const accent =
    safeColor(
      data.accentColor
    );

  const websiteUrl =
    normalizeUrl(
      data.websiteUrl
    );

  const proposalNumber =
    data.proposalNumber?.trim() ||
    (data.publicToken
      ? `ANG-${(
          data.issuedAt ??
          new Date().toISOString()
        ).slice(0, 4)}-${data.publicToken
          .replace(/[^a-z0-9]/gi, "")
          .slice(0, 6)
          .toUpperCase()}`
      : isGerman
        ? "ANGEBOT"
        : "PROPOSAL");

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
          <td>${escapeHtml(copy.scopeFallback)}</td>
        </tr>`;

  const storedCustomSections =
    normalizeProposalSections(
      data.customSections ?? []
    );

  const customSections =
    storedCustomSections.length > 0
      ? storedCustomSections
      : defaultProposalCustomSections(language);

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
          <div class="section-title"><span>${guaranteeNumber}.</span> ${escapeHtml(copy.guarantee.toUpperCase())}</div>
          <p>${escapeHtml(copy.guaranteeBody)}</p>
          <ul>
            ${copy.guaranteeItems
              .map(
                (item) =>
                  `<li>${escapeHtml(item)}</li>`
              )
              .join("")}
          </ul>
        </section>`
      : "";

  const acceptanceHtml =
    data.acceptedAt
      ? `
        <div class="acceptance accepted">
          <div class="accepted-mark">✓</div>
          <div>
            <strong>${escapeHtml(copy.acceptedOnline)}</strong>
            <div>${escapeHtml(
              data.acceptedByName?.trim()
                ? `${data.acceptedByName.trim()} · ${formatDateTime(data.acceptedAt, language)}`
                : formatDateTime(data.acceptedAt, language)
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
          <strong>${escapeHtml(copy.status)}</strong>
          <div>${escapeHtml(copy.notAccepted)}</div>
        </div>`;

  return `<!doctype html>
<html lang="${language}">
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
      <div class="eyebrow">${escapeHtml(copy.validUntil)}</div>
      <div class="meta-value">${escapeHtml(formatDate(data.validUntil, language))}</div>
    </div>
    <div>
      <div class="eyebrow">${escapeHtml(copy.issued)}</div>
      <div class="meta-value">${escapeHtml(formatDate(data.issuedAt ?? new Date().toISOString(), language))}</div>
    </div>
    <div>
      <div class="eyebrow">${escapeHtml(copy.proposalNo)}</div>
      <div class="meta-value">${escapeHtml(proposalNumber)}</div>
    </div>
  </div>

  <div class="hero">
    <div class="accent-eyebrow">${escapeHtml(copy.proposal)}</div>
    <h1>${escapeHtml(data.title)}</h1>
    ${data.introText
      ? `<div class="intro">${paragraphHtml(data.introText)}</div>`
      : ""}
  </div>

  <section>
    <div class="section-title"><span>01.</span> ${escapeHtml(copy.parties.toUpperCase())}</div>
    <div class="party-grid">
      <div class="party-label">${escapeHtml(copy.provider)}</div>
      <div class="party-value">Joel Cimpean · Webdesign & Webentwicklung · hello@joelcimpean.com</div>
      <div class="party-label">${escapeHtml(copy.client)}</div>
      <div class="party-value">
        ${escapeHtml(data.clientName)}
        ${data.contactName ? `<br><span class="muted">${escapeHtml(data.contactName)}</span>` : ""}
        ${websiteUrl ? `<br><span class="muted">${escapeHtml(websiteUrl)}</span>` : ""}
      </div>
    </div>
  </section>

  <section>
    <div class="section-title"><span>02.</span> ${escapeHtml(copy.scope.toUpperCase())}</div>
    <table class="scope-table">${scopeHtml}</table>
  </section>

  <section>
    <div class="section-title"><span>03.</span> ${escapeHtml(copy.investment.toUpperCase())}</div>
    <div class="metric-grid">
      <div class="metric">
        <div class="metric-label">${escapeHtml(copy.projectPrice)}</div>
        <div class="metric-value">${escapeHtml(formatMoney(data.price, data.currency, language))}</div>
        <div class="metric-note">${escapeHtml(copy.projectPriceNote)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">${escapeHtml(copy.timeline)}</div>
        <div class="metric-value" style="font-size:12pt">${escapeHtml(data.timelineText?.trim() || copy.individual)}</div>
        <div class="metric-note">${escapeHtml(copy.fromProjectStart)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">${escapeHtml(copy.validity)}</div>
        <div class="metric-value" style="font-size:12pt">${escapeHtml(formatDate(data.validUntil, language))}</div>
        <div class="metric-note">${escapeHtml(copy.acceptBy)}</div>
      </div>
    </div>
    ${data.notes ? `<div class="note-box">${paragraphHtml(data.notes)}</div>` : ""}
  </section>


  ${customSectionsHtml}

  ${guaranteeHtml}

  <section>
    <div class="section-title"><span>${acceptanceNumber}.</span> ${escapeHtml(copy.acceptance.toUpperCase())}</div>
    <p>${escapeHtml(copy.acceptanceIntro)}</p>
    ${acceptanceHtml}
  </section>

  <div class="footer">
    <div>
      <strong>Joel Cimpean</strong> · Webdesign & Webentwicklung<br>
      hello@joelcimpean.com · joelcimpean.com
    </div>
    <div style="text-align:right">
      ${escapeHtml(proposalNumber)}<br>
      ${escapeHtml(formatMoney(data.price, data.currency, language))}
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
        locale: data.language === "en" ? "en-GB" : "de-DE",
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
  clientName: string,
  language: "de" | "en" = "de"
) {
  const safe = clientName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return language === "de"
    ? `Angebot-${safe || "Kunde"}.pdf`
    : `Proposal-${safe || "Client"}.pdf`;
}

/**
 * Generates the PDF from the real public proposal page instead of maintaining
 * a second, simplified PDF template. This guarantees that Signature, Minimal,
 * Kontur, Kanzlei, Prisma, Atelier and Kompakt use the exact selected design.
 */
export async function buildProposalPdfFromPublicProposal({
  origin,
  token,
  language = "de",
}: {
  origin: string;
  token: string;
  language?: "de" | "en";
}) {
  const browser = await launchServerBrowser();

  try {
    const context = await browser.newContext({
      locale: language === "en" ? "en-GB" : "de-DE",
      serviceWorkers: "block",
    });

    try {
      const page = await context.newPage();
      const base = origin.replace(/\/+$/, "");
      const publicUrl = `${base}/proposal/${encodeURIComponent(token)}?pdf=1`;

      const response = await page.goto(publicUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      if (!response || !response.ok()) {
        throw new Error(
          `Public proposal page returned ${response?.status() ?? "no response"}.`,
        );
      }

      await page.emulateMedia({ media: "print" });

      await page.evaluate(async () => {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 8_000)),
          ]);
        } catch {
          // The PDF still renders with fallbacks if a remote font cannot load.
        }
      });

      await page.addStyleTag({
        content: `
          @page { size: A4 portrait; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          [data-picker], [data-noprint], .lb-proposal-print-hide {
            display: none !important;
          }
        `,
      });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      return Buffer.from(pdf);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
