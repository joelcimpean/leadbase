/* =========================================================
   EMAIL MESSAGE CLASSIFICATION

   Cheap deterministic classification for inbound Gmail
   messages. We intentionally do NOT call AI for obvious
   auto replies because headers + common subject/body
   patterns are usually more reliable and cost nothing.
========================================================= */

export type IncomingEmailKind =
  | "HUMAN"
  | "AUTO_REPLY";

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  )
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
}

/* =========================================================
   AUTOMATIC REPLY
========================================================= */

export function isAutomaticReply({
  subject,
  body,
  autoSubmitted,
  precedence,
  xAutoReply,
  xAutorespond,
  xAutoResponseSuppress,
}: {
  subject?:
    | string
    | null;

  body?:
    | string
    | null;

  autoSubmitted?:
    | string
    | null;

  precedence?:
    | string
    | null;

  xAutoReply?:
    | string
    | null;

  xAutorespond?:
    | string
    | null;

  xAutoResponseSuppress?:
    | string
    | null;
}) {
  const normalizedSubject =
    normalize(
      subject
    );

  const normalizedBody =
    normalize(
      body
    );

  const normalizedAutoSubmitted =
    normalize(
      autoSubmitted
    );

  const normalizedPrecedence =
    normalize(
      precedence
    );

  /*
   * RFC / provider headers are the strongest evidence.
   */
  if (
    normalizedAutoSubmitted &&
    normalizedAutoSubmitted !==
      "no"
  ) {
    return true;
  }

  if (
    normalize(
      xAutoReply
    ) ||
    normalize(
      xAutorespond
    ) ||
    normalize(
      xAutoResponseSuppress
    )
  ) {
    return true;
  }

  /*
   * Strong subject markers.
   */
  const automaticSubjectPatterns = [
    /^automatische antwort\b/i,
    /^automatische antwort:/i,
    /^automatische rückmeldung\b/i,
    /^automatische rückmeldung:/i,
    /^abwesenheitsnotiz\b/i,
    /^abwesenheitsnotiz:/i,
    /^abwesenheitsassistent\b/i,
    /^abwesenheitsassistent:/i,
    /^automatic reply\b/i,
    /^automatic reply:/i,
    /^auto reply\b/i,
    /^auto reply:/i,
    /^out of office\b/i,
    /^out of office:/i,
    /^ooo\b/i,
    /^ooo:/i,
    /^autoreply\b/i,
    /^autoreply:/i,
  ];

  if (
    automaticSubjectPatterns.some(
      (
        pattern
      ) =>
        pattern.test(
          normalizedSubject
        )
    )
  ) {
    return true;
  }

  /*
   * Strong body phrases. These are deliberately more
   * specific than a generic mention of "Urlaub" so normal
   * human replies are not incorrectly classified.
   */
  const strongBodyPatterns = [
    /\bdies ist eine automatische antwort\b/i,
    /\bdiese nachricht wurde automatisch erstellt\b/i,
    /\bautomatisch generierte nachricht\b/i,
    /\bautomatisch generierte e-?mail\b/i,
    /\bihre (?:e-?mail|nachricht) wird nicht weitergeleitet\b/i,
    /\bich bin .*? bis .*? nicht im haus\b/i,
    /\bich bin bis .*? nicht im haus\b/i,
    /\bich bin .*? bis .*? nicht erreichbar\b/i,
    /\bich bin bis .*? nicht erreichbar\b/i,
    /\bich befinde mich .*? im urlaub\b/i,
    /\bich bin derzeit .*? im urlaub\b/i,
    /\bich bin aktuell .*? im urlaub\b/i,
    /\bich bin momentan .*? im urlaub\b/i,
    /\bcurrently out of (?:the )?office\b/i,
    /\bi am out of (?:the )?office\b/i,
    /\bi(?:'m| am) currently away\b/i,
    /\bi will return on\b/i,
    /\bthis is an automatic reply\b/i,
    /\bthis message was generated automatically\b/i,
  ];

  if (
    strongBodyPatterns.some(
      (
        pattern
      ) =>
        pattern.test(
          normalizedBody
        )
    )
  ) {
    return true;
  }

  /*
   * Common automated acknowledgement pattern. Requiring
   * multiple signals keeps false positives low.
   */
  const acknowledgement =
    (
      normalizedBody.includes(
        "vielen dank für ihre nachricht"
      ) ||
      normalizedBody.includes(
        "thank you for your message"
      )
    ) &&
    (
      normalizedBody.includes(
        "automatisch"
      ) ||
      normalizedBody.includes(
        "automated"
      ) ||
      normalizedBody.includes(
        "nicht im haus"
      ) ||
      normalizedBody.includes(
        "out of office"
      )
    );

  if (
    acknowledgement
  ) {
    return true;
  }

  /*
   * Bulk/list precedence is weak evidence by itself, but in
   * combination with automatic language it is useful.
   */
  if (
    [
      "bulk",
      "list",
      "junk",
    ].includes(
      normalizedPrecedence
    ) &&
    (
      normalizedBody.includes(
        "automatisch"
      ) ||
      normalizedBody.includes(
        "automatic"
      ) ||
      normalizedBody.includes(
        "automated"
      )
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   CLASSIFIER
========================================================= */

export function classifyIncomingEmail(
  input:
    Parameters<
      typeof isAutomaticReply
    >[0]
): IncomingEmailKind {
  return isAutomaticReply(
    input
  )
    ? "AUTO_REPLY"
    : "HUMAN";
}
