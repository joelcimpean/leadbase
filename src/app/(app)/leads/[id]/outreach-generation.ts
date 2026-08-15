import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

/* =========================================================
   CONFIG
========================================================= */

const OUTREACH_MODEL = "gpt-5.6-luna";

/* =========================================================
   SCHEMA
========================================================= */

const OutreachDraftSchema = z.object({
  subject: z.string(),

  body: z.string(),

  followUpBody: z.string(),

  personalizationPoints: z
    .array(z.string())
    .max(6),
});

export type GeneratedOutreachDraft =
  z.infer<typeof OutreachDraftSchema> & {
    model: string;

    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };

/* =========================================================
   INPUT
========================================================= */

export type GenerateOutreachDraftInput = {
  companyName: string;

  industry?: string | null;
  location?: string | null;

  contactName?: string | null;
  contactJobTitle?: string | null;

  websiteUrl?: string | null;

  campaignName?: string | null;

  campaignOutreachAngle?: string | null;
  campaignEmailTone?: string | null;

  researchSummary?: string | null;

  structuralScore?: number | null;
  visualScore?: number | null;
  opportunityScore?: number | null;
  redesignPotential?: number | null;

  visualStrengths?: string[];
  visualWeaknesses?: string[];

  redesignReason?: string | null;
  suggestedOutreachAngle?: string | null;
};

/* =========================================================
   OPENAI
========================================================= */

function createOpenAIClient() {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing from the environment."
    );
  }

  return new OpenAI({
    apiKey,
  });
}

/* =========================================================
   CLEAN TEXT
========================================================= */

function optionalLine(
  label: string,
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return `${label}: ${value}`;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateOutreachDraft(
  input: GenerateOutreachDraftInput
): Promise<GeneratedOutreachDraft> {
  const openai =
    createOpenAIClient();

  const context = [
    optionalLine(
      "Unternehmen",
      input.companyName
    ),

    optionalLine(
      "Branche",
      input.industry
    ),

    optionalLine(
      "Standort",
      input.location
    ),

    optionalLine(
      "Ansprechpartner",
      input.contactName
    ),

    optionalLine(
      "Position",
      input.contactJobTitle
    ),

    optionalLine(
      "Website",
      input.websiteUrl
    ),

    optionalLine(
      "Kampagne",
      input.campaignName
    ),

    optionalLine(
      "Kampagnen-Ansatz",
      input.campaignOutreachAngle
    ),

    optionalLine(
      "Gewünschter Ton",
      input.campaignEmailTone
    ),

    optionalLine(
      "Research Summary",
      input.researchSummary
    ),

    optionalLine(
      "Structural Score",
      input.structuralScore
    ),

    optionalLine(
      "Visual Score",
      input.visualScore
    ),

    optionalLine(
      "Opportunity Score",
      input.opportunityScore
    ),

    optionalLine(
      "Redesign Potential",
      input.redesignPotential
    ),

    optionalLine(
      "Redesign-Grund",
      input.redesignReason
    ),

    optionalLine(
      "Vorgeschlagener Outreach-Ansatz",
      input.suggestedOutreachAngle
    ),

    input.visualStrengths?.length
      ? `Visuelle Stärken: ${input.visualStrengths.join(
          " | "
        )}`
      : null,

    input.visualWeaknesses?.length
      ? `Visuelle Schwächen: ${input.visualWeaknesses.join(
          " | "
        )}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response =
    await openai.responses.parse({
      model: OUTREACH_MODEL,

      reasoning: {
        effort: "low",
      },

      input: [
        {
          role: "system",

          content: `
Du bist ein erfahrener deutscher B2B-Outreach-Texter für einen selbstständigen Webdesigner.

Deine Aufgabe ist es, kurze, persönliche und glaubwürdige Cold-E-Mails an deutsche Unternehmen zu schreiben.

WICHTIG:

- Schreibe ausschließlich auf natürlichem, grammatikalisch korrektem Deutsch.
- Verwende grundsätzlich die höfliche Sie-Ansprache.
- Die Nachricht darf NICHT wie KI-generierter Marketingtext wirken.
- Keine übertriebenen Komplimente.
- Keine künstliche Begeisterung.
- Keine aggressiven Verkaufssprüche.
- Keine erfundenen Informationen.
- Keine Behauptungen, die nicht aus dem bereitgestellten Research hervorgehen.
- Erwähne niemals interne Scores, KI, Analyse, Datenbanken oder Lead Qualification.
- Sage niemals, dass die Website "schlecht", "hässlich", "veraltet", "katastrophal" oder Ähnliches ist.
- Kritisiere respektvoll und indirekt.
- Fokus auf Chancen und Verbesserungspotenzial.
- Keine langen Listen innerhalb der E-Mail.
- Kein Emoji-Spam.
- Keine Buzzwords wie "revolutionieren", "Next Level", "Gamechanger" oder "digitale Transformation".
- Kein "Ich hoffe, diese E-Mail erreicht Sie wohlauf".
- Kein unnötiges Vorstellen über mehrere Sätze.

ZIEL:

Der Empfänger soll merken, dass sich der Absender tatsächlich mit seinem Unternehmen bzw. seiner Website beschäftigt hat.

Die E-Mail soll sich anfühlen wie eine kurze persönliche Nachricht eines Webdesigners und nicht wie eine Massenmail.

STRUKTUR:

1. Kurze natürliche Anrede.
2. Konkreter persönlicher Einstieg.
3. Eine echte Beobachtung.
4. Eine konkrete Chance / Idee.
5. Niedrigschwellige Frage.

LÄNGE:

Der Body sollte normalerweise ungefähr 70–130 Wörter haben.

BETREFF:

- kurz
- neutral
- möglichst nicht werblich
- maximal etwa 6 Wörter
- kein Clickbait

ANREDE:

Wenn ein Ansprechpartner vorhanden ist:
"Hallo [vollständiger Name]," ist erlaubt.

Wenn kein Ansprechpartner vorhanden ist:
Verwende eine natürliche neutrale Anrede wie:
"Guten Tag,"
oder
"Hallo liebes [Unternehmensname]-Team,"

Verwende niemals erfundene Namen oder Geschlechter.

CALL TO ACTION:

Nicht direkt nach einem Termin oder Verkauf fragen.

Bevorzuge niedrigschwellige Formulierungen wie:

"Wäre eine Überarbeitung grundsätzlich interessant für Sie?"

"Falls das grundsätzlich interessant ist, kann ich Ihnen gerne kurz zeigen, was ich damit meine."

"Falls Sie das Thema ohnehin einmal angehen möchten, können wir uns gerne kurz austauschen."

FOLLOW-UP:

Schreibe zusätzlich ein sehr kurzes Follow-up für einige Tage später.

Das Follow-up:
- 30–60 Wörter
- kein Druck
- keine Schuldgefühle
- kein "Ich wollte nur nachhaken"
- soll sich auf die erste Nachricht beziehen

PERSONALIZATION POINTS:

Gib 2–6 konkrete Fakten zurück, auf denen die Nachricht basiert.

Diese Punkte sind intern und erscheinen nicht zwingend wortwörtlich in der E-Mail.
          `.trim(),
        },

        {
          role: "user",

          content: `
Erstelle einen personalisierten deutschen Outreach-Entwurf für dieses Unternehmen.

KONTEXT:

${context}

Wichtig:
Priorisiere konkrete Beobachtungen über die Website und das Unternehmen.

Nutze den vorgeschlagenen Outreach-Ansatz nur dann, wenn er tatsächlich durch den Kontext gestützt wird.

Wenn Informationen fehlen, schreibe lieber etwas weniger spezifisch, statt etwas zu erfinden.
          `.trim(),
        },
      ],

      text: {
        format: zodTextFormat(
          OutreachDraftSchema,
          "outreach_draft"
        ),
      },
    });

  const parsed =
    response.output_parsed;

  if (!parsed) {
    throw new Error(
      "Outreach generation returned no structured result."
    );
  }

  return {
    ...parsed,

    model: OUTREACH_MODEL,

    usage: {
      inputTokens:
        response.usage
          ?.input_tokens ?? 0,

      outputTokens:
        response.usage
          ?.output_tokens ?? 0,

      totalTokens:
        response.usage
          ?.total_tokens ?? 0,
    },
  };
}