import { isLeadbaseCurrency, normalizeLeadbaseCurrency, type LeadbaseCurrency } from "@/lib/account-currency";

export type CurrencyAmount = {
  amount: number;
  currency: string | null | undefined;
};

type FxRateResponse = {
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
};

function safeCurrency(value: string | null | undefined, fallback: LeadbaseCurrency): LeadbaseCurrency {
  if (typeof value === "string" && isLeadbaseCurrency(value.trim().toUpperCase())) {
    return normalizeLeadbaseCurrency(value, fallback);
  }
  return fallback;
}

/**
 * Display-only FX conversion for account-level dashboard totals.
 * Project/proposal amounts are never mutated; their stored currency remains the
 * source of truth. Rates are cached for one hour because Leadbase does not need
 * trading-grade intraday FX for business overview cards.
 */
export async function getDisplayFxRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  const to = normalizeLeadbaseCurrency(toCurrency);
  const from = safeCurrency(fromCurrency, to);

  if (from === to) return 1;

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 60 * 60 },
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as FxRateResponse;
    const rate = typeof payload.rate === "number" ? payload.rate : Number(payload.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch (error) {
    console.warn("Could not load display FX rate:", { from, to, error });
    return null;
  }
}

export async function convertCurrencyAmounts(
  values: CurrencyAmount[],
  targetCurrency: string,
): Promise<{ total: number; complete: boolean }> {
  const target = normalizeLeadbaseCurrency(targetCurrency);
  const normalized = values.map((entry) => ({
    amount: Number.isFinite(entry.amount) ? entry.amount : 0,
    currency: safeCurrency(entry.currency, target),
  }));

  const sources = [...new Set(normalized.map((entry) => entry.currency))];
  const pairs = await Promise.all(
    sources.map(async (source) => [source, await getDisplayFxRate(source, target)] as const),
  );
  const rates = new Map(pairs);

  let complete = true;
  let total = 0;

  for (const entry of normalized) {
    const rate = rates.get(entry.currency);
    if (rate === null || rate === undefined) {
      complete = false;
      continue;
    }
    total += entry.amount * rate;
  }

  return { total, complete };
}
