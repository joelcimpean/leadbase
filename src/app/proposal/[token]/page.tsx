import type {
  Metadata,
} from "next";

import type {
  CSSProperties,
  ReactNode,
} from "react";

import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Download,
  Globe2,
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
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  defaultProposalCustomSections,
  normalizeProposalSections,
} from "@/lib/proposal-sections";

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
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
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

function safeAccentColor(
  value?: string | null
) {
  return /^#[0-9A-F]{6}$/i.test(
    value?.trim() ?? ""
  )
    ? value!.toUpperCase()
    : "#002BBA";
}

function proposalNumber(
  token: string,
  createdAt?: string | null
) {
  const year =
    createdAt?.slice(0, 4) ??
    new Date().getFullYear().toString();

  const suffix = token
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();

  return `ANG-${year}-${suffix}`;
}

export async function generateMetadata({
  params,
}: PublicProposalPageProps): Promise<Metadata> {
  const { token } = await params;

  const supabase =
    createAdminClient();

  const { data } =
    await supabase
      .from("proposals")
      .select("client_name")
      .eq("public_token", token)
      .maybeSingle();

  const clientName =
    data?.client_name?.trim();

  return {
    title: clientName
      ? `Angebot für ${clientName}`
      : "Angebot",
    description:
      "Persönliches Projektangebot von Joel Cimpean.",
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
  ] =
    await Promise.all([
      params,
      searchParams,
    ]);

  const supabase =
    createAdminClient();

  const {
    data: proposal,
    error,
  } =
    await supabase
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

  const scope =
    Array.isArray(
      proposal.scope
    )
      ? proposal.scope.filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0
        )
      : [];

  const storedCustomSections =
    normalizeProposalSections(
      proposal.custom_sections
    );

  const customSections =
    storedCustomSections.length > 0
      ? storedCustomSections
      : defaultProposalCustomSections("de");

  const price =
    Number(
      proposal.price ?? 0
    );

  const accentColor =
    safeAccentColor(
      proposal.accent_color
    );

  const isAccepted =
    proposal.status ===
    "ACCEPTED";

  const isDeclined =
    proposal.status ===
    "DECLINED";

  const style = {
    "--proposal-accent":
      accentColor,
  } as CSSProperties;

  const number =
    proposalNumber(
      token,
      proposal.created_at
    );

  return (
    <main
      style={style}
      className="min-h-screen bg-white text-zinc-950"
    >
      <div className="mx-auto max-w-[1120px] px-5 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <header className="flex items-start justify-between gap-6 border-b border-black/10 pb-5">
          <div className="min-w-0">
            {proposal.logo_url ? (
              <img
                src={proposal.logo_url}
                alt="Logo"
                className="max-h-20 max-w-[360px] object-contain object-left sm:max-h-24 sm:max-w-[440px]"
              />
            ) : (
              <>
                <p className="text-sm font-semibold tracking-tight">
                  Joel Cimpean
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Webdesign & Webentwicklung
                </p>
              </>
            )}
          </div>

          <a
            href="mailto:hello@joelcimpean.com"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
          >
            Kontakt aufnehmen
            <ArrowUpRight className="size-3.5" />
          </a>
        </header>

        <div className="grid gap-4 border-b border-black/10 py-5 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem
            label="Empfänger"
            value={proposal.client_name}
          />
          <MetaItem
            label="Gültig bis"
            value={formatDate(
              proposal.valid_until
            )}
          />
          <MetaItem
            label="Ausgestellt"
            value={formatDate(
              proposal.created_at
            )}
          />
          <MetaItem
            label="Angebot Nr."
            value={number}
          />
        </div>

        {query.accepted === "1" || isAccepted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              Angebot angenommen
            </p>
            <p className="mt-1 leading-6">
              Vielen Dank. Die Zusage wurde gespeichert.
              {proposal.pdf_emailed_at || query.pdfEmail === "sent"
                ? " Die bestätigte Angebots-PDF wurde per E-Mail versendet."
                : " Die bestätigte PDF kann unten direkt heruntergeladen werden."}
            </p>
          </div>
        ) : null}

        {query.declined === "1" || isDeclined ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-950">
              Angebot abgelehnt
            </p>
            <p className="mt-1 leading-6">
              Die Rückmeldung wurde gespeichert. Joel kann sich bei Bedarf noch einmal persönlich melden.
            </p>
          </div>
        ) : null}

        {query.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Die Rückmeldung konnte nicht verarbeitet werden. Bitte laden Sie die Seite neu oder kontaktieren Sie Joel direkt.
          </div>
        ) : null}

        <section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.35fr_.65fr] lg:gap-16 lg:py-20">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                color:
                  accentColor,
              }}
            >
              Projektangebot für {proposal.client_name}
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {proposal.title}
            </h1>

            {proposal.intro_text ? (
              <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                {proposal.intro_text}
              </p>
            ) : null}

            {proposal.contact_name ? (
              <p className="mt-6 text-sm text-zinc-500">
                Ansprechpartner: {proposal.contact_name}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 lg:pt-2">
            <InfoCard
              icon={CircleDollarSign}
              label="Investition"
              value={formatMoney(
                price,
                proposal.currency ?? "EUR"
              )}
              accentColor={accentColor}
            />

            {proposal.timeline_text ? (
              <InfoCard
                icon={CalendarDays}
                label="Zeitrahmen"
                value={proposal.timeline_text}
                accentColor={accentColor}
              />
            ) : null}

            {proposal.website_url ? (
              <a
                href={normalizeUrl(
                  proposal.website_url
                )}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 transition-transform hover:-translate-y-0.5"
              >
                <Globe2
                  className="mt-0.5 size-4 shrink-0"
                  style={{
                    color:
                      accentColor,
                  }}
                />
                <div>
                  <p className="text-xs text-zinc-500">
                    Website
                  </p>
                  <p className="mt-1 break-all text-sm font-medium">
                    {proposal.website_url}
                  </p>
                </div>
              </a>
            ) : null}
          </div>
        </section>

        <NumberedSection
          number="01"
          label="Leistungsumfang"
          accentColor={accentColor}
        >
          <div className="grid gap-8 lg:grid-cols-[.55fr_1.45fr] lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Was im Projekt enthalten ist
              </h2>
            </div>

            <div className="divide-y divide-black/10 border-y border-black/10">
              {scope.length > 0 ? (
                scope.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 py-4 text-sm leading-6 sm:text-base"
                  >
                    <span
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                      style={{
                        backgroundColor:
                          accentColor,
                      }}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <p className="py-5 text-sm text-zinc-500">
                  Der Leistungsumfang wird individuell abgestimmt.
                </p>
              )}
            </div>
          </div>
        </NumberedSection>

        <NumberedSection
          number="02"
          label="Investition & Rahmen"
          accentColor={accentColor}
        >
          <div className="grid overflow-hidden rounded-2xl border border-black/15 bg-white sm:grid-cols-3">
            <Metric
              label="Projektpreis"
              value={formatMoney(
                price,
                proposal.currency ?? "EUR"
              )}
            />
            <Metric
              label="Zeitrahmen"
              value={proposal.timeline_text || "Individuell"}
            />
            <Metric
              label="Gültig bis"
              value={formatDate(
                proposal.valid_until
              )}
            />
          </div>

          {proposal.notes ? (
            <div
              className="mt-5 rounded-2xl border bg-white p-5 text-sm leading-7 text-zinc-600"
              style={{
                borderLeftWidth:
                  "4px",
                borderLeftColor:
                  accentColor,
              }}
            >
              <p className="whitespace-pre-line">
                {proposal.notes}
              </p>
            </div>
          ) : null}
        </NumberedSection>

        {customSections.map((section, index) => (
          <NumberedSection
            key={section.id}
            number={String(index + 3).padStart(2, "0")}
            label={section.title}
            accentColor={accentColor}
          >
            <CustomSectionContent content={section.content} />
          </NumberedSection>
        ))}

        {proposal.first_time_client ? (
          <NumberedSection
            number={String(customSections.length + 3).padStart(2, "0")}
            label="Geld-zurück-Garantie · Erstkunde"
            accentColor={accentColor}
          >
            <div className="flex max-w-4xl items-start gap-5 sm:gap-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/10 sm:size-12">
                <ShieldCheck
                  className="size-5"
                  style={{
                    color:
                      accentColor,
                  }}
                />
              </div>

              <div className="min-w-0 space-y-4 text-sm leading-7 text-zinc-600 sm:text-base">
                <p>
                  Sollte die erste vorgestellte Designrichtung nicht zu den Erwartungen passen, kann das Projekt vor Beginn der Umsetzung beendet werden. Bereits gezahlte Website-Honorare werden zurückerstattet, wenn die Rückmeldung innerhalb von fünf Werktagen nach Präsentation schriftlich erfolgt.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Gilt nur, solange noch keine Designrichtung freigegeben oder umgesetzt wurde.
                  </li>
                  <li>
                    Geänderte Anforderungen, verspätete Kunden-Inputs und Drittanbieter-Kosten sind ausgenommen.
                  </li>
                  <li>
                    Bei Erstattung dürfen die vorgestellten Konzepte nicht weiterverwendet werden.
                  </li>
                </ul>
              </div>
            </div>
          </NumberedSection>
        ) : null}

        <NumberedSection
          number={String(
            customSections.length +
            (proposal.first_time_client ? 4 : 3)
          ).padStart(2, "0")}
          label="Zusage"
          accentColor={accentColor}
        >
          {isAccepted ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-emerald-950">
                  Online angenommen
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {formatDate(
                    proposal.accepted_at
                  )}
                  {proposal.accepted_by_name
                    ? ` · ${proposal.accepted_by_name}`
                    : ""}
                </p>
              </div>

              <a
                href={`/proposal/${encodeURIComponent(
                  token
                )}/pdf`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900"
              >
                <Download className="size-4" />
                PDF herunterladen
              </a>
            </div>
          ) : isDeclined ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
              Dieses Angebot wurde am {formatDate(
                proposal.declined_at
              )} abgelehnt.
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Projekt freigeben
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                  Mit der Zusage bestätigen Sie den beschriebenen Leistungsumfang, den Projektpreis und die aufgeführten Rahmenbedingungen. Anschließend erhalten Sie automatisch eine PDF-Kopie per E-Mail.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={declineProposal}>
                  <input
                    type="hidden"
                    name="token"
                    value={token}
                  />
                  <ProposalActionButton
                    pendingLabel="Wird gespeichert…"
                    variant="secondary"
                  >
                    Ablehnen
                  </ProposalActionButton>
                </form>

                <ProposalAcceptanceFlow
                  token={token}
                  title={proposal.title}
                  clientName={proposal.client_name}
                  priceLabel={formatMoney(
                    price,
                    proposal.currency ?? "EUR"
                  )}
                  accentColor={accentColor}
                />
              </div>
            </div>
          )}
        </NumberedSection>

        <footer className="border-t border-black/10 py-8 text-xs leading-5 text-zinc-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Erstellt von Joel Cimpean · joelcimpean.com
            </span>
            <span>{number}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CustomSectionContent({
  content,
}: {
  content: string;
}) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n");

  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const value = paragraph.join(" ").trim();
    if (value) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-7 text-zinc-600">
          {value}
        </p>
      );
    }
    paragraph = [];
  }

  function flushBullets() {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={`u-${blocks.length}`} className="list-disc space-y-2 pl-5 leading-7 text-zinc-600">
          {bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>{bullet}</li>
          ))}
        </ul>
      );
    }
    bullets = [];
  }

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
      continue;
    }

    flushBullets();
    paragraph.push(line);
  }

  flushParagraph();
  flushBullets();

  return (
    <div className="max-w-4xl space-y-4 text-sm sm:text-base">
      {blocks}
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-medium uppercase tracking-[0.13em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1.5 font-semibold text-zinc-800">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  accentColor,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4">
      <Icon
        className="mt-0.5 size-4 shrink-0"
        style={{
          color:
            accentColor,
        }}
      />
      <div>
        <p className="text-xs text-zinc-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium">
          {value}
        </p>
      </div>
    </div>
  );
}

function NumberedSection({
  number,
  label,
  accentColor,
  children,
}: {
  number: string;
  label: string;
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-black/10 py-10 sm:py-14">
      <p className="mb-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <span
          className="mr-2"
          style={{
            color:
              accentColor,
          }}
        >
          {number}.
        </span>
        {label}
      </p>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-black/10 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs uppercase tracking-[0.13em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function Condition({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      {children}
    </div>
  );
}
