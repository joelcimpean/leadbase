export const LEADBASE_CURRENCIES = [
  "USD", "EUR", "GBP", "CHF", "CAD", "AUD", "NZD", "JPY", "CNY", "HKD", "SGD",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "TRY", "AED", "SAR",
  "ILS", "INR", "KRW", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "ZAR", "NGN",
] as const;

export type LeadbaseCurrency = (typeof LEADBASE_CURRENCIES)[number];
export type LeadbaseCurrencyMode = "auto" | "manual";

// Stripe billing is intentionally USD-only. Workspace/client currencies remain independent.
export const LEADBASE_BILLING_CURRENCIES = ["USD"] as const;
// Keep EUR in the compatibility type while old metadata/records are phased out.
// All new normalization and checkout paths resolve to USD.
export type LeadbaseBillingCurrency = "USD" | "EUR";

export const DEFAULT_CURRENCY: LeadbaseCurrency = "USD";

const COUNTRY_CURRENCY_MATCHERS: Array<{ currency: LeadbaseCurrency; terms: string[] }> = [
  { currency: "USD", terms: ["united states", "usa", "u.s.a", ", us", "america"] },
  { currency: "EUR", terms: [
    "germany", "deutschland", "austria", "österreich", "oesterreich", "france", "frankreich",
    "spain", "españa", "espana", "italy", "italia", "portugal", "netherlands", "nederland",
    "belgium", "belgique", "belgië", "luxembourg", "ireland", "finland", "suomi", "greece",
    "hellas", "cyprus", "malta", "slovakia", "slovensko", "slovenia", "croatia", "hrvatska",
    "estonia", "latvia", "lithuania", ", de", ", at", ", fr", ", es", ", it", ", pt", ", nl",
    ", be", ", lu", ", ie", ", fi", ", gr", ", cy", ", mt", ", sk", ", si", ", hr", ", ee", ", lv", ", lt",
  ] },
  { currency: "GBP", terms: ["united kingdom", "england", "scotland", "wales", "northern ireland", ", gb", ", uk"] },
  { currency: "CHF", terms: ["switzerland", "schweiz", "suisse", "svizzera", ", ch"] },
  { currency: "CAD", terms: ["canada", ", ca"] },
  { currency: "AUD", terms: ["australia", ", au"] },
  { currency: "NZD", terms: ["new zealand", ", nz"] },
  { currency: "JPY", terms: ["japan", "日本", ", jp"] },
  { currency: "CNY", terms: ["china", "中国", ", cn"] },
  { currency: "HKD", terms: ["hong kong", ", hk"] },
  { currency: "SGD", terms: ["singapore", ", sg"] },
  { currency: "SEK", terms: ["sweden", "sverige", ", se"] },
  { currency: "NOK", terms: ["norway", "norge", ", no"] },
  { currency: "DKK", terms: ["denmark", "danmark", ", dk"] },
  { currency: "PLN", terms: ["poland", "polska", ", pl"] },
  { currency: "CZK", terms: ["czechia", "czech republic", "česko", ", cz"] },
  { currency: "HUF", terms: ["hungary", "magyarország", ", hu"] },
  { currency: "RON", terms: ["romania", "românia", ", ro"] },
  { currency: "BGN", terms: ["bulgaria", "българия", ", bg"] },
  { currency: "TRY", terms: ["turkey", "türkiye", ", tr"] },
  { currency: "AED", terms: ["united arab emirates", "uae", "dubai", "abu dhabi", ", ae"] },
  { currency: "SAR", terms: ["saudi arabia", ", sa"] },
  { currency: "ILS", terms: ["israel", ", il"] },
  { currency: "INR", terms: ["india", "भारत", ", in"] },
  { currency: "KRW", terms: ["south korea", "korea", "대한민국", ", kr"] },
  { currency: "BRL", terms: ["brazil", "brasil", ", br"] },
  { currency: "MXN", terms: ["mexico", "méxico", ", mx"] },
  { currency: "ARS", terms: ["argentina", ", ar"] },
  { currency: "CLP", terms: ["chile", ", cl"] },
  { currency: "COP", terms: ["colombia", ", co"] },
  { currency: "PEN", terms: ["peru", "perú", ", pe"] },
  { currency: "ZAR", terms: ["south africa", ", za"] },
  { currency: "NGN", terms: ["nigeria", ", ng"] },
];

const LOCALE_REGION_CURRENCY: Record<string, LeadbaseCurrency> = {
  US: "USD", DE: "EUR", AT: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", HR: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR",
  GB: "GBP", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", CN: "CNY", HK: "HKD", SG: "SGD",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", TR: "TRY",
  AE: "AED", SA: "SAR", IL: "ILS", IN: "INR", KR: "KRW", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP",
  CO: "COP", PE: "PEN", ZA: "ZAR", NG: "NGN",
};

export function isLeadbaseCurrency(value: unknown): value is LeadbaseCurrency {
  return typeof value === "string" && (LEADBASE_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function normalizeLeadbaseCurrency(value: unknown, fallback: LeadbaseCurrency = DEFAULT_CURRENCY): LeadbaseCurrency {
  if (typeof value !== "string") return fallback;
  const upper = value.trim().toUpperCase();
  return isLeadbaseCurrency(upper) ? upper : fallback;
}

export function normalizeBillingCurrency(
  _value: unknown,
  _fallback: LeadbaseBillingCurrency = "USD",
): LeadbaseBillingCurrency {
  return "USD";
}

export function formatBillingMoney(value: number, _currency: LeadbaseBillingCurrency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function inferCurrencyFromLocation(location: string | null | undefined): LeadbaseCurrency | null {
  const normalized = (location ?? "").trim().toLocaleLowerCase("en-US");
  if (!normalized) return null;
  for (const entry of COUNTRY_CURRENCY_MATCHERS) {
    if (entry.terms.some((term) => normalized.includes(term))) return entry.currency;
  }
  return null;
}

export function inferCurrencyFromLocale(locale: string | null | undefined): LeadbaseCurrency | null {
  if (!locale) return null;
  const normalized = locale.replace("_", "-");
  const region = normalized.split("-")[1]?.toUpperCase();
  return region ? LOCALE_REGION_CURRENCY[region] ?? null : null;
}

export function resolveAccountCurrency(input: {
  storedCurrency?: unknown;
  currencyMode?: unknown;
  location?: string | null;
  locale?: string | null;
  fallback?: LeadbaseCurrency;
}) {
  const fallback = input.fallback ?? DEFAULT_CURRENCY;
  const currency = isLeadbaseCurrency(input.storedCurrency)
    ? normalizeLeadbaseCurrency(input.storedCurrency, fallback)
    : fallback;

  // Currency is an explicit workspace preference. Physical location must never
  // silently change the currency used for clients, projects or proposals.
  return { currency, mode: "manual" as const };
}

export function localeForCurrency(currency: string, language: "de" | "en" = "en") {
  const normalized = normalizeLeadbaseCurrency(currency);
  const map: Partial<Record<LeadbaseCurrency, string>> = {
    USD: "en-US", EUR: "de-DE", GBP: "en-GB", CHF: language === "de" ? "de-CH" : "en-CH",
    CAD: "en-CA", AUD: "en-AU", NZD: "en-NZ", JPY: "ja-JP", CNY: "zh-CN", HKD: "en-HK", SGD: "en-SG",
    SEK: "sv-SE", NOK: "nb-NO", DKK: "da-DK", PLN: "pl-PL", CZK: "cs-CZ", HUF: "hu-HU", RON: "ro-RO",
    BGN: "bg-BG", TRY: "tr-TR", AED: "en-AE", SAR: "en-SA", ILS: "he-IL", INR: "en-IN", KRW: "ko-KR",
    BRL: "pt-BR", MXN: "es-MX", ARS: "es-AR", CLP: "es-CL", COP: "es-CO", PEN: "es-PE", ZAR: "en-ZA", NGN: "en-NG",
  };
  return map[normalized] ?? (language === "de" ? "de-DE" : "en-US");
}

export function formatAccountMoney(value: number, currency: string, language: "de" | "en" = "en") {
  const normalized = normalizeLeadbaseCurrency(currency);
  try {
    return new Intl.NumberFormat(localeForCurrency(normalized, language), {
      style: "currency",
      currency: normalized,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${Number.isFinite(value) ? value : 0} ${normalized}`;
  }
}
