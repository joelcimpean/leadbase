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

const OUTREACH_MODEL =
  "gpt-5.6-luna";

const OUTREACH_SIGNATURE = [
  "Mit freundlichen Grüßen / Kind regards,",
  "",
  "Joel Cimpean",
  "hello@joelcimpean.com / joelcimpean.com",
].join("\n");

/* =========================================================
   SCHEMA
========================================================= */

const OutreachDraftSchema =
  z.object({
    subject:
      z
        .string()
        .max(60),

    body:
      z.string(),

    followUpBody:
      z.string(),

    personalizationPoints:
      z
        .array(
          z.string()
        )
        .max(5),
  });

export type GeneratedOutreachDraft =
  z.infer<
    typeof OutreachDraftSchema
  > & {
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

  industry?:
    | string
    | null;

  location?:
    | string
    | null;

  contactName?:
    | string
    | null;

  contactJobTitle?:
    | string
    | null;

  contactSalutation?:
    | "HERR"
    | "FRAU"
    | null;

  websiteUrl?:
    | string
    | null;

  campaignName?:
    | string
    | null;

  campaignOutreachAngle?:
    | string
    | null;

  campaignEmailTone?:
    | string
    | null;

  researchSummary?:
    | string
    | null;

  structuralScore?:
    | number
    | null;

  visualScore?:
    | number
    | null;

  opportunityScore?:
    | number
    | null;

  redesignPotential?:
    | number
    | null;

  visualStrengths?:
    string[];

  visualWeaknesses?:
    string[];

  redesignReason?:
    | string
    | null;

  suggestedOutreachAngle?:
    | string
    | null;
};

/* =========================================================
   OPENAI
========================================================= */

function createOpenAIClient() {
  const apiKey =
    process.env
      .OPENAI_API_KEY;

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

function getLastName(
  fullName: string
) {
  const parts =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "";
  }

  if (
    parts.length === 1
  ) {
    return parts[0];
  }

  const particles =
    new Set([
      "von",
      "van",
      "de",
      "der",
      "den",
      "zu",
      "zur",
    ]);

  let start =
    parts.length - 1;

  while (
    start > 0 &&
    particles.has(
      parts[
        start - 1
      ].toLowerCase()
    )
  ) {
    start -= 1;
  }

  return parts
    .slice(start)
    .join(" ");
}

function getPreferredGreeting(
  input:
    GenerateOutreachDraftInput
) {
  if (
    input.contactName &&
    input.contactSalutation ===
      "HERR"
  ) {
    return `Sehr geehrter Herr ${getLastName(
      input.contactName
    )},`;
  }

  if (
    input.contactName &&
    input.contactSalutation ===
      "FRAU"
  ) {
    return `Sehr geehrte Frau ${getLastName(
      input.contactName
    )},`;
  }

  return "Guten Tag,";
}

function normalizeTextBlock(
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

function appendSignature(
  value: string
) {
  return `${normalizeTextBlock(
    value
  )}\n\n${OUTREACH_SIGNATURE}`;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateOutreachDraft(
  input:
    GenerateOutreachDraftInput
): Promise<GeneratedOutreachDraft> {
  const openai =
    createOpenAIClient();

  const preferredGreeting =
    getPreferredGreeting(
      input
    );

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

    input.visualStrengths
      ?.length
      ? `Visuelle Stärken: ${input.visualStrengths.join(
          " | "
        )}`
      : null,

    input.visualWeaknesses
      ?.length
      ? `Visuelle Schwächen: ${input.visualWeaknesses.join(
          " | "
        )}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response =
    await openai.responses.parse({
      model:
        OUTREACH_MODEL,

      reasoning: {
        effort:
          "low",
      },

      input: [
        {
          role:
            "system",

          content: `
Du schreibst persönliche B2B-E-Mails für Joel Cimpean, einen selbstständigen Webdesigner.

Joel schreibt Unternehmen in Deutschland an, deren Website er sich tatsächlich angesehen hat.

Die Mail soll NICHT wie eine Website-Analyse, ein Audit, ein Sales-Skript oder ein KI-Text klingen.

Sie soll wirken wie eine echte, kurze Nachricht eines guten Webdesigners, der sich das Unternehmen kurz angesehen und eine konkrete Idee dazu hat.

=========================================================
GRUNDSTIL
=========================================================

Schreibe:

- professionell
- sympathisch
- persönlich
- ruhig
- selbstbewusst
- respektvoll
- natürlich
- auf sauberem Deutsch

Verwende konsequent die höfliche Sie-Ansprache.

Die Mail soll eher wie eine persönliche Geschäftsnachricht wirken als wie klassische Cold-Mail-Werbung.

=========================================================
ANREDE
=========================================================

Die erste Zeile MUSS exakt lauten:

${preferredGreeting}

Ändere diese Anrede nicht.

Wenn "Guten Tag," vorgegeben ist, darfst du selbst KEIN Herr oder Frau ergänzen.

=========================================================
ABSENDER
=========================================================

Der Absender ist:

Joel Cimpean
selbstständiger Webdesigner

Joel darf sich kurz vorstellen.

Eine natürliche Formulierung wäre zum Beispiel:

"mein Name ist Joel Cimpean, ich bin selbstständiger Webdesigner und bin auf Ihre Website gestoßen."

Du musst diese Formulierung NICHT wortwörtlich verwenden.

Vermeide aber eine lange Vorstellung.

=========================================================
WAS DIE MAIL TUN SOLL
=========================================================

Die Mail soll drei Dinge vermitteln:

1. Joel hat sich das Unternehmen bzw. die Website wirklich angesehen.

2. Es gibt einen konkreten Grund, warum eine modernere Website für dieses Unternehmen interessant sein könnte.

3. Der Empfänger kann ganz unkompliziert sagen, ob das Thema grundsätzlich interessant ist.

=========================================================
PERSONALISIERUNG
=========================================================

Nutze maximal 1 bis 2 wirklich gute Beobachtungen.

Bevorzuge Beobachtungen wie:

- gute Projekte oder Referenzen sind vorhanden
- Leistungen sind überzeugend
- Vorher-Nachher-Projekte sind vorhanden
- das Unternehmen wirkt erfahren
- gute Bilder sind vorhanden
- die Website stellt diese Inhalte noch nicht optimal dar
- mobile Darstellung könnte besser sein
- Projekte könnten stärker präsentiert werden
- der Weg zur Anfrage könnte klarer sein

WICHTIG:

Die Mail soll NICHT jede Schwäche aufzählen.

Sie ist keine Analyse.

=========================================================
TECHNISCHE PROBLEME
=========================================================

Verwende NIEMALS technische Audit-Sprache wie:

- Plugin-Fehler
- CTA visibility
- Visual hierarchy
- Responsive viewport
- Structural score
- Conversion gap
- Website score
- Redesign potential
- Hero section
- whitespace problem
- Ladefehlercode
- Couldn't load plugin

Wenn auf der Website sichtbar etwas nicht richtig funktioniert, beschreibe das nur sehr dezent.

Zum Beispiel:

"Auf der Startseite scheint ein zentraler Bereich aktuell nicht vollständig zu laden."

Aber:

Wenn genügend andere gute Personalisierung vorhanden ist, musst du technische Fehler überhaupt nicht erwähnen.

=========================================================
KRITIK
=========================================================

Niemals schreiben:

- Ihre Website ist schlecht
- Ihre Website ist veraltet
- Ihre Website sieht unprofessionell aus
- Ihre Website funktioniert nicht
- Ihre Seite ist nicht modern genug

Stattdessen:

- "Ihre Projekte könnten auf der Website noch stärker zur Geltung kommen."
- "Gerade mobil könnte die Darstellung deutlich klarer aufgebaut sein."
- "Ich glaube, dass sich Ihre Arbeiten online noch stärker präsentieren ließen."
- "Mit einer moderneren Struktur könnten die vorhandenen Inhalte deutlich besser wirken."

=========================================================
AUFBAU
=========================================================

Die Hauptmail soll idealerweise aus 3 kurzen Absätzen bestehen.

ABSATZ 1:

Anrede + kurze Vorstellung + echter Bezug zum Unternehmen.

ABSATZ 2:

Eine positive Beobachtung und eine konkrete Verbesserungsidee.

ABSATZ 3:

Eine einfache, unverbindliche Frage.

=========================================================
CALL TO ACTION
=========================================================

Der Abschluss soll niedrigschwellig sein.

Bevorzugte Richtung:

"Wäre eine Überarbeitung Ihrer Website für Sie grundsätzlich interessant? Falls ja, kann ich Ihnen gern unverbindlich zeigen, was ich mir vorstellen würde."

Oder ähnlich natürlich.

NICHT:

- "Buchen Sie hier einen Termin"
- "Wann haben Sie 15 Minuten?"
- "Lassen Sie uns Ihre Conversion steigern"
- "Darf ich Ihnen ein Angebot senden?"
- aggressive Sales-Fragen

=========================================================
LÄNGE
=========================================================

Hauptmail:

ungefähr 85 bis 120 Wörter

NICHT länger als nötig.

Kurze Absätze.

Keine Bulletpoints innerhalb der E-Mail.

=========================================================
BETREFF
=========================================================

Der Betreff muss wie ein normaler menschlicher Geschäftsmail-Betreff wirken.

Bevorzuge beispielsweise:

- "Kurze Frage zu Ihrer Website"
- "Ihre Website"
- "Kurze Frage zum Webauftritt"
- "Website-Auftritt"

Vermeide kreative Marketing-Betreffzeilen wie:

- "Ihre Website mobil gedacht"
- "Mehr Wirkung für Ihre Website"
- "Ihr digitaler Auftritt"
- "Website mit Potenzial"
- "Moderner auftreten"

Kein Clickbait.

Maximal ungefähr 6 Wörter.

=========================================================
SIGNATUR
=========================================================

Erzeuge KEINE Signatur.

Erzeuge NICHT:

- Mit freundlichen Grüßen
- Joel Cimpean
- E-Mail-Adresse
- Website

Die Signatur wird automatisch ergänzt.

=========================================================
FOLLOW-UP
=========================================================

Das Follow-up soll:

- dieselbe Anrede verwenden
- ungefähr 40 bis 60 Wörter haben
- nicht erneut die komplette Website analysieren
- freundlich und kurz sein
- keinen Druck ausüben

Es darf sinngemäß sagen:

"Falls das Thema aktuell nicht relevant ist, ist das natürlich völlig in Ordnung. Falls eine Überarbeitung grundsätzlich interessant ist, zeige ich Ihnen gern unverbindlich eine mögliche Richtung."

Vermeide:

"Ich wollte nur nachhaken."

=========================================================
PERSONALIZATION POINTS
=========================================================

Gib 3 bis maximal 5 kurze interne Stichpunkte zurück.

Diese Punkte sind nur für Joel.

Sie sollen klar und knapp sein.

Nicht:

"Auf der Startseite ist aktuell ein sichtbarer Ladehinweis ('Couldn't load plugin') mit einer großen freien Fläche zu sehen."

Sondern:

"Ein Bereich der Startseite lädt aktuell nicht vollständig."

Oder besser:

"Vorher-Nachher-Projekte eignen sich gut als persönlicher Einstieg."

Die Personalization Points sollen wie hilfreiche interne Notizen aussehen, nicht wie ein technischer Audit-Report.

=========================================================
WICHTIGSTE REGEL
=========================================================

Wenn eine Mail technisch korrekt, aber künstlich klingt, ist sie schlecht.

Schreibe so, wie ein kompetenter deutscher Webdesigner tatsächlich einem Unternehmer schreiben würde.
          `.trim(),
        },

        {
          role:
            "user",

          content: `
Schreibe jetzt einen personalisierten Outreach-Entwurf.

Verwende ausschließlich Informationen, die durch den folgenden Kontext gestützt werden.

Erfinde nichts.

KONTEXT:

${context}

Wähle aus allen Informationen nur die wenigen Punkte aus, die sich für eine persönliche und professionelle erste Nachricht wirklich eignen.

Die Mail soll nicht zeigen, wie viel analysiert wurde. Sie soll einfach persönlich und glaubwürdig wirken.
          `.trim(),
        },
      ],

      text: {
        format:
          zodTextFormat(
            OutreachDraftSchema,
            "outreach_draft"
          ),
      },
    });

  const parsed =
    response.output_parsed;

  if (
    !parsed
  ) {
    throw new Error(
      "Outreach generation returned no structured result."
    );
  }

  return {
    subject:
      parsed.subject
        .trim(),

    body:
      appendSignature(
        parsed.body
      ),

    followUpBody:
      appendSignature(
        parsed.followUpBody
      ),

    personalizationPoints:
      parsed.personalizationPoints,

    model:
      OUTREACH_MODEL,

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