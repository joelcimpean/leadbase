import "server-only";

import OpenAI from "openai";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  z,
} from "zod";

/* =========================================================
   TYPES
========================================================= */

export const REPLY_CLASSIFICATIONS = [
  "INTERESTED",
  "QUESTION",
  "NOT_INTERESTED",
  "OUT_OF_OFFICE",
  "FOLLOW_UP_LATER",
  "BOUNCE",
  "NEUTRAL",
] as const;

export type ReplyClassification =
  (
    typeof REPLY_CLASSIFICATIONS
  )[number];

export type ReplyIntelligenceResult = {
  classification:
    ReplyClassification;

  confidence:
    number;

  reason:
    string;

  followUpDate:
    string
    | null;

  followUpAt:
    string
    | null;

  detectedDateText:
    string
    | null;

  alternativeContactName:
    string
    | null;

  alternativeContactEmail:
    string
    | null;

  model:
    string;

  usage: {
    inputTokens:
      number;

    outputTokens:
      number;

    totalTokens:
      number;
  };
};

export type ReplyIntelligenceInput = {
  subject:
    string
    | null;

  body:
    string;

  fromEmail:
    string;

  fromName?:
    string
    | null;

  companyName?:
    string
    | null;

  contactName?:
    string
    | null;

  receivedAt:
    string;

  automaticReply:
    boolean;

  hardBounce:
    boolean;
};

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_MODEL =
  "gpt-5.6-luna";

const BERLIN_TIME_ZONE =
  "Europe/Berlin";

/* =========================================================
   SCHEMA
========================================================= */

const ReplyIntelligenceSchema =
  z.object({
    classification:
      z.enum(
        REPLY_CLASSIFICATIONS
      ),

    confidence:
      z
        .number()
        .min(
          0
        )
        .max(
          1
        ),

    reason:
      z
        .string()
        .max(
          220
        ),

    followUpDate:
      z
        .string()
        .nullable(),

    detectedDateText:
      z
        .string()
        .max(
          160
        )
        .nullable(),

    alternativeContactName:
      z
        .string()
        .max(
          120
        )
        .nullable(),

    alternativeContactEmail:
      z
        .string()
        .max(
          180
        )
        .nullable(),
  });

/* =========================================================
   HELPERS
========================================================= */

function getOpenAIClient() {
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

function cleanNullableText(
  value:
    string
    | null
    | undefined
) {
  const cleaned =
    value
      ?.trim() ??
    "";

  return (
    cleaned ||
    null
  );
}

function cleanEmail(
  value:
    string
    | null
    | undefined
) {
  const cleaned =
    value
      ?.trim()
      .toLowerCase() ??
    "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      cleaned
    )
  ) {
    return null;
  }

  return cleaned;
}

function cleanDate(
  value:
    string
    | null
    | undefined
) {
  const cleaned =
    value
      ?.trim() ??
    "";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      cleaned
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    cleaned
      .split(
        "-"
      )
      .map(
        Number
      );

  const test =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day
      )
    );

  if (
    test.getUTCFullYear() !==
      year ||
    test.getUTCMonth() !==
      month -
        1 ||
    test.getUTCDate() !==
      day
  ) {
    return null;
  }

  return cleaned;
}

function getTimeZoneOffsetMs(
  date:
    Date,
  timeZone:
    string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (
            part
          ) =>
            part.type !==
            "literal"
        )
        .map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
    );

  const zonedAsUtc =
    Date.UTC(
      Number(
        values.year
      ),
      Number(
        values.month
      ) -
        1,
      Number(
        values.day
      ),
      Number(
        values.hour
      ),
      Number(
        values.minute
      ),
      Number(
        values.second
      )
    );

  return (
    zonedAsUtc -
    date.getTime()
  );
}

export function berlinDateAtNineToIso(
  dateValue:
    string
) {
  const cleaned =
    cleanDate(
      dateValue
    );

  if (
    !cleaned
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    cleaned
      .split(
        "-"
      )
      .map(
        Number
      );

  const localWallClockAsUtc =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
        9,
        0,
        0
      )
    );

  const firstOffset =
    getTimeZoneOffsetMs(
      localWallClockAsUtc,
      BERLIN_TIME_ZONE
    );

  let utcDate =
    new Date(
      localWallClockAsUtc.getTime() -
        firstOffset
    );

  /*
   * A second pass safely handles the rare case where the
   * first guess crosses a DST boundary.
   */
  const secondOffset =
    getTimeZoneOffsetMs(
      utcDate,
      BERLIN_TIME_ZONE
    );

  utcDate =
    new Date(
      localWallClockAsUtc.getTime() -
        secondOffset
    );

  return utcDate.toISOString();
}

/* =========================================================
   DETERMINISTIC OOO DATE PARSING

   AI is useful for intent, but explicit date ranges should
   not depend on model interpretation.

   Example:
   "Ich befinde mich vom 31.08.-13.09. im Urlaub."

   13.09. is the final absence day, therefore Leadbase should
   follow up on 14.09. at 09:00 Europe/Berlin.
========================================================= */

const MONTH_NAME_TO_NUMBER:
  Record<
    string,
    number
  > = {
    januar:
      1,
    january:
      1,
    februar:
      2,
    february:
      2,
    märz:
      3,
    maerz:
      3,
    march:
      3,
    april:
      4,
    mai:
      5,
    may:
      5,
    juni:
      6,
    june:
      6,
    juli:
      7,
    july:
      7,
    august:
      8,
    september:
      9,
    oktober:
      10,
    october:
      10,
    november:
      11,
    dezember:
      12,
    december:
      12,
  };

function berlinDateParts(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          BERLIN_TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (
            part
          ) =>
            part.type !==
            "literal"
        )
        .map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
    );

  return {
    year:
      Number(
        values.year
      ),

    month:
      Number(
        values.month
      ),

    day:
      Number(
        values.day
      ),
  };
}

function normalizeYear(
  value:
    string
    | undefined
    | null,
  fallbackYear:
    number
) {
  if (
    !value
  ) {
    return fallbackYear;
  }

  const numeric =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return fallbackYear;
  }

  if (
    numeric <
    100
  ) {
    return (
      2000 +
      numeric
    );
  }

  return numeric;
}

function inferDateYear({
  day,
  month,
  explicitYear,
  receivedAt,
}: {
  day:
    number;

  month:
    number;

  explicitYear?:
    string
    | null;

  receivedAt:
    string;
}) {
  const received =
    berlinDateParts(
      receivedAt
    );

  if (
    !received
  ) {
    return normalizeYear(
      explicitYear,
      new Date()
        .getUTCFullYear()
    );
  }

  if (
    explicitYear
  ) {
    return normalizeYear(
      explicitYear,
      received.year
    );
  }

  let year =
    received.year;

  /*
   * A January return date received in December almost
   * certainly refers to the next year.
   */
  if (
    month <
      received.month &&
    received.month -
      month >=
      6
  ) {
    year +=
      1;
  }

  /*
   * Guard the candidate. Invalid dates are rejected later.
   */
  void day;

  return year;
}

function dateString({
  year,
  month,
  day,
}: {
  year:
    number;

  month:
    number;

  day:
    number;
}) {
  const candidate =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day
      )
    );

  if (
    candidate.getUTCFullYear() !==
      year ||
    candidate.getUTCMonth() !==
      month -
        1 ||
    candidate.getUTCDate() !==
      day
  ) {
    return null;
  }

  return [
    String(
      year
    ).padStart(
      4,
      "0"
    ),
    String(
      month
    ).padStart(
      2,
      "0"
    ),
    String(
      day
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

function addDaysToDateString(
  value:
    string,
  days:
    number
) {
  const cleaned =
    cleanDate(
      value
    );

  if (
    !cleaned
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    cleaned
      .split(
        "-"
      )
      .map(
        Number
      );

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day +
          days
      )
    );

  return [
    String(
      date.getUTCFullYear()
    ).padStart(
      4,
      "0"
    ),
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

export function detectOutOfOfficeFollowUpDate({
  body,
  receivedAt,
}: {
  body:
    string;

  receivedAt:
    string;
}) {
  const normalized =
    body
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .toLowerCase();

  if (
    !normalized
  ) {
    return null;
  }

  /*
   * Numeric range:
   * 31.08.-13.09.
   * 31.08. - 13.09.
   * 31.08.2026 bis 13.09.2026
   */
  const numericRange =
    normalized.match(
      /(?:vom\s+)?(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?\s*(?:-|–|—|bis)\s*(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?/
    );

  if (
    numericRange
  ) {
    const endDay =
      Number(
        numericRange[4]
      );

    const endMonth =
      Number(
        numericRange[5]
      );

    const endYear =
      inferDateYear({
        day:
          endDay,

        month:
          endMonth,

        explicitYear:
          numericRange[6] ??
          numericRange[3] ??
          null,

        receivedAt,
      });

    const lastAwayDay =
      dateString({
        year:
          endYear,

        month:
          endMonth,

        day:
          endDay,
      });

    if (
      lastAwayDay
    ) {
      return addDaysToDateString(
        lastAwayDay,
        1
      );
    }
  }

  /*
   * "bis zum 13.09." / "bis 13.09.2026"
   * The stated date is treated as the final absence day.
   */
  const untilNumeric =
    normalized.match(
      /\bbis(?:\s+zum)?\s+(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?/
    );

  if (
    untilNumeric
  ) {
    const day =
      Number(
        untilNumeric[1]
      );

    const month =
      Number(
        untilNumeric[2]
      );

    const year =
      inferDateYear({
        day,

        month,

        explicitYear:
          untilNumeric[3] ??
          null,

        receivedAt,
      });

    const lastAwayDay =
      dateString({
        year,
        month,
        day,
      });

    if (
      lastAwayDay
    ) {
      return addDaysToDateString(
        lastAwayDay,
        1
      );
    }
  }

  /*
   * "bis zum 13. September"
   */
  const untilNamedMonth =
    normalized.match(
      /\bbis(?:\s+zum)?\s+(\d{1,2})\.?\s+(januar|january|februar|february|märz|maerz|march|april|mai|may|juni|june|juli|july|august|september|oktober|october|november|dezember|december)(?:\s+(\d{4}))?/
    );

  if (
    untilNamedMonth
  ) {
    const day =
      Number(
        untilNamedMonth[1]
      );

    const month =
      MONTH_NAME_TO_NUMBER[
        untilNamedMonth[2]
      ];

    if (
      month
    ) {
      const year =
        inferDateYear({
          day,

          month,

          explicitYear:
            untilNamedMonth[3] ??
            null,

          receivedAt,
        });

      const lastAwayDay =
        dateString({
          year,
          month,
          day,
        });

      if (
        lastAwayDay
      ) {
        return addDaysToDateString(
          lastAwayDay,
          1
        );
      }
    }
  }

  /*
   * "ab 14.09. wieder erreichbar"
   * Here the stated date is already the first available day.
   */
  const availableFromNumeric =
    normalized.match(
      /\b(?:ab|wieder\s+ab)\s+(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?/
    );

  if (
    availableFromNumeric
  ) {
    const day =
      Number(
        availableFromNumeric[1]
      );

    const month =
      Number(
        availableFromNumeric[2]
      );

    const year =
      inferDateYear({
        day,

        month,

        explicitYear:
          availableFromNumeric[3] ??
          null,

        receivedAt,
      });

    return dateString({
      year,
      month,
      day,
    });
  }

  return null;
}

export function detectOutOfOfficeFollowUpAt({
  body,
  receivedAt,
}: {
  body:
    string;

  receivedAt:
    string;
}) {
  const date =
    detectOutOfOfficeFollowUpDate({
      body,
      receivedAt,
    });

  return date
    ? berlinDateAtNineToIso(
        date
      )
    : null;
}

function fallbackResult({
  automaticReply,
  reason,
}: {
  automaticReply:
    boolean;

  reason:
    string;
}): ReplyIntelligenceResult {
  return {
    classification:
      "NEUTRAL",

    confidence:
      automaticReply
        ? 0.45
        : 0.25,

    reason,

    followUpDate:
      null,

    followUpAt:
      null,

    detectedDateText:
      null,

    alternativeContactName:
      null,

    alternativeContactEmail:
      null,

    model:
      "fallback",

    usage: {
      inputTokens:
        0,

      outputTokens:
        0,

      totalTokens:
        0,
    },
  };
}

/* =========================================================
   CLASSIFY
========================================================= */

export async function classifyReplyIntelligence(
  input:
    ReplyIntelligenceInput
): Promise<ReplyIntelligenceResult> {
  if (
    input.hardBounce
  ) {
    return {
      classification:
        "BOUNCE",

      confidence:
        1,

      reason:
        "Technische Unzustellbarkeitsmeldung erkannt.",

      followUpDate:
        null,

      followUpAt:
        null,

      detectedDateText:
        null,

      alternativeContactName:
        null,

      alternativeContactEmail:
        null,

      model:
        "deterministic",

      usage: {
        inputTokens:
          0,

        outputTokens:
          0,

        totalTokens:
          0,
      },
    };
  }

  const body =
    input.body
      .trim()
      .slice(
        0,
        6_000
      );

  const subject =
    input.subject
      ?.trim()
      .slice(
        0,
        500
      ) ??
    "";

  if (
    !body &&
    !subject
  ) {
    return fallbackResult({
      automaticReply:
        input.automaticReply,

      reason:
        "Die Nachricht enthält zu wenig Text für eine sichere Einordnung.",
    });
  }

  const receivedDate =
    new Intl.DateTimeFormat(
      "de-DE",
      {
        timeZone:
          BERLIN_TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).format(
      new Date(
        input.receivedAt
      )
    );

  const model =
    process.env
      .OPENAI_REPLY_CLASSIFICATION_MODEL ??
    DEFAULT_MODEL;

  try {
    const openai =
      getOpenAIClient();

    const response =
      await openai.responses.parse({
        model,

        reasoning: {
          effort:
            "low",
        },

        store:
          false,

        input: [
          {
            role:
              "system",

            content: `
Du klassifizierst ausschließlich eingehende B2B-E-Mail-Antworten für ein CRM.

Du darfst NICHT antworten, nichts verkaufen und keine Handlung ausführen.

Wähle GENAU eine Kategorie:

INTERESTED
= klar positives Interesse an Website, Design, Gespräch, Angebot oder weiterer Zusammenarbeit.

QUESTION
= echte Rückfrage, Bitte um Informationen, Preisfrage, Prozessfrage oder Klärungsbedarf.

NOT_INTERESTED
= klare Absage, kein Bedarf, kein Interesse, bitte nicht mehr kontaktieren oder sinngemäß endgültig negativ.

OUT_OF_OFFICE
= Abwesenheit, Urlaub, Krankheit oder automatische Abwesenheitsnotiz.

FOLLOW_UP_LATER
= die Person bittet ausdrücklich darum, zu einem späteren Zeitpunkt erneut kontaktiert zu werden, z. B. "im Oktober", "nächste Woche", "nach dem Urlaub".

BOUNCE
= technische Unzustellbarkeit. Verwende dies nur bei eindeutigem Delivery-/Bounce-Inhalt.

NEUTRAL
= menschliche Antwort ohne klare Kategorie ODER automatische Empfangsbestätigung ohne Abwesenheit.

Regeln:

- Nicht zu viel hineininterpretieren.
- Ein höfliches "Danke" allein ist NICHT INTERESTED.
- Wenn die Nachricht gleichzeitig eine Rückfrage und klares Interesse enthält, nimm INTERESTED.
- Wenn eine klare Absage enthalten ist, nimm NOT_INTERESTED.
- Wenn ausdrücklich ein späterer Kontaktzeitpunkt genannt wird, nimm FOLLOW_UP_LATER.
- Bei automatischen Antworten darfst du niemals INTERESTED, QUESTION oder NOT_INTERESTED erfinden.
- Wenn "automaticReply=true" und keine echte Abwesenheit erkennbar ist, nimm NEUTRAL.
- reason: maximal ein kurzer deutscher Satz.
- confidence: 0 bis 1.
- followUpDate: nur wenn aus dem Text sinnvoll ein konkretes Datum ableitbar ist, Format YYYY-MM-DD, sonst null.
- Nutze für relative Datumsangaben das Empfangsdatum als Referenz.
- detectedDateText: kurze Originalbedeutung wie "ab 14. September wieder da" oder "im Oktober", sonst null.
- alternativeContactName / alternativeContactEmail: nur wenn die Mail ausdrücklich eine alternative Kontaktperson nennt, sonst null.
- Erfinde keine Person, E-Mail oder Daten.
            `.trim(),
          },

          {
            role:
              "user",

            content: `
EMPFANGSDATUM DEUTSCHLAND:
${receivedDate}

automaticReply:
${input.automaticReply ? "true" : "false"}

Absender:
${input.fromName ?? "unbekannt"} <${input.fromEmail}>

Unternehmen:
${input.companyName ?? "unbekannt"}

Gespeicherter Ansprechpartner:
${input.contactName ?? "unbekannt"}

Betreff:
${subject || "(leer)"}

Nachricht:
${body || "(leer)"}
            `.trim(),
          },
        ],

        text: {
          format:
            zodTextFormat(
              ReplyIntelligenceSchema,
              "reply_intelligence"
            ),
        },
      });

    const parsed =
      response.output_parsed;

    if (
      !parsed
    ) {
      return fallbackResult({
        automaticReply:
          input.automaticReply,

        reason:
          "Die KI-Klassifizierung lieferte kein strukturiertes Ergebnis.",
      });
    }

    let classification =
      parsed.classification;

    /*
     * Deterministic Gmail auto-reply detection is stronger
     * than an intent guess from the language model.
     */
    if (
      input.automaticReply &&
      classification !==
        "OUT_OF_OFFICE" &&
      classification !==
        "NEUTRAL"
    ) {
      classification =
        "NEUTRAL";
    }

    const deterministicOooDate =
      classification ===
        "OUT_OF_OFFICE"
        ? detectOutOfOfficeFollowUpDate({
            body:
              input.body,

            receivedAt:
              input.receivedAt,
          })
        : null;

    const followUpDate =
      deterministicOooDate ??
      cleanDate(
        parsed.followUpDate
      );

    const followUpAt =
      followUpDate
        ? berlinDateAtNineToIso(
            followUpDate
          )
        : null;

    return {
      classification,

      confidence:
        Math.max(
          0,
          Math.min(
            1,
            parsed.confidence
          )
        ),

      reason:
        parsed.reason
          .trim()
          .slice(
            0,
            220
          ) ||
        "Keine zusätzliche Begründung.",

      followUpDate,

      followUpAt,

      detectedDateText:
        cleanNullableText(
          parsed.detectedDateText
        ),

      alternativeContactName:
        cleanNullableText(
          parsed.alternativeContactName
        ),

      alternativeContactEmail:
        cleanEmail(
          parsed.alternativeContactEmail
        ),

      model,

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
  } catch (
    error
  ) {
    console.error(
      "Reply intelligence classification failed:",
      error
    );

    /*
     * Inbox synchronization must never fail only because
     * the classifier is temporarily unavailable.
     */
    return fallbackResult({
      automaticReply:
        input.automaticReply,

      reason:
        "Klassifizierung vorübergehend nicht verfügbar; Nachricht wurde sicher als neutral gespeichert.",
    });
  }
}

/* =========================================================
   DB COLUMN MAPPER
========================================================= */

export function replyIntelligenceColumns({
  result,
  automaticReply,
}: {
  result:
    ReplyIntelligenceResult;

  automaticReply:
    boolean;
}) {
  return {
    is_automatic_reply:
      automaticReply,

    reply_classification:
      result.classification,

    reply_classification_confidence:
      result.confidence,

    reply_classification_reason:
      result.reason,

    reply_follow_up_at:
      result.followUpAt,

    reply_detected_date_text:
      result.detectedDateText,

    reply_alternative_contact_name:
      result.alternativeContactName,

    reply_alternative_contact_email:
      result.alternativeContactEmail,

    reply_classified_at:
      new Date()
        .toISOString(),

    reply_classification_model:
      result.model,

    reply_classification_input_tokens:
      result.usage.inputTokens,

    reply_classification_output_tokens:
      result.usage.outputTokens,

    reply_classification_total_tokens:
      result.usage.totalTokens,
  };
}
