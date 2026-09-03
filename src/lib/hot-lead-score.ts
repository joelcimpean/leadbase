/* =========================================================
   HOT LEAD SCORE
========================================================= */

export type HotLeadLevel =
  | "COLD"
  | "COOL"
  | "WARM"
  | "HOT";

export type HotLeadReason = {
  key:
    string;

  label:
    string;

  points:
    number;
};

export type HotLeadScoreInput = {
  leadStatus:
    string
    | null;

  opportunityScore:
    number
    | null;

  emailQualityStatus:
    string
    | null;

  preview: {
    externalVisitors:
      number;

    externalSessions:
      number;

    outreachSessions:
      number;

    engagedExternalSessions:
      number;

    maxDurationSeconds:
      number;

    maxScrollPercent:
      number;

    maxInteractionCount:
      number;
  };

  latestReply: {
    classification:
      string
      | null;

    confidence:
      number
      | null;

    automatic:
      boolean;
  }
  | null;
};

export type HotLeadScoreResult = {
  score:
    number;

  level:
    HotLeadLevel;

  reasons:
    HotLeadReason[];

  recommendedPriority:
    "LOW"
    | "MEDIUM"
    | "HIGH";
};

/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value:
    number,
  min:
    number,
  max:
    number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function levelForScore(
  score:
    number
): HotLeadLevel {
  if (
    score >=
    70
  ) {
    return "HOT";
  }

  if (
    score >=
    45
  ) {
    return "WARM";
  }

  if (
    score >=
    25
  ) {
    return "COOL";
  }

  return "COLD";
}

function priorityForScore(
  score:
    number
) {
  if (
    score >=
    70
  ) {
    return "HIGH" as const;
  }

  if (
    score >=
    45
  ) {
    return "MEDIUM" as const;
  }

  return "LOW" as const;
}

/* =========================================================
   CALCULATE
========================================================= */

export function calculateHotLeadScore(
  input:
    HotLeadScoreInput
): HotLeadScoreResult {
  /*
   * Closed / forbidden leads should not appear as hot.
   */
  if (
    input.leadStatus ===
      "LOST" ||
    input.leadStatus ===
      "DO_NOT_CONTACT" ||
    input.leadStatus ===
      "WON"
  ) {
    return {
      score:
        0,

      level:
        "COLD",

      reasons:
        [],

      recommendedPriority:
        "LOW",
    };
  }

  let score =
    0;

  const reasons:
    HotLeadReason[] =
    [];

  function add(
    key:
      string,
    label:
      string,
    points:
      number
  ) {
    score +=
      points;

    if (
      points !==
      0
    ) {
      reasons.push({
        key,
        label,
        points,
      });
    }
  }

  /* -------------------------------------------------------
     BASE OPPORTUNITY

     Website weakness alone never makes someone "hot".
     It only provides a small base layer.
  ------------------------------------------------------- */

  if (
    input.opportunityScore !==
    null
  ) {
    const points =
      Math.round(
        clamp(
          input.opportunityScore,
          0,
          100
        ) *
          0.18
      );

    add(
      "opportunity",
      `Opportunity ${input.opportunityScore}/100`,
      points
    );
  }

  /* -------------------------------------------------------
     EMAIL CONFIDENCE
  ------------------------------------------------------- */

  switch (
    input.emailQualityStatus
  ) {
    case "VERIFIED_WEBSITE":
      add(
        "email_verified",
        "E-Mail auf Website verifiziert",
        5
      );
      break;

    case "DOMAIN_MATCH":
      add(
        "email_domain",
        "E-Mail-Domain passt",
        4
      );
      break;

    case "GENERIC_VALID":
    case "PERSONAL_VALID":
      add(
        "email_valid",
        "Plausible E-Mail",
        2
      );
      break;

    case "PLACEHOLDER":
    case "INVALID":
    case "MISSING":
      add(
        "email_risk",
        "Unsichere E-Mail",
        -10
      );
      break;
  }

  /* -------------------------------------------------------
     PREVIEW BEHAVIOR
  ------------------------------------------------------- */

  if (
    input.preview
      .externalVisitors >
    0
  ) {
    add(
      "preview_viewed",
      "Kundenvorschau extern geöffnet",
      12
    );
  }

  if (
    input.preview
      .outreachSessions >
    0
  ) {
    add(
      "outreach_click",
      "Outreach-Link geöffnet",
      8
    );
  }

  if (
    input.preview
      .engagedExternalSessions >
    0
  ) {
    add(
      "preview_engaged",
      "Aktiv mit Vorschau beschäftigt",
      15
    );
  }

  if (
    input.preview
      .externalSessions >=
    3
  ) {
    add(
      "preview_repeat",
      "Mehrfach zur Vorschau zurückgekehrt",
      10
    );
  } else if (
    input.preview
      .externalSessions >=
    2
  ) {
    add(
      "preview_repeat",
      "Vorschau mehrfach geöffnet",
      6
    );
  }

  if (
    input.preview
      .maxDurationSeconds >=
    60
  ) {
    add(
      "preview_duration",
      "Mindestens 60s angesehen",
      8
    );
  } else if (
    input.preview
      .maxDurationSeconds >=
    30
  ) {
    add(
      "preview_duration",
      "Mindestens 30s angesehen",
      5
    );
  }

  if (
    input.preview
      .maxScrollPercent >=
    80
  ) {
    add(
      "preview_scroll",
      "Mindestens 80% gescrollt",
      8
    );
  } else if (
    input.preview
      .maxScrollPercent >=
    50
  ) {
    add(
      "preview_scroll",
      "Mindestens 50% gescrollt",
      5
    );
  }

  if (
    input.preview
      .maxInteractionCount >
    0
  ) {
    add(
      "preview_interaction",
      "Mit Vorschau interagiert",
      4
    );
  }

  /* -------------------------------------------------------
     REPLY INTELLIGENCE
  ------------------------------------------------------- */

  const reply =
    input.latestReply;

  if (
    reply &&
    !reply.automatic
  ) {
    switch (
      reply.classification
    ) {
      case "INTERESTED":
        add(
          "reply_interested",
          "Antwort als interessiert erkannt",
          reply.confidence !==
            null &&
          reply.confidence >=
            0.75
            ? 35
            : 28
        );
        break;

      case "QUESTION":
        add(
          "reply_question",
          "Kunde hat eine Rückfrage",
          25
        );
        break;

      case "FOLLOW_UP_LATER":
        add(
          "reply_later",
          "Kunde möchte später kontaktiert werden",
          12
        );
        break;

      case "NEUTRAL":
        add(
          "reply_neutral",
          "Echte Kundenantwort erhalten",
          10
        );
        break;

      case "NOT_INTERESTED":
        add(
          "reply_negative",
          "Klare Absage erkannt",
          -50
        );
        break;

      case "BOUNCE":
        add(
          "reply_bounce",
          "Unzustellbare E-Mail",
          -40
        );
        break;
    }
  }

  if (
    input.leadStatus ===
    "REPLIED"
  ) {
    add(
      "status_replied",
      "Lead hat geantwortet",
      5
    );
  }

  const finalScore =
    clamp(
      Math.round(
        score
      ),
      0,
      100
    );

  /*
   * Highest-impact reasons first in the UI.
   */
  reasons.sort(
    (
      a,
      b
    ) =>
      Math.abs(
        b.points
      ) -
      Math.abs(
        a.points
      )
  );

  return {
    score:
      finalScore,

    level:
      levelForScore(
        finalScore
      ),

    reasons,

    recommendedPriority:
      priorityForScore(
        finalScore
      ),
  };
}

/* =========================================================
   AUTO PRIORITY

   Phase 3A only raises urgency automatically.
   It never silently downgrades a priority Joel manually set.
========================================================= */

export function shouldRaisePriority({
  currentPriority,
  recommendedPriority,
}: {
  currentPriority:
    string
    | null;

  recommendedPriority:
    "LOW"
    | "MEDIUM"
    | "HIGH";
}) {
  const rank:
    Record<
      string,
      number
    > = {
    LOW:
      1,
    MEDIUM:
      2,
    HIGH:
      3,
  };

  const currentRank =
    currentPriority
      ? rank[
          currentPriority
        ] ??
        0
      : 0;

  return (
    rank[
      recommendedPriority
    ] >
    currentRank
  );
}
