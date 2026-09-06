import OpenAI from "openai";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  assessProposalEmailHistory,
  filterProposalHistoryForAi,
} from "@/lib/proposal-email-history";

const MODEL = "gpt-5.6-luna";

const AutofillSchema = z.object({
  title: z.string().min(1).max(180),
  introText: z.string().min(1).max(2400),
  scope: z.array(z.string().min(1).max(500)).max(14),
  timelineText: z.string().max(300).nullable(),
  price: z.number().nonnegative().nullable(),
  notes: z.string().max(2400).nullable(),
  customSections: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        content: z.string().min(1).max(6000),
      })
    )
    .max(8),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getSingleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null;
}

function trimMessage(value?: string | null) {
  const normalized =
    value
      ?.replace(/\r\n/g, "\n")
      .trim() ?? "";

  return normalized.length > 5000
    ? `${normalized.slice(0, 5000)}\n[…]`
    : normalized;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: leadId } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: lead,
      error: leadError,
    } =
      await supabase
        .from("leads")
        .select(`
          id,
          estimated_project_value,
          currency,
          research_summary,
          website_findings,
          opportunity_score,
          redesign_potential,

          company:companies (
            name,
            website_url,
            industry,
            location,
            description
          ),

          primary_contact:contacts (
            full_name,
            job_title,
            email
          )
        `)
        .eq("id", leadId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        {
          status: 404,
        }
      );
    }

    const company =
      getSingleRelation(lead.company);
    const contact =
      getSingleRelation(lead.primary_contact);

    const {
      data: messages,
      error: messagesError,
    } =
      await supabase
        .from("email_messages")
        .select(`
          direction,
          from_name,
          from_email,
          subject,
          body_text,
          received_at,
          reply_classification
        `)
        .eq("user_id", user.id)
        .eq("lead_id", leadId)
        .order("received_at", {
          ascending: false,
        })
        .limit(20);

    if (messagesError) {
      console.error(
        "Could not load proposal conversation:",
        messagesError
      );
    }

    const historyAssessment =
      assessProposalEmailHistory(
        messages ?? []
      );

    if (!historyAssessment.ready) {
      return NextResponse.json(
        {
          error:
            "AI-Autofill ist erst verfügbar, wenn ein echter E-Mail-Austausch mit einer sinnvollen Kundenantwort erkannt wurde.",
          code:
            "NO_MEANINGFUL_EMAIL_HISTORY",
        },
        {
          status: 422,
        }
      );
    }

    const chronological =
      filterProposalHistoryForAi(
        [...(messages ?? [])].reverse()
      );

    const conversation =
      chronological.length > 0
        ? chronological
            .map((message) => {
              const side =
                message.direction === "INCOMING"
                  ? "KUNDE"
                  : "JOEL";

              return [
                `${side} — ${message.from_name ?? message.from_email ?? ""}`,
                message.subject
                  ? `Betreff: ${message.subject}`
                  : null,
                trimMessage(message.body_text),
              ]
                .filter(Boolean)
                .join("\n");
            })
            .join("\n\n--------------------\n\n")
        : "Noch keine gespeicherte E-Mail-Historie.";

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const openai =
      new OpenAI({ apiKey });

    const response =
      await openai.responses.parse({
        model: MODEL,
        reasoning: {
          effort: "low",
        },
        input: [
          {
            role: "system",
            content: `
Du erstellst einen AngebotsENTWURF für Joel Cimpean, selbstständiger Webdesigner/Webentwickler.

WICHTIGE REGELN:
- Verwende Lead-Daten und E-Mail-Verlauf als primäre Quelle.
- Erfinde keine Zusagen, Preise, Fristen, Zahlungspläne, Garantien oder rechtlichen Bedingungen.
- Wenn Preis oder Zeitrahmen nicht ausdrücklich erkennbar sind, gib null zurück.
- Formuliere knapp, professionell und konkret.
- Scope-Punkte sollen tatsächliche Leistungen beschreiben, die im Gespräch erkennbar sind.
- customSections dürfen nur Inhalte enthalten, die aus dem Kontext sinnvoll ableitbar sind, z. B. "Nicht enthalten", "Kundenmitwirkung", "Ablauf" oder "Nächste Schritte".
- Keine juristischen Klauseln erfinden.
- Keine Geld-zurück-Garantie erzeugen; diese wird separat im Builder gesteuert.
- Nichts wird automatisch an den Kunden gesendet. Joel prüft und bearbeitet alles.
            `.trim(),
          },
          {
            role: "user",
            content: `
Erstelle aus diesem Kontext einen Angebotsentwurf.

UNTERNEHMEN
Name: ${company?.name ?? ""}
Website: ${company?.website_url ?? ""}
Branche: ${company?.industry ?? ""}
Ort: ${company?.location ?? ""}
Beschreibung: ${company?.description ?? ""}

KONTAKT
Name: ${contact?.full_name ?? ""}
Position: ${contact?.job_title ?? ""}
E-Mail: ${contact?.email ?? ""}

LEADBASE-KONTEXT
Geschätzter Projektwert: ${lead.estimated_project_value ?? ""} ${lead.currency ?? "EUR"}
Research: ${lead.research_summary ?? ""}
Website Findings: ${lead.website_findings ?? ""}
Opportunity Score: ${lead.opportunity_score ?? ""}
Redesign Potential: ${lead.redesign_potential ?? ""}

E-MAIL-VERLAUF
${conversation}
            `.trim(),
          },
        ],
        text: {
          format: zodTextFormat(
            AutofillSchema,
            "proposal_autofill"
          ),
        },
      });

    const parsed =
      response.output_parsed;

    if (!parsed) {
      throw new Error(
        "Proposal autofill returned no structured result."
      );
    }

    return NextResponse.json({
      ok: true,
      ...parsed,
      customSections:
        parsed.customSections.map(
          (section, index) => ({
            id: `ai-section-${index + 1}`,
            title: section.title,
            content: section.content,
          })
        ),
      model: MODEL,
      usage: {
        inputTokens:
          response.usage?.input_tokens ?? 0,
        outputTokens:
          response.usage?.output_tokens ?? 0,
        totalTokens:
          response.usage?.total_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error(
      "Proposal AI autofill failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Proposal AI autofill failed.",
      },
      {
        status: 500,
      }
    );
  }
}
