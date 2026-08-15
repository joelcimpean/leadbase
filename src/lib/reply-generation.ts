import "server-only";

import OpenAI from "openai";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  z,
} from "zod";

/* =========================================================
   CONFIG
========================================================= */

const REPLY_MODEL =
  "gpt-5.6-luna";

/* =========================================================
   SCHEMA
========================================================= */

const ReplySchema =
  z.object({
    body:
      z
        .string()
        .min(1)
        .max(3000),
  });

/* =========================================================
   TYPES
========================================================= */

export type GenerateReplyInput = {
  companyName: string;

  companyDescription?:
    | string
    | null;

  industry?:
    | string
    | null;

  location?:
    | string
    | null;

  websiteUrl?:
    | string
    | null;

  contactName?:
    | string
    | null;

  contactJobTitle?:
    | string
    | null;

  contactSalutation?:
    | string
    | null;

  researchSummary?:
    | string
    | null;

  websiteContext?:
    | string
    | null;

  originalSubject?:
    | string
    | null;

  originalOutreach?:
    | string
    | null;

  followUp?:
    | string
    | null;

  conversation: string;
};

export type GeneratedReply = {
  body: string;

  model: string;

  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

/* =========================================================
   OPENAI
========================================================= */

function createOpenAIClient() {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "OPENAI_API_KEY is missing from the environment."
    );
  }

  return new OpenAI({
    apiKey,
  });
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(
  value: string
) {
  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

function optionalSection(
  title: string,
  value:
    | string
    | null
    | undefined
) {
  if (
    !value?.trim()
  ) {
    return null;
  }

  return `${title}:\n${value.trim()}`;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateReply(
  input:
    GenerateReplyInput
): Promise<GeneratedReply> {
  const openai =
    createOpenAIClient();

  const context = [
    optionalSection(
      "Unternehmen",
      input.companyName
    ),

    optionalSection(
      "Branche",
      input.industry
    ),

    optionalSection(
      "Standort",
      input.location
    ),

    optionalSection(
      "Website",
      input.websiteUrl
    ),

    optionalSection(
      "Unternehmensbeschreibung",
      input.companyDescription
    ),

    optionalSection(
      "Ansprechpartner",
      input.contactName
    ),

    optionalSection(
      "Position Ansprechpartner",
      input.contactJobTitle
    ),

    optionalSection(
      "Anrede-Information",
      input.contactSalutation
    ),

    optionalSection(
      "Research",
      input.researchSummary
    ),

    optionalSection(
      "Website-Kontext",
      input.websiteContext
    ),

    optionalSection(
      "Ursprünglicher Betreff",
      input.originalSubject
    ),

    optionalSection(
      "Ursprüngliche Outreach-Mail von Joel",
      input.originalOutreach
    ),

    optionalSection(
      "Früheres Follow-up von Joel",
      input.followUp
    ),

    optionalSection(
      "Bisheriger E-Mail-Verlauf",
      input.conversation
    ),
  ]
    .filter(Boolean)
    .join(
      "\n\n"
    );

  const response =
    await openai.responses.parse({
      model:
        REPLY_MODEL,

      reasoning: {
        effort:
          "low",
      },

      input: [
        {
          role:
            "system",

          content: `
Du schreibst E-Mail-Antworten für Joel Cimpean, einen selbstständigen Webdesigner.

Du antwortest auf echte Gespräche mit potenziellen Kunden.

Die Antwort wird Joel anschließend angezeigt und von ihm selbst geprüft, bearbeitet und manuell verschickt.

=========================================================
GRUNDSTIL
=========================================================

Schreibe auf natürlichem, professionellem Deutsch.

Die Antwort soll wirken wie eine echte Nachricht von Joel und niemals wie:

- ein KI-Text
- ein Sales-Skript
- eine Marketing-Mail
- ein Website-Audit
- eine automatisierte Antwort

Schreibe:

- freundlich
- ruhig
- kompetent
- persönlich
- direkt
- natürlich
- nicht übertrieben förmlich
- nicht übertrieben begeistert

=========================================================
KONTEXT DES GESPRÄCHS
=========================================================

Der wichtigste Kontext ist die letzte Nachricht des Kunden und der bisherige E-Mail-Verlauf.

Beantworte konkrete Fragen des Kunden direkt.

Wenn der Kunde beispielsweise fragt, wie Joel bei einem Projekt vorgeht, erkläre den Ablauf knapp und verständlich.

Wenn der Kunde Interesse zeigt, führe das Gespräch sinnvoll weiter.

Wenn der Kunde ablehnt, akzeptiere das respektvoll.

Wenn der Kunde weitere Informationen möchte, antworte konkret.

=========================================================
ANREDE
=========================================================

Beachte den bisherigen Gesprächston.

Wenn bereits ein laufender Thread besteht, muss nicht bei jeder Nachricht erneut eine formelle Anrede verwendet werden.

Wenn eine Anrede natürlich sinnvoll ist, darf sie verwendet werden.

Wenn der Kunde eindeutig duzt, darfst du diesen Ton spiegeln.

Wenn das nicht eindeutig ist, bleibe bei der höflichen Sie-Ansprache.

Erfinde niemals Herr/Frau oder ein Geschlecht.

=========================================================
PERSONALISIERUNG
=========================================================

Du bekommst eventuell Informationen aus Joels Lead-Recherche und Website-Analyse.

Nutze diese nur, wenn sie für die konkrete Antwort wirklich hilfreich sind.

Erfinde nichts.

Wiederhole nicht unnötig Punkte aus der ursprünglichen Cold-Mail.

Der Kunde soll nicht merken, wie umfangreich die Website technisch analysiert wurde.

=========================================================
LÄNGE
=========================================================

Bevorzuge kurze Antworten.

Meistens reichen ungefähr 50 bis 140 Wörter.

Wenn die Frage des Kunden mehr Erklärung benötigt, darf die Antwort etwas länger sein.

Keine unnötigen Bulletpoints.

Keine langen Monologe.

=========================================================
VERBOTENE FORMULIERUNGEN
=========================================================

Vermeide typische KI- oder Sales-Sätze wie:

- "Vielen Dank für Ihr Interesse!"
- "Das klingt großartig!"
- "Ich freue mich sehr über Ihre Rückmeldung!"
- "Gerne erläutere ich Ihnen im Folgenden..."
- "Lassen Sie uns gemeinsam..."
- "Ihre digitale Präsenz auf das nächste Level bringen"
- "Conversion"
- "Pain Points"
- "Mehrwert schaffen"

Schreibe stattdessen menschlich und normal.

=========================================================
SIGNATUR
=========================================================

Erzeuge KEINE Signatur.

Erzeuge NICHT:

- Mit freundlichen Grüßen
- Kind regards
- Joel Cimpean
- E-Mail-Adresse
- Website

Die Signatur wird von Leadbase automatisch ergänzt.

=========================================================
WICHTIG
=========================================================

Du schreibst NUR den Text, den Joel oberhalb seiner Signatur senden soll.

Keinen Betreff.

Keine Metadaten.

Keine Erklärung deiner Entscheidung.

Keine Markdown-Formatierung.
          `.trim(),
        },

        {
          role:
            "user",

          content: `
Erstelle jetzt eine passende Antwort auf das aktuelle Gespräch.

Verwende ausschließlich Informationen aus dem folgenden Kontext.

Wenn Informationen fehlen, erfinde nichts.

KONTEXT:

${context}
          `.trim(),
        },
      ],

      text: {
        format:
          zodTextFormat(
            ReplySchema,
            "email_reply"
          ),
      },
    });

  const parsed =
    response.output_parsed;

  if (
    !parsed
  ) {
    throw new Error(
      "Reply generation returned no structured result."
    );
  }

  return {
    body:
      normalizeText(
        parsed.body
      ),

    model:
      REPLY_MODEL,

    usage: {
      inputTokens:
        response.usage
          ?.input_tokens ??
        0,

      outputTokens:
        response.usage
          ?.output_tokens ??
        0,

      totalTokens:
        response.usage
          ?.total_tokens ??
        0,
    },
  };
}