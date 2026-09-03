/* =========================================================
   EMAIL QUALITY / SAFETY
========================================================= */

export type EmailQualityStatus =
  | "UNCHECKED"
  | "MISSING"
  | "INVALID"
  | "PLACEHOLDER"
  | "VERIFIED_WEBSITE"
  | "DOMAIN_MATCH"
  | "GENERIC_VALID"
  | "PERSONAL_VALID"
  | "DOMAIN_MISMATCH"
  | "SUSPICIOUS";

export type EmailQualityLevel =
  | "good"
  | "warning"
  | "blocked";

export type EmailQualityAssessment = {
  email:
    string
    | null;

  status:
    EmailQualityStatus;

  level:
    EmailQualityLevel;

  blocksSending:
    boolean;

  detail:
    string;

  websiteDomain:
    string
    | null;

  emailDomain:
    string
    | null;

  candidateEmail:
    string
    | null;

  candidateSourceUrl:
    string
    | null;

  shouldAutoReplace:
    boolean;

  replacementEmail:
    string
    | null;
};

/* =========================================================
   CONFIG
========================================================= */

const PLACEHOLDER_LOCAL_PARTS =
  new Set([
    "benutzer",
    "user",
    "username",
    "beispiel",
    "example",
    "test",
    "testing",
    "demo",
    "muster",
    "mustermann",
    "max.mustermann",
    "vorname",
    "vorname.nachname",
    "firstname",
    "firstname.lastname",
    "name",
    "yourname",
    "your.name",
  ]);

const PLACEHOLDER_DOMAINS =
  new Set([
    "domain.de",
    "domain.com",
    "example.com",
    "example.de",
    "example.org",
    "test.de",
    "test.com",
    "localhost",
  ]);

const GENERIC_LOCAL_PARTS =
  new Set([
    "info",
    "kontakt",
    "contact",
    "office",
    "hello",
    "hallo",
    "mail",
    "service",
    "support",
    "team",
    "sales",
    "anfrage",
    "zentrale",
    "post",
  ]);

const FREE_EMAIL_DOMAINS =
  new Set([
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "yahoo.de",
    "gmx.de",
    "gmx.net",
    "web.de",
    "icloud.com",
    "me.com",
  ]);

/* =========================================================
   HELPERS
========================================================= */

export function normalizeEmail(
  value:
    string
    | null
    | undefined
) {
  const normalized =
    value
      ?.trim()
      .toLowerCase() ??
    "";

  return normalized ||
    null;
}

export function isValidEmailSyntax(
  value:
    string
    | null
    | undefined
) {
  const normalized =
    normalizeEmail(
      value
    );

  if (
    !normalized
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalized
  );
}

export function getEmailDomain(
  value:
    string
    | null
    | undefined
) {
  const normalized =
    normalizeEmail(
      value
    );

  if (
    !normalized ||
    !normalized.includes(
      "@"
    )
  ) {
    return null;
  }

  return normalized
    .split(
      "@"
    )
    .at(
      -1
    )
    ?.replace(
      /^www\./,
      ""
    ) ??
    null;
}

export function getWebsiteDomain(
  value:
    string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return null;
  }

  try {
    const normalized =
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      )
        ? value
        : `https://${value}`;

    return new URL(
      normalized
    )
      .hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );
  } catch {
    return null;
  }
}

function domainsMatch(
  first:
    string
    | null,
  second:
    string
    | null
) {
  if (
    !first ||
    !second
  ) {
    return false;
  }

  return (
    first ===
      second ||
    first.endsWith(
      `.${second}`
    ) ||
    second.endsWith(
      `.${first}`
    )
  );
}

export function isPlaceholderEmail(
  value:
    string
    | null
    | undefined
) {
  const email =
    normalizeEmail(
      value
    );

  if (
    !email
  ) {
    return false;
  }

  const [
    localPart,
    domain,
  ] =
    email.split(
      "@"
    );

  if (
    !localPart ||
    !domain
  ) {
    return false;
  }

  const compactLocal =
    localPart
      .replace(
        /[-_]+/g,
        "."
      )
      .replace(
        /\.+/g,
        "."
      );

  if (
    PLACEHOLDER_LOCAL_PARTS.has(
      compactLocal
    )
  ) {
    return true;
  }

  if (
    PLACEHOLDER_DOMAINS.has(
      domain
    )
  ) {
    return true;
  }

  if (
    /^(?:user|benutzer|example|beispiel|test|demo|muster)(?:[._+-]?\d+)?$/i.test(
      localPart
    )
  ) {
    return true;
  }

  return false;
}

function isSafeDiscoveredCandidate(
  value:
    string
    | null
    | undefined
) {
  return (
    isValidEmailSyntax(
      value
    ) &&
    !isPlaceholderEmail(
      value
    )
  );
}

/* =========================================================
   ASSESS
========================================================= */

export function assessEmailQuality({
  currentEmail,
  websiteUrl,
  discoveredEmail = null,
  discoveredEmailSourceUrl = null,
}: {
  currentEmail:
    string
    | null
    | undefined;

  websiteUrl:
    string
    | null
    | undefined;

  discoveredEmail?:
    string
    | null;

  discoveredEmailSourceUrl?:
    string
    | null;
}): EmailQualityAssessment {
  const email =
    normalizeEmail(
      currentEmail
    );

  const candidate =
    normalizeEmail(
      discoveredEmail
    );

  const candidateIsSafe =
    isSafeDiscoveredCandidate(
      candidate
    );

  const websiteDomain =
    getWebsiteDomain(
      websiteUrl
    );

  const emailDomain =
    getEmailDomain(
      email
    );

  const candidateDomain =
    getEmailDomain(
      candidate
    );

  const candidateMatchesWebsite =
    domainsMatch(
      candidateDomain,
      websiteDomain
    );

  const replacementEmail =
    candidateIsSafe
      ? candidate
      : null;

  if (
    !email
  ) {
    return {
      email:
        null,

      status:
        "MISSING",

      level:
        "blocked",

      blocksSending:
        true,

      detail:
        replacementEmail
          ? `Keine Empfängeradresse gespeichert. Auf der Website wurde ${replacementEmail} gefunden.`
          : "Keine Empfängeradresse gespeichert.",

      websiteDomain,

      emailDomain:
        null,

      candidateEmail:
        replacementEmail,

      candidateSourceUrl:
        replacementEmail
          ? discoveredEmailSourceUrl
          : null,

      shouldAutoReplace:
        Boolean(
          replacementEmail
        ),

      replacementEmail,
    };
  }

  if (
    !isValidEmailSyntax(
      email
    )
  ) {
    return {
      email,

      status:
        "INVALID",

      level:
        "blocked",

      blocksSending:
        true,

      detail:
        replacementEmail
          ? `Die gespeicherte Adresse ist ungültig. Auf der Website wurde ${replacementEmail} gefunden.`
          : "Die gespeicherte E-Mail-Adresse ist syntaktisch ungültig.",

      websiteDomain,

      emailDomain,

      candidateEmail:
        replacementEmail,

      candidateSourceUrl:
        replacementEmail
          ? discoveredEmailSourceUrl
          : null,

      shouldAutoReplace:
        Boolean(
          replacementEmail
        ),

      replacementEmail,
    };
  }

  if (
    isPlaceholderEmail(
      email
    )
  ) {
    return {
      email,

      status:
        "PLACEHOLDER",

      level:
        "blocked",

      blocksSending:
        true,

      detail:
        replacementEmail
          ? `${email} wirkt wie eine Platzhalter-Adresse. Auf der Website wurde ${replacementEmail} gefunden.`
          : `${email} wirkt wie eine Platzhalter- oder Testadresse.`,

      websiteDomain,

      emailDomain,

      candidateEmail:
        replacementEmail,

      candidateSourceUrl:
        replacementEmail
          ? discoveredEmailSourceUrl
          : null,

      shouldAutoReplace:
        Boolean(
          replacementEmail
        ),

      replacementEmail,
    };
  }

  /*
   * Strongest signal:
   * this exact email was publicly found on the website.
   * It is considered verified even if a business happens
   * to publish a Gmail / Web.de address.
   */
  if (
    candidate &&
    candidate ===
      email
  ) {
    return {
      email,

      status:
        "VERIFIED_WEBSITE",

      level:
        "good",

      blocksSending:
        false,

      detail:
        `E-Mail wurde öffentlich auf der Firmenwebsite gefunden${discoveredEmailSourceUrl ? "." : "."}`,

      websiteDomain,

      emailDomain,

      candidateEmail:
        null,

      candidateSourceUrl:
        discoveredEmailSourceUrl,

      shouldAutoReplace:
        false,

      replacementEmail:
        null,
    };
  }

  /*
   * Website found another email. When the stored email also
   * belongs to another domain, surface a strong warning.
   * Do NOT silently replace a plausible personal address.
   */
  if (
    candidateIsSafe &&
    candidate !==
      email
  ) {
    const currentMatchesWebsite =
      domainsMatch(
        emailDomain,
        websiteDomain
      );

    if (
      candidateMatchesWebsite &&
      !currentMatchesWebsite
    ) {
      return {
        email,

        status:
          "DOMAIN_MISMATCH",

        level:
          "warning",

        blocksSending:
          false,

        detail:
          `${email} passt nicht zur Website-Domain. Auf der Website wurde ${candidate} gefunden.`,

        websiteDomain,

        emailDomain,

        candidateEmail:
          candidate,

        candidateSourceUrl:
          discoveredEmailSourceUrl,

        shouldAutoReplace:
          false,

        replacementEmail:
          null,
      };
    }

    return {
      email,

      status:
        "SUSPICIOUS",

      level:
        "warning",

      blocksSending:
        false,

      detail:
        `Auf der Website wurde zusätzlich ${candidate} gefunden. Bitte Empfänger vor Versand prüfen.`,

      websiteDomain,

      emailDomain,

      candidateEmail:
        candidate,

      candidateSourceUrl:
        discoveredEmailSourceUrl,

      shouldAutoReplace:
        false,

      replacementEmail:
        null,
    };
  }

  if (
    domainsMatch(
      emailDomain,
      websiteDomain
    )
  ) {
    return {
      email,

      status:
        "DOMAIN_MATCH",

      level:
        "good",

      blocksSending:
        false,

      detail:
        `E-Mail-Domain passt zur Firmenwebsite (${websiteDomain}).`,

      websiteDomain,

      emailDomain,

      candidateEmail:
        null,

      candidateSourceUrl:
        null,

      shouldAutoReplace:
        false,

      replacementEmail:
        null,
    };
  }

  const localPart =
    email.split(
      "@"
    )[0] ??
    "";

  if (
    websiteDomain &&
    emailDomain &&
    FREE_EMAIL_DOMAINS.has(
      emailDomain
    )
  ) {
    return {
      email,

      status:
        "SUSPICIOUS",

      level:
        "warning",

      blocksSending:
        false,

      detail:
        `Die Adresse nutzt ${emailDomain}, obwohl eine eigene Firmenwebsite (${websiteDomain}) existiert. Bitte kurz prüfen.`,

      websiteDomain,

      emailDomain,

      candidateEmail:
        null,

      candidateSourceUrl:
        null,

      shouldAutoReplace:
        false,

      replacementEmail:
        null,
    };
  }

  if (
    GENERIC_LOCAL_PARTS.has(
      localPart
    )
  ) {
    return {
      email,

      status:
        "GENERIC_VALID",

      level:
        "good",

      blocksSending:
        false,

      detail:
        "Plausible allgemeine Firmenadresse.",

      websiteDomain,

      emailDomain,

      candidateEmail:
        null,

      candidateSourceUrl:
        null,

      shouldAutoReplace:
        false,

      replacementEmail:
        null,
    };
  }

  return {
    email,

    status:
      "PERSONAL_VALID",

    level:
      websiteDomain &&
        emailDomain &&
        !domainsMatch(
          emailDomain,
          websiteDomain
        )
        ? "warning"
        : "good",

    blocksSending:
      false,

    detail:
      websiteDomain &&
      emailDomain &&
      !domainsMatch(
        emailDomain,
        websiteDomain
      )
        ? `Die Adresse ist formal gültig, ihre Domain weicht aber von ${websiteDomain} ab.`
        : "Formal gültige persönliche E-Mail-Adresse.",

    websiteDomain,

    emailDomain,

    candidateEmail:
      null,

    candidateSourceUrl:
      null,

    shouldAutoReplace:
      false,

    replacementEmail:
      null,
  };
}

/* =========================================================
   STORED STATUS
========================================================= */

export function storedEmailQualityBlocksSending(
  status:
    string
    | null
    | undefined
) {
  return (
    status ===
      "MISSING" ||
    status ===
      "INVALID" ||
    status ===
      "PLACEHOLDER"
  );
}

export function getEmailQualityLabel(
  status:
    string
    | null
    | undefined,
  language:
    "de"
    | "en"
) {
  const de =
    language ===
    "de";

  switch (
    status
  ) {
    case "VERIFIED_WEBSITE":
      return de
        ? "Auf Website verifiziert"
        : "Verified on website";

    case "DOMAIN_MATCH":
      return de
        ? "Domain passt"
        : "Domain matches";

    case "GENERIC_VALID":
      return de
        ? "Plausible Firmenadresse"
        : "Plausible company email";

    case "PERSONAL_VALID":
      return de
        ? "Plausible persönliche Adresse"
        : "Plausible personal email";

    case "DOMAIN_MISMATCH":
      return de
        ? "Domain stimmt nicht überein"
        : "Domain mismatch";

    case "SUSPICIOUS":
      return de
        ? "Bitte prüfen"
        : "Needs review";

    case "PLACEHOLDER":
      return de
        ? "Platzhalter erkannt"
        : "Placeholder detected";

    case "INVALID":
      return de
        ? "Ungültige Adresse"
        : "Invalid address";

    case "MISSING":
      return de
        ? "Keine E-Mail"
        : "No email";

    default:
      return de
        ? "Noch nicht geprüft"
        : "Not checked yet";
  }
}
