import type {
  CSSProperties,
  ReactNode,
} from "react";

import type {
  Metadata,
} from "next";

import {
  ArrowUpRight,
  Check,
  Download,
  ShieldCheck,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  declineProposal,
} from "./actions";

import {
  ProposalAcceptanceFlow,
} from "./proposal-acceptance-flow";

import {
  ProposalActionButton,
} from "./proposal-action-button";

import {
  ProposalPrintButton,
} from "./proposal-print-button";

import {
  ProposalSectionNav,
} from "./proposal-section-nav";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  defaultProposalCustomSections,
  normalizeProposalSections,
} from "@/lib/proposal-sections";

import {
  ProposalTemplateExperience,
} from "./proposal-template-experience";

import {
  normalizeProposalDesignTemplate,
} from "@/lib/proposal-design-templates";

type PublicProposalPageProps = {
  params: Promise<{
    token: string;
  }>;

  searchParams: Promise<{
    accepted?: string;
    declined?: string;
    pdfEmail?: string;
    error?: string;
  }>;
};

type CustomSection = {
  id: string;
  title: string;
  content: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CREATOR_NAME = "Joel Cimpean";
const CREATOR_EMAIL = "hello@joelcimpean.com";
const CREATOR_WEBSITE = "joelcimpean.com";

function formatMoney(
  value: number,
  currency: string,
  language: "de" | "en"
) {
  return new Intl.NumberFormat(
    language === "de"
      ? "de-DE"
      : "en-GB",
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
  value: string | null | undefined,
  language: "de" | "en"
) {
  if (!value) {
    return "–";
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
    return "–";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return formatDate(value, language);
  }

  return new Intl.DateTimeFormat(
    language === "de"
      ? "de-DE"
      : "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function daysUntil(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T23:59:59`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const now = new Date();
  const milliseconds =
    date.getTime() -
    now.getTime();

  return Math.max(
    0,
    Math.ceil(
      milliseconds /
        (1000 * 60 * 60 * 24)
    )
  );
}

function normalizeUrl(
  value: string
) {
  return /^https?:\/\//i.test(
    value
  )
    ? value
    : `https://${value}`;
}

function websiteLabel(
  value?: string | null
) {
  if (!value) {
    return "–";
  }

  try {
    return new URL(
      normalizeUrl(value)
    ).hostname.replace(
      /^www\./i,
      ""
    );
  } catch {
    return value.replace(
      /^https?:\/\//i,
      ""
    );
  }
}

function safeAccentColor(
  value?: string | null
) {
  return /^#[0-9A-F]{6}$/i.test(
    value?.trim() ?? ""
  )
    ? value!.toUpperCase()
    : "#002BBA";
}

function mixWithWhite(
  hex: string,
  amount: number
) {
  const raw =
    hex.replace("#", "");

  const numeric =
    Number.parseInt(
      raw,
      16
    );

  if (
    Number.isNaN(numeric)
  ) {
    return "#8DA2F0";
  }

  const mix = (
    channel: number
  ) =>
    Math.round(
      channel +
        (255 - channel) *
          amount
    );

  const red = mix(
    (numeric >> 16) & 255
  );
  const green = mix(
    (numeric >> 8) & 255
  );
  const blue = mix(
    numeric & 255
  );

  return `rgb(${red}, ${green}, ${blue})`;
}

function proposalNumber(
  token: string,
  createdAt: string | null | undefined,
  language: "de" | "en"
) {
  const year =
    createdAt?.slice(0, 4) ??
    new Date().getFullYear().toString();

  const suffix = token
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();

  return `${language === "de" ? "ANG" : "OFF"}-${year}-${suffix}`;
}

function sectionAnchor(
  section: CustomSection,
  index: number
) {
  const slug = section.title
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `section-${index + 4}-${slug || section.id}`;
}

function cleanContentLines(
  content: string
) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line.trim()
    );
}

function listItemsFromContent(
  content: string
) {
  const lines =
    cleanContentLines(content);

  const bulletItems = lines
    .filter((line) =>
      /^[-•]\s+/.test(line)
    )
    .map((line) =>
      line.replace(
        /^[-•]\s+/,
        ""
      )
    )
    .filter(Boolean);

  if (
    bulletItems.length > 0
  ) {
    return bulletItems;
  }

  return lines.filter(Boolean);
}

function processItemsFromContent(
  content: string
) {
  const chunks = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((chunk) =>
      chunk.trim()
    )
    .filter(Boolean);

  const items = chunks
    .map((chunk, index) => {
      const lines = chunk
        .split("\n")
        .map((line) =>
          line.trim()
        )
        .filter(Boolean);

      if (
        lines.length === 0
      ) {
        return null;
      }

      const match =
        lines[0].match(
          /^(?:schritt\s*)?(\d+)[.)\s:-]+(.+)$/i
        );

      if (match) {
        return {
          number:
            match[1],
          title:
            match[2].trim(),
          text:
            lines
              .slice(1)
              .join(" ")
              .trim(),
        };
      }

      return {
        number:
          String(index + 1),
        title:
          lines[0],
        text:
          lines
            .slice(1)
            .join(" ")
            .trim(),
      };
    })
    .filter(
      (
        item
      ): item is {
        number: string;
        title: string;
        text: string;
      } => Boolean(item)
    );

  return items;
}

function sectionPresentation(
  section: CustomSection
) {
  const title =
    section.title.toLocaleLowerCase(
      "de-DE"
    );

  if (
    title.includes("deliver") ||
    title.includes("lieferumfang") ||
    title.includes("liefergegen")
  ) {
    return "deliverables" as const;
  }

  if (
    title.includes("prozess") ||
    title.includes("process") ||
    title.includes("ablauf") ||
    title.includes("workflow")
  ) {
    return "process" as const;
  }

  return "generic" as const;
}

export async function generateMetadata({
  params,
}: PublicProposalPageProps): Promise<Metadata> {
  const { token } =
    await params;

  const supabase =
    createAdminClient();

  const { data } =
    await supabase
      .from("proposals")
      .select("client_name,language")
      .eq("public_token", token)
      .maybeSingle();

  const clientName =
    data?.client_name?.trim();

  const proposalLanguage =
    data?.language === "en"
      ? "en"
      : "de";

  return {
    title:
      proposalLanguage === "de"
        ? clientName
          ? `Angebot für ${clientName}`
          : "Angebot"
        : clientName
          ? `Proposal for ${clientName}`
          : "Proposal",
    description:
      proposalLanguage === "de"
        ? "Persönliches Projektangebot von Joel Cimpean."
        : "Personal project proposal from Joel Cimpean.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: PublicProposalPageProps) {
  const [
    { token },
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const supabase =
    createAdminClient();

  const {
    data: proposal,
    error,
  } = await supabase
    .from("proposals")
    .select(`
      title,
      client_name,
      contact_name,
      contact_email,
      website_url,
      intro_text,
      scope,
      timeline_text,
      price,
      currency,
      valid_until,
      notes,
      custom_sections,
      status,
      accent_color,
      logo_url,
      first_time_client,
      design_template,
      proposal_number,
      language,
      revision,
      created_at,
      updated_at,
      accepted_at,
      accepted_by_name,
      declined_at,
      pdf_emailed_at
    `)
    .eq("public_token", token)
    .maybeSingle();

  if (
    error ||
    !proposal
  ) {
    notFound();
  }

  const proposalLanguage:
    "de" | "en" =
      proposal.language ===
      "en"
        ? "en"
        : "de";

  const isGerman =
    proposalLanguage ===
    "de";

  const copy =
    isGerman
      ? {
          content: "Inhalt",
          project: "Das Projekt",
          scope: "Leistungsumfang",
          investment: "Investition",
          investmentFrame: "Investition & Rahmen",
          guarantee: "Garantie",
          accepted: "Angenommen",
          declined: "Abgelehnt",
          acceptance: "Zusage",
          for: "Für",
          client: "Kunde",
          timeline: "Zeitrahmen",
          individual: "Individuell",
          fromProjectStart: "ab Projektstart",
          validUntil: "Gültig bis",
          today: "heute",
          day: "Tag",
          days: "Tage",
          websiteCurrent: "Aktueller Auftritt",
          offer: "Angebot",
          issued: "Ausgestellt",
          projectOffer: "Projektangebot",
          projectSummaryTitle: "Der vereinbarte Projektumfang auf einen Blick.",
          projectSummaryFallback: (clientName: string) =>
            `Dieses Angebot fasst den vereinbarten Leistungsumfang, die Investition und die Rahmenbedingungen für ${clientName} zusammen.`,
          position: "Position",
          positions: "Positionen",
          projectPrice: "Projektpreis",
          fixedPriceNote: "Festpreis · USt. sofern anwendbar",
          payment: "Zahlung",
          byAgreement: "Nach Vereinbarung",
          firstClientGuarantee: "Erstkunde · Geld-zurück-Garantie",
          guaranteeTitle: "Wenn die erste Designrichtung nicht passt, tragen Sie kein Risiko.",
          guaranteeBody: "Sollte die erste vorgestellte Designrichtung nicht zu den Erwartungen passen, kann das Projekt vor Beginn der Umsetzung beendet werden. Bereits gezahlte Website-Honorare werden zurückerstattet, wenn die Rückmeldung innerhalb von fünf Werktagen nach Präsentation schriftlich erfolgt.",
          guaranteeItems: [
            "Gilt, solange keine Designrichtung freigegeben oder umgesetzt wurde.",
            "Geänderte Anforderungen, verspätete Inputs und Drittanbieter-Kosten sind ausgenommen.",
            "Bei Erstattung dürfen die vorgestellten Konzepte nicht weiterverwendet werden.",
          ],
          offerAccepted: "Angebot angenommen",
          acceptedTitle: "Danke — wir starten das Projekt.",
          confirmedBy: "Bestätigt",
          by: "von",
          on: "am",
          pdfSent: "Die PDF-Kopie wurde gesendet an",
          pdfDownloadAvailable: "Die bestätigte PDF kann direkt heruntergeladen werden.",
          downloadPdf: "PDF herunterladen",
          offerDeclined: "Angebot abgelehnt",
          declinedThanks: "Vielen Dank für die Rückmeldung.",
          declinedBody: "Dieses Angebot wurde abgelehnt. Bei Fragen können Sie Joel jederzeit direkt kontaktieren.",
          readyTitle: "Bereit, das Projekt zu starten?",
          acceptanceBody: (price: string) =>
            `Mit der Zusage bestätigen Sie den beschriebenen Leistungsumfang, den Projektpreis von ${price} und die aufgeführten Rahmenbedingungen. Anschließend erhalten Sie automatisch eine PDF-Kopie per E-Mail.`,
          decline: "Ablehnen",
          saving: "Wird gespeichert…",
          createdBy: "Erstellt von",
          questions: "Fragen? Schreib mir.",
          errorMismatch: (name: string) =>
            `Der eingegebene Name stimmt nicht mit dem Ansprechpartner „${name}“ überein.`,
          errorGeneric: "Die Rückmeldung konnte nicht verarbeitet werden. Bitte laden Sie die Seite neu oder kontaktieren Sie Joel direkt.",
          statusOpen: "Offen",
          statusAccepted: "Angenommen",
          statusDeclined: "Abgelehnt",
          printContent: "Angebotsinhalt",
        }
      : {
          content: "Contents",
          project: "Project",
          scope: "Scope",
          investment: "Investment",
          investmentFrame: "Investment & terms",
          guarantee: "Guarantee",
          accepted: "Accepted",
          declined: "Declined",
          acceptance: "Acceptance",
          for: "For",
          client: "Client",
          timeline: "Timeline",
          individual: "Individual",
          fromProjectStart: "from project start",
          validUntil: "Valid until",
          today: "today",
          day: "day",
          days: "days",
          websiteCurrent: "Current website",
          offer: "Proposal",
          issued: "Issued",
          projectOffer: "Project proposal",
          projectSummaryTitle: "The agreed project scope at a glance.",
          projectSummaryFallback: (clientName: string) =>
            `This proposal summarises the agreed scope, investment and terms for ${clientName}.`,
          position: "item",
          positions: "items",
          projectPrice: "Project price",
          fixedPriceNote: "Fixed price · VAT where applicable",
          payment: "Payment",
          byAgreement: "By agreement",
          firstClientGuarantee: "First client · money-back guarantee",
          guaranteeTitle: "If the first design direction is not right, you carry no risk.",
          guaranteeBody: "If the first proposed design direction does not meet expectations, the project can be ended before implementation begins. Website fees already paid will be refunded if written feedback is provided within five business days of the presentation.",
          guaranteeItems: [
            "Applies while no design direction has been approved or implemented.",
            "Changed requirements, delayed client inputs and third-party costs are excluded.",
            "If refunded, the presented concepts remain with the provider and may not be reused.",
          ],
          offerAccepted: "Proposal accepted",
          acceptedTitle: "Thank you — we can start the project.",
          confirmedBy: "Confirmed",
          by: "by",
          on: "on",
          pdfSent: "The PDF copy was sent to",
          pdfDownloadAvailable: "The confirmed PDF can also be downloaded directly.",
          downloadPdf: "Download PDF",
          offerDeclined: "Proposal declined",
          declinedThanks: "Thank you for your response.",
          declinedBody: "This proposal was declined. If you have any questions, you can contact Joel at any time.",
          readyTitle: "Ready to start the project?",
          acceptanceBody: (price: string) =>
            `By accepting, you confirm the described scope, the project price of ${price}, and the stated terms. A PDF copy will then be sent automatically by email.`,
          decline: "Decline",
          saving: "Saving…",
          createdBy: "Created by",
          questions: "Questions? Message me.",
          errorMismatch: (name: string) =>
            `The entered name must match the contact name “${name}”.`,
          errorGeneric: "Your response could not be processed. Please reload the page or contact Joel directly.",
          statusOpen: "Open",
          statusAccepted: "Accepted",
          statusDeclined: "Declined",
          printContent: "Proposal contents",
        };

  const scope =
    Array.isArray(
      proposal.scope
    )
      ? proposal.scope.filter(
          (
            item
          ): item is string =>
            typeof item ===
              "string" &&
            item.trim().length >
              0
        )
      : [];

  const storedCustomSections =
    normalizeProposalSections(
      proposal.custom_sections
    );

  const customSections =
    storedCustomSections.length >
    0
      ? storedCustomSections
      : defaultProposalCustomSections(
          proposalLanguage
        );

  const price = Number(
    proposal.price ?? 0
  );

  const accentColor =
    safeAccentColor(
      proposal.accent_color
    );

  const accentOnDark =
    mixWithWhite(
      accentColor,
      0.58
    );

  const isAccepted =
    proposal.status ===
      "ACCEPTED" ||
    query.accepted === "1";

  const isDeclined =
    proposal.status ===
      "DECLINED" ||
    query.declined === "1";

  const isOpen =
    !isAccepted &&
    !isDeclined;

  const style = {
    "--proposal-accent":
      accentColor,
    "--proposal-accent-on-dark":
      accentOnDark,
  } as CSSProperties;

  const number =
    proposal.proposal_number?.trim() ||
    proposalNumber(
      token,
      proposal.created_at,
      proposalLanguage
    );

  const validDays =
    daysUntil(
      proposal.valid_until
    );

  const website =
    websiteLabel(
      proposal.website_url
    );

  const acceptanceNumber =
    String(
      customSections.length +
        4
    ).padStart(2, "0");

  const currency =
    proposal.currency ?? "EUR";

  const designTemplate =
    normalizeProposalDesignTemplate(
      proposal.design_template
    );

  const priceLabel =
    formatMoney(
      price,
      currency,
      proposalLanguage
    );

  const revision = Math.max(
    1,
    Number(
      proposal.revision ?? 1
    ) || 1
  );

  const expectedAcceptanceName =
    proposal.contact_name
      ?.trim() ||
    proposal.client_name
      .trim();

  const tocItems = [
    {
      number: "01",
      label: copy.project,
      href: "#projekt",
    },
    {
      number: "02",
      label: copy.scope,
      href: "#leistungsumfang",
    },
    {
      number: "03",
      label: copy.investment,
      href: "#investition",
    },
    ...customSections.map(
      (section, index) => ({
        number: String(
          index + 4
        ).padStart(2, "0"),
        label: section.title,
        href: `#${sectionAnchor(
          section,
          index
        )}`,
      })
    ),
    ...(proposal.first_time_client
      ? [
          {
            number: "—",
            label: copy.guarantee,
            href: "#garantie",
          },
        ]
      : []),
    {
      number:
        acceptanceNumber,
      label: isAccepted
        ? copy.accepted
        : isDeclined
          ? copy.declined
          : copy.acceptance,
      href: "#zusage",
    },
  ];

  if (designTemplate) {
    return (
      <ProposalTemplateExperience
        template={designTemplate}
        token={token}
        title={proposal.title}
        clientName={proposal.client_name}
        contactName={proposal.contact_name ?? ""}
        contactEmail={proposal.contact_email ?? ""}
        website={website}
        introText={proposal.intro_text ?? ""}
        scope={scope}
        timelineText={proposal.timeline_text ?? copy.individual}
        priceLabel={priceLabel}
        validUntil={formatDate(proposal.valid_until, proposalLanguage)}
        notes={proposal.notes ?? ""}
        customSections={customSections}
        firstTimeClient={proposal.first_time_client !== false}
        accentColor={accentColor}
        logoUrl={proposal.logo_url ?? null}
        isGerman={isGerman}
        isAccepted={isAccepted}
        isDeclined={isDeclined}
        acceptedAt={proposal.accepted_at ?? null}
        acceptedByName={proposal.accepted_by_name ?? null}
        proposalNumber={number}
        revision={revision}
        expectedAcceptanceName={expectedAcceptanceName}
        issuedDate={formatDate(proposal.created_at, proposalLanguage)}
      />
    );
  }

  return (
    <main
      style={style}
      className="lb-proposal-root min-h-screen bg-[#E9E7E2] px-3 py-4 text-[#14161A] antialiased sm:px-5 sm:py-6 lg:px-7 lg:py-7"
    >
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
      />

      <style>{`
        html { scroll-behavior: smooth; }
        .lb-proposal-serif { font-family: "Instrument Serif", Georgia, serif; }
        .lb-proposal-mono { font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .lb-proposal-body { font-family: Geist, var(--font-geist-sans), Helvetica, Arial, sans-serif; }
        .lb-proposal-link { transition: opacity .15s ease, color .15s ease, border-color .15s ease, background-color .15s ease; }
        .lb-proposal-link:hover { opacity: .74; }
        @media print {
          @page { size: A4 portrait; margin: 0; }

          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .lb-proposal-root {
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body {
            overflow: visible !important;
          }

          .lb-proposal-print-hide {
            display: none !important;
          }

          .lb-proposal-desk {
            width: 210mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .lb-proposal-frame {
            width: 210mm !important;
            max-width: none !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .lb-proposal-hero {
            padding: 9mm 12mm 7.5mm !important;
            break-inside: avoid-page;
          }

          .lb-proposal-hero h1 {
            max-width: 145mm !important;
            font-size: 34pt !important;
            line-height: .98 !important;
          }

          .lb-proposal-hero .lb-proposal-hero-intro {
            margin-top: 3mm !important;
            max-width: 130mm !important;
            font-size: 8.7pt !important;
            line-height: 1.45 !important;
          }

          .lb-proposal-hero-meta {
            margin-top: 6mm !important;
            padding-top: 3mm !important;
            gap: 4mm !important;
          }

          .lb-proposal-layout {
            display: block !important;
            padding: 0 !important;
          }

          .lb-proposal-content {
            border-left: 0 !important;
            padding: 7mm 12mm 8mm !important;
          }

          .lb-proposal-section {
            padding: 5.2mm 0 !important;
            break-inside: avoid-page;
          }

          .lb-proposal-section.lb-proposal-scope-section {
            break-inside: auto;
          }

          .lb-proposal-scope-row,
          .lb-proposal-investment-row,
          .lb-proposal-custom-item,
          .lb-proposal-process-item {
            break-inside: avoid-page;
          }

          .lb-proposal-guarantee,
          .lb-proposal-acceptance,
          .lb-proposal-footer {
            break-inside: avoid-page;
          }

          .lb-proposal-guarantee {
            padding: 5mm 0 !important;
          }

          .lb-proposal-acceptance {
            padding-top: 5mm !important;
          }

          .lb-proposal-footer {
            margin-top: 5mm !important;
            padding-top: 3mm !important;
          }

          .lb-proposal-section h2 {
            font-size: 18pt !important;
          }

          .lb-proposal-section p,
          .lb-proposal-section div {
            orphans: 3;
            widows: 3;
          }

          .lb-proposal-sticky {
            position: static !important;
          }
        }
      `}</style>

      <div className="lb-proposal-desk mx-auto max-w-[1400px]">
        <article className="lb-proposal-frame overflow-hidden rounded-[18px] border border-black/[0.10] bg-[#FFFDFB] shadow-[0_42px_84px_-38px_rgba(11,12,14,0.34)]">
          <header className="lb-proposal-hero relative overflow-hidden bg-[#0E1013] px-5 pb-8 pt-6 text-white sm:px-8 sm:pb-10 sm:pt-7 lg:px-14 lg:pb-11 lg:pt-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-44 size-[520px] rounded-full opacity-70 blur-[1px]"
              style={{
                background: `radial-gradient(circle, ${accentColor}55 0%, rgba(0,0,0,0) 68%)`,
              }}
            />

            <div className="relative flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-2.5">
                {proposal.logo_url ? (
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white p-1.5">
                    <img
                      src={proposal.logo_url}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="lb-proposal-serif flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[17px] text-white"
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                  >
                    J
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium tracking-[-0.01em]">
                    {CREATOR_NAME}
                  </p>
                  <p className="lb-proposal-mono mt-0.5 truncate text-[8px] uppercase tracking-[0.11em] text-white/50">
                    {isGerman
                      ? "Webdesign & Entwicklung"
                      : "Web design & development"}
                  </p>
                </div>
              </div>

              <div className="lb-proposal-print-hide flex shrink-0 items-center gap-1.5">
                {isAccepted ? (
                  <a
                    href={`/proposal/${encodeURIComponent(
                      token
                    )}/pdf`}
                    className="lb-proposal-link inline-flex h-7 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-[10.5px] text-white/85"
                  >
                    <Download className="size-3" />
                    <span className="hidden sm:inline">
                      PDF
                    </span>
                  </a>
                ) : (
                  <ProposalPrintButton isGerman={isGerman} />
                )}

                <a
                  href={`mailto:${CREATOR_EMAIL}`}
                  className="lb-proposal-link inline-flex h-7 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-[10.5px] text-white/85"
                >
                  <span className="hidden sm:inline">
                    {isGerman
                      ? "Kontakt aufnehmen"
                      : "Contact"}
                  </span>
                  <ArrowUpRight className="size-3" />
                </a>
              </div>
            </div>

            <div className="relative mt-10 flex flex-col gap-7 sm:mt-12 lg:mt-14 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <div className="max-w-[780px]">
                <div
                  className="lb-proposal-mono flex items-center gap-2.5 text-[8.5px] uppercase tracking-[0.16em]"
                  style={{
                    color:
                      accentOnDark,
                  }}
                >
                  <span className="h-px w-5 bg-current" />
                  {copy.projectOffer}
                </div>

                <h1 className="lb-proposal-serif mt-3.5 max-w-[820px] text-[43px] font-normal leading-[0.99] tracking-[-0.024em] sm:text-[52px] lg:text-[64px]">
                  {proposal.title}
                </h1>

                {proposal.intro_text ? (
                  <p className="lb-proposal-hero-intro mt-4 max-w-[620px] whitespace-pre-line text-[12px] leading-[1.65] text-white/70 sm:text-[12.5px]">
                    {proposal.intro_text}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-left lg:text-right">
                <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-white/50">
                  {copy.investment}
                </p>
                <p className="lb-proposal-serif mt-1.5 text-[38px] leading-none tracking-[-0.02em] sm:text-[46px]">
                  {priceLabel}
                </p>
              </div>
            </div>

            <div className="lb-proposal-hero-meta relative mt-9 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/15 pt-4 sm:grid-cols-3 lg:mt-11 lg:grid-cols-5 lg:gap-x-6">
              <HeroMeta
                label={copy.for}
                value={
                  proposal.client_name
                }
                subvalue={
                  proposal.contact_name ||
                  copy.client
                }
              />
              <HeroMeta
                label={copy.timeline}
                value={
                  proposal.timeline_text ||
                  copy.individual
                }
                subvalue={copy.fromProjectStart}
              />
              <HeroMeta
                label={copy.validUntil}
                value={formatDate(
                  proposal.valid_until,
                  proposalLanguage
                )}
                subvalue={
                  validDays === null
                    ? "–"
                    : validDays === 0
                      ? copy.today
                      : `${validDays} ${
                          validDays === 1
                            ? copy.day
                            : copy.days
                        }`
                }
                monoValue
              />
              <HeroMeta
                label="Website"
                value={website}
                subvalue={copy.websiteCurrent}
              />
              <HeroMeta
                label={copy.offer}
                value={number}
                subvalue={`${copy.issued} ${formatDate(
                  proposal.created_at,
                  proposalLanguage
                )}`}
                monoValue
              />
            </div>
          </header>

          {query.error ? (
            <div className="border-b border-[#9A5106]/15 bg-[#FDF0E3] px-5 py-3 text-[11.5px] leading-5 text-[#7F4307] sm:px-8 lg:px-14">
              {query.error === "acceptance-name-mismatch"
                ? copy.errorMismatch(
                    expectedAcceptanceName
                  )
                : copy.errorGeneric}
            </div>
          ) : null}

          <div className="lb-proposal-layout grid grid-cols-1 lg:grid-cols-[138px_minmax(0,1fr)_236px] lg:px-14">
            <aside className="lb-proposal-print-hide lb-proposal-sticky hidden self-start py-9 lg:sticky lg:top-0 lg:block">
              <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                Inhalt
              </p>

              <ProposalSectionNav
                items={tocItems}
                accentColor={accentColor}
                ariaLabel={copy.printContent}
              />
            </aside>

            <div className="lb-proposal-content min-w-0 px-5 py-9 sm:px-8 lg:border-l lg:border-black/[0.08] lg:px-10 xl:px-11">
              <ProposalSection
                id="projekt"
                number="01"
                label={copy.project}
                accentColor={
                  accentColor
                }
              >
                <h2 className="lb-proposal-serif max-w-[620px] text-[25px] font-normal leading-[1.16] tracking-[-0.015em] sm:text-[29px]">
                  {copy.projectSummaryTitle}
                </h2>

                {proposal.intro_text ? (
                  <div className="mt-4 max-w-[680px] whitespace-pre-line text-[12px] leading-[1.72] text-[#3A3E46] sm:text-[12.5px]">
                    {proposal.intro_text}
                  </div>
                ) : (
                  <p className="mt-4 max-w-[680px] text-[12px] leading-[1.72] text-[#6B6660] sm:text-[12.5px]">
                    {copy.projectSummaryFallback(
                      proposal.client_name
                    )}
                  </p>
                )}
              </ProposalSection>

              <ProposalSection
                id="leistungsumfang"
                printClassName="lb-proposal-scope-section"
                number="02"
                label={copy.scope}
                accentColor={
                  accentColor
                }
                trailing={
                  scope.length > 0
                    ? `${scope.length} ${
                        scope.length === 1
                          ? copy.position
                          : copy.positions
                      }`
                    : undefined
                }
              >
                <div className="divide-y divide-black/[0.06]">
                  {scope.length > 0 ? (
                    scope.map(
                      (item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="lb-proposal-scope-row grid grid-cols-[36px_minmax(0,1fr)_16px] items-baseline gap-x-3 py-3"
                        >
                          <span className="lb-proposal-mono text-[9px] tracking-[0.06em] text-[#B0AAA1]">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>
                          <span className="lb-proposal-serif text-[17px] leading-[1.32] tracking-[-0.01em] sm:text-[19px]">
                            {item}
                          </span>
                          <Check
                            className="size-3 self-center"
                            style={{
                              color:
                                accentColor,
                            }}
                          />
                        </div>
                      )
                    )
                  ) : (
                    <p className="py-4 text-[12px] leading-6 text-[#6B6660]">
                      {isGerman
                        ? "Der Leistungsumfang wird individuell abgestimmt."
                        : "The project scope will be agreed individually."}
                    </p>
                  )}
                </div>
              </ProposalSection>

              <ProposalSection
                id="investition"
                number="03"
                label={copy.investmentFrame}
                accentColor={
                  accentColor
                }
              >
                <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:gap-10">
                  <div className="shrink-0">
                    <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                      {copy.projectPrice}
                    </p>
                    <p className="lb-proposal-serif mt-2 text-[46px] leading-[0.92] tracking-[-0.025em] sm:text-[56px]">
                      {priceLabel}
                    </p>
                    <p className="mt-2.5 text-[10.5px] text-[#6B6660]">
                      {copy.fixedPriceNote}
                    </p>
                  </div>

                  <div className="min-w-[260px] flex-1 border-b border-black/[0.10]">
                    <InvestmentRow
                      label={copy.timeline}
                      value={
                        proposal.timeline_text ||
                        copy.individual
                      }
                    />
                    <InvestmentRow
                      label={copy.validUntil}
                      value={formatDate(
                  proposal.valid_until,
                  proposalLanguage
                )}
                      mono
                    />
                    <InvestmentRow
                      label={copy.payment}
                      value={
                        proposal.notes ||
                        copy.byAgreement
                      }
                    />
                    <InvestmentRow
                      label={copy.offer}
                      value={number}
                      mono
                    />
                  </div>
                </div>
              </ProposalSection>

              {customSections.map(
                (section, index) => {
                  const numberLabel =
                    String(
                      index + 4
                    ).padStart(
                      2,
                      "0"
                    );

                  const presentation =
                    sectionPresentation(
                      section
                    );

                  return (
                    <ProposalSection
                      key={section.id}
                      id={sectionAnchor(
                        section,
                        index
                      )}
                      number={
                        numberLabel
                      }
                      label={
                        section.title
                      }
                      accentColor={
                        accentColor
                      }
                    >
                      {presentation ===
                      "deliverables" ? (
                        <DeliverablesContent
                          content={
                            section.content
                          }
                          accentColor={
                            accentColor
                          }
                        />
                      ) : presentation ===
                        "process" ? (
                        <ProcessContent
                          content={
                            section.content
                          }
                          accentColor={
                            accentColor
                          }
                          isGerman={isGerman}
                        />
                      ) : (
                        <CustomSectionContent
                          content={
                            section.content
                          }
                          accentColor={
                            accentColor
                          }
                        />
                      )}
                    </ProposalSection>
                  );
                }
              )}

              {proposal.first_time_client ? (
                <section
                  id="garantie"
                  className="lb-proposal-guarantee scroll-mt-6 py-10"
                >
                  <div className="rounded-[14px] border border-black/[0.07] bg-[#F4F2ED] p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-[11px]"
                        style={{
                          color:
                            accentColor,
                          backgroundColor: `${accentColor}12`,
                        }}
                      >
                        <ShieldCheck className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                          {copy.firstClientGuarantee}
                        </p>
                        <h2 className="lb-proposal-serif mt-2.5 max-w-[590px] text-[21px] font-normal leading-[1.25] tracking-[-0.015em] sm:text-[23px]">
                          {copy.guaranteeTitle}
                        </h2>
                        <p className="mt-3 max-w-[640px] text-[11.5px] leading-[1.72] text-[#3A3E46]">
                          {copy.guaranteeBody}
                        </p>

                        <div className="mt-4 grid gap-x-7 sm:grid-cols-2">
                          {copy.guaranteeItems.map(
                            (item) => (
                              <div
                                key={item}
                                className="lb-proposal-custom-item flex gap-2.5 border-t border-black/[0.08] py-2 text-[10.5px] leading-[1.55] text-[#4A4E56]"
                              >
                                <span
                                  className="mt-2 h-px w-2 shrink-0"
                                  style={{
                                    backgroundColor:
                                      accentColor,
                                  }}
                                />
                                <span>
                                  {item}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section
                id="zusage"
                className="lb-proposal-acceptance scroll-mt-6 pb-1 pt-8"
              >
                {isAccepted ? (
                  <div className="rounded-[14px] bg-[#0E1013] p-5 text-white sm:p-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                      <div className="max-w-[580px]">
                        <p className="lb-proposal-mono flex items-center gap-2 text-[8px] uppercase tracking-[0.14em] text-[#8FE3A5]">
                          <Check className="size-3" />
                          {copy.offerAccepted}
                        </p>
                        <h2 className="lb-proposal-serif mt-3 text-[27px] leading-[1.15] tracking-[-0.02em]">
                          {copy.acceptedTitle}
                        </h2>
                        <p className="mt-2.5 text-[11.5px] leading-[1.7] text-white/70">
                          {copy.confirmedBy}
                          {proposal.accepted_by_name
                            ? ` ${copy.by} ${proposal.accepted_by_name}`
                            : ""}
                          {proposal.accepted_at
                            ? ` ${copy.on} ${formatDateTime(
                                proposal.accepted_at,
                                proposalLanguage
                              )}.`
                            : "."}
                          {proposal.pdf_emailed_at || query.pdfEmail === "sent"
                            ? ` ${copy.pdfSent} ${proposal.contact_email || (isGerman ? "die hinterlegte E-Mail-Adresse" : "the saved email address")}.`
                            : ` ${copy.pdfDownloadAvailable}`}
                        </p>
                      </div>

                      <a
                        href={`/proposal/${encodeURIComponent(
                          token
                        )}/pdf`}
                        className="lb-proposal-print-hide lb-proposal-link inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-[11.5px] font-medium text-[#0E1013]"
                      >
                        <Download className="size-3.5" />
                        {copy.downloadPdf}
                      </a>
                    </div>
                  </div>
                ) : isDeclined ? (
                  <div className="rounded-[14px] border border-black/[0.10] bg-white p-5">
                    <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                      {copy.offerDeclined}
                    </p>
                    <h2 className="lb-proposal-serif mt-2.5 text-[25px] leading-[1.2] tracking-[-0.015em]">
                      {copy.declinedThanks}
                    </h2>
                    <p className="mt-2.5 text-[11.5px] leading-[1.7] text-[#3A3E46]">
                      {proposal.declined_at
                        ? isGerman
                          ? `Dieses Angebot wurde am ${formatDate(
                              proposal.declined_at,
                              proposalLanguage
                            )} abgelehnt. Bei Fragen können Sie Joel jederzeit direkt kontaktieren.`
                          : `This proposal was declined on ${formatDate(
                              proposal.declined_at,
                              proposalLanguage
                            )}. If you have any questions, you can contact Joel at any time.`
                        : copy.declinedBody}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-[570px]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="lb-proposal-mono text-[8.5px] tracking-[0.12em]"
                          style={{
                            color:
                              accentColor,
                          }}
                        >
                          {acceptanceNumber}
                        </span>
                        <span className="lb-proposal-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8A857D]">
                          {copy.acceptance}
                        </span>
                      </div>

                      <h2 className="lb-proposal-serif mt-3.5 text-[29px] font-normal leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
                        {copy.readyTitle}
                      </h2>

                      <p className="mt-3 text-[11.5px] leading-[1.72] text-[#3A3E46]">
                        {copy.acceptanceBody(
                          priceLabel
                        )}
                      </p>
                    </div>

                    <div className="lb-proposal-print-hide flex shrink-0 flex-wrap items-center gap-2">
                      <ProposalAcceptanceFlow
                        token={token}
                        title={
                          proposal.title
                        }
                        clientName={
                          proposal.client_name
                        }
                        priceLabel={
                          priceLabel
                        }
                        accentColor={
                          accentColor
                        }
                        expectedName={
                          expectedAcceptanceName
                        }
                        confirmationEmail={
                          proposal.contact_email ??
                          ""
                        }
                        mode="cta"
                        isGerman={isGerman}
                      />

                      <form
                        action={
                          declineProposal
                        }
                      >
                        <input
                          type="hidden"
                          name="token"
                          value={token}
                        />
                        <ProposalActionButton
                          pendingLabel={copy.saving}
                          variant="secondary"
                        >
                          {copy.decline}
                        </ProposalActionButton>
                      </form>
                    </div>
                  </div>
                )}
              </section>

              <footer className="lb-proposal-footer mt-9 flex flex-col gap-2 border-t border-black/[0.10] pt-4 text-[10px] text-[#8A857D] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {copy.createdBy} {CREATOR_NAME} · {CREATOR_WEBSITE}
                </span>
                <span className="lb-proposal-mono tracking-[0.06em]">
                  {number} · REV {revision}
                </span>
              </footer>
            </div>

            <aside className="lb-proposal-print-hide lb-proposal-sticky hidden self-start py-9 lg:sticky lg:top-0 lg:block">
              <div className="rounded-[14px] border border-black/[0.10] bg-white p-4 shadow-[0_10px_28px_-20px_rgba(20,22,26,0.24)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="lb-proposal-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                    {copy.offer}
                  </p>
                  <ProposalStatus
                    accepted={
                      isAccepted
                    }
                    declined={
                      isDeclined
                    }
                    isGerman={isGerman}
                  />
                </div>

                <p className="lb-proposal-serif mt-3 text-[31px] leading-none tracking-[-0.02em]">
                  {priceLabel}
                </p>

                <div className="mt-3">
                  <RailRow
                    label={copy.timeline}
                    value={
                      proposal.timeline_text ||
                      copy.individual
                    }
                  />
                  <RailRow
                    label={copy.validUntil}
                    value={formatDate(
                  proposal.valid_until,
                  proposalLanguage
                )}
                    mono
                  />
                  <RailRow
                    label={copy.positions}
                    value={String(
                      scope.length
                    )}
                    mono
                  />
                </div>

                {isOpen ? (
                  <div className="mt-3.5">
                    <ProposalAcceptanceFlow
                      token={token}
                      title={
                        proposal.title
                      }
                      clientName={
                        proposal.client_name
                      }
                      priceLabel={
                        priceLabel
                      }
                      accentColor={
                        accentColor
                      }
                      expectedName={
                        expectedAcceptanceName
                      }
                      confirmationEmail={
                        proposal.contact_email ??
                        ""
                      }
                      mode="rail"
                      isGerman={isGerman}
                    />

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <ProposalPrintButton variant="rail" isGerman={isGerman} />

                      <form
                        action={
                          declineProposal
                        }
                      >
                        <input
                          type="hidden"
                          name="token"
                          value={token}
                        />
                        <ProposalActionButton
                          pendingLabel="…"
                          variant="rail-secondary"
                        >
                          {copy.decline}
                        </ProposalActionButton>
                      </form>
                    </div>
                  </div>
                ) : isAccepted ? (
                  <div className="mt-3.5 flex h-9 items-center gap-2 rounded-[9px] bg-[#E9F0EA] px-3 text-[10.5px] font-medium text-[#2F6B3A]">
                    <Check className="size-3" />
                    {copy.accepted}
                  </div>
                ) : null}

                <div className="mt-3.5 flex items-center gap-2.5 border-t border-black/[0.08] pt-3">
                  <div className="lb-proposal-mono flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0E1013] text-[9px] font-medium text-white">
                    JC
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-medium">
                      {copy.questions}
                    </p>
                    <a
                      href={`mailto:${CREATOR_EMAIL}`}
                      className="lb-proposal-link mt-0.5 block truncate text-[9.5px] text-[#8A857D]"
                    >
                      {CREATOR_EMAIL}
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}

function HeroMeta({
  label,
  value,
  subvalue,
  monoValue = false,
}: {
  label: string;
  value: string;
  subvalue: string;
  monoValue?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="lb-proposal-mono text-[7.5px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p
        className={[
          "mt-1.5 truncate text-[11px] font-medium",
          monoValue
            ? "lb-proposal-mono text-[10.5px]"
            : "",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] text-white/55">
        {subvalue}
      </p>
    </div>
  );
}

function ProposalSection({
  id,
  number,
  label,
  accentColor,
  trailing,
  printClassName = "",
  children,
}: {
  id: string;
  number: string;
  label: string;
  accentColor: string;
  trailing?: string;
  printClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`lb-proposal-section scroll-mt-6 py-10 first:pt-0 ${printClassName}`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="lb-proposal-mono text-[8.5px] tracking-[0.12em]"
          style={{
            color:
              accentColor,
          }}
        >
          {number}
        </span>
        <span className="lb-proposal-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8A857D]">
          {label}
        </span>
        <span className="h-px flex-1 bg-black/[0.10]" />
        {trailing ? (
          <span className="lb-proposal-mono shrink-0 text-[8px] tracking-[0.06em] text-[#8A857D]">
            {trailing}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function InvestmentRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="lb-proposal-investment-row flex items-start justify-between gap-4 border-t border-black/[0.10] py-2.5 text-[11px] first:border-t-0">
      <span className="shrink-0 text-[#6B6660]">
        {label}
      </span>
      <span
        className={[
          "max-w-[68%] whitespace-pre-line text-right font-medium text-[#14161A]",
          mono
            ? "lb-proposal-mono text-[10.5px]"
            : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function DeliverablesContent({
  content,
  accentColor,
}: {
  content: string;
  accentColor: string;
}) {
  const items =
    listItemsFromContent(
      content
    );

  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      {items.map(
        (item, index) => (
          <div
            key={`${item}-${index}`}
            className="lb-proposal-custom-item flex gap-2.5 border-b border-black/[0.07] py-2.5 text-[11px] leading-[1.55] text-[#3A3E46]"
          >
            <span
              className="mt-[7px] size-1 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  accentColor,
              }}
            />
            <span>
              {item}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function ProcessContent({
  content,
  accentColor,
  isGerman,
}: {
  content: string;
  accentColor: string;
  isGerman: boolean;
}) {
  const items =
    processItemsFromContent(
      content
    );

  if (
    items.length === 0
  ) {
    return (
      <CustomSectionContent
        content={content}
        accentColor={
          accentColor
        }
      />
    );
  }

  return (
    <div className="border-t border-black/[0.08]">
      {items.map((item) => (
        <div
          key={`${item.number}-${item.title}`}
          className="lb-proposal-process-item grid gap-2 border-b border-black/[0.08] py-3 sm:grid-cols-[126px_minmax(0,1fr)] sm:gap-6"
        >
          <div>
            <p
              className="lb-proposal-mono text-[8px] tracking-[0.12em]"
              style={{
                color:
                  accentColor,
              }}
            >
              {isGerman ? "Schritt" : "Step"} {item.number}
            </p>
            <p className="mt-1 text-[11.5px] font-medium tracking-[-0.01em]">
              {item.title}
            </p>
          </div>
          {item.text ? (
            <p className="text-[11px] leading-[1.65] text-[#3A3E46]">
              {item.text}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CustomSectionContent({
  content,
  accentColor,
}: {
  content: string;
  accentColor: string;
}) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n");

  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const value =
      paragraph
        .join(" ")
        .trim();

    if (value) {
      blocks.push(
        <p
          key={`p-${blocks.length}`}
          className="max-w-[680px] text-[11.5px] leading-[1.72] text-[#3A3E46]"
        >
          {value}
        </p>
      );
    }

    paragraph = [];
  }

  function flushBullets() {
    if (
      bullets.length > 0
    ) {
      blocks.push(
        <div
          key={`u-${blocks.length}`}
          className="grid gap-x-8 sm:grid-cols-2"
        >
          {bullets.map(
            (bullet, index) => (
              <div
                key={`${bullet}-${index}`}
                className="lb-proposal-custom-item flex gap-2.5 border-b border-black/[0.07] py-2.5 text-[11px] leading-[1.55] text-[#3A3E46]"
              >
                <span
                  className="mt-[7px] size-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                />
                <span>
                  {bullet}
                </span>
              </div>
            )
          )}
        </div>
      );
    }

    bullets = [];
  }

  for (
    const rawLine of lines
  ) {
    const line =
      rawLine.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (
      /^[-•]\s+/.test(line)
    ) {
      flushParagraph();
      bullets.push(
        line.replace(
          /^[-•]\s+/,
          ""
        )
      );
      continue;
    }

    flushBullets();
    paragraph.push(line);
  }

  flushParagraph();
  flushBullets();

  return (
    <div className="space-y-3.5">
      {blocks}
    </div>
  );
}

function ProposalStatus({
  accepted,
  declined,
  isGerman,
}: {
  accepted: boolean;
  declined: boolean;
  isGerman: boolean;
}) {
  if (accepted) {
    return (
      <span className="lb-proposal-mono rounded-[5px] bg-[#E9F0EA] px-1.5 py-0.5 text-[7.5px] uppercase tracking-[0.06em] text-[#2F6B3A]">
        {isGerman ? "Angenommen" : "Accepted"}
      </span>
    );
  }

  if (declined) {
    return (
      <span className="lb-proposal-mono rounded-[5px] bg-black/[0.05] px-1.5 py-0.5 text-[7.5px] uppercase tracking-[0.06em] text-[#6B6660]">
        {isGerman ? "Abgelehnt" : "Declined"}
      </span>
    );
  }

  return (
    <span className="lb-proposal-mono rounded-[5px] bg-black/[0.05] px-1.5 py-0.5 text-[7.5px] uppercase tracking-[0.06em] text-[#6B6660]">
      {isGerman ? "Offen" : "Open"}
    </span>
  );
}

function RailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-t border-black/[0.08] py-2 text-[10px] first:border-t-0">
      <span className="text-[#6B6660]">
        {label}
      </span>
      <span
        className={[
          "max-w-[58%] text-right font-medium",
          mono
            ? "lb-proposal-mono text-[9.5px]"
            : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
