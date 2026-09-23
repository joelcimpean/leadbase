import "server-only";

import crypto from "node:crypto";

export type StripePriceRecord = {
  id: string;
  active: boolean;
  lookup_key?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  recurring?: { interval?: string | null } | null;
  metadata?: Record<string, string> | null;
};

export type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  customer?: string | null;
  subscription?: string | null;
  payment_status?: string | null;
  mode?: string | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, any> };
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing.");
  return key;
}

export function stripeBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

function appendFormValue(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    params.append(key, value ? "true" : "false");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(params, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      appendFormValue(params, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  params.append(key, String(value));
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  input?: Record<string, unknown>,
): Promise<T> {
  const key = stripeSecretKey();
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(input ?? {})) appendFormValue(params, name, value);

  const url = method === "GET" && params.size
    ? `${STRIPE_API_BASE}${path}?${params.toString()}`
    : `${STRIPE_API_BASE}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? params.toString() : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Stripe returned HTTP ${response.status}.`;
    throw new Error(`STRIPE_ERROR:${message}`);
  }

  return payload as T;
}

export async function findStripePriceByLookupKey(lookupKey: string) {
  const payload = await stripeRequest<{ data?: StripePriceRecord[] }>("GET", "/prices", {
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = payload.data?.[0] ?? null;
  if (!price?.id) throw new Error(`STRIPE_PRICE_NOT_FOUND:${lookupKey}`);
  return price;
}

export async function createStripeCheckoutSession(input: {
  priceId?: string | null;
  customPrice?: {
    currency: string;
    unitAmount: number;
    productName: string;
    productMetadata?: Record<string, string>;
  } | null;
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  userId: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  metadata: Record<string, string>;
  currency?: string | null;
}) {
  if (!input.priceId && !input.customPrice) {
    throw new Error("STRIPE_ERROR:Checkout requires a price.");
  }
  if (input.priceId && input.customPrice) {
    throw new Error("STRIPE_ERROR:Checkout received conflicting prices.");
  }

  const lineItem = input.priceId
    ? { price: input.priceId, quantity: 1 }
    : {
        price_data: {
          currency: input.customPrice!.currency,
          unit_amount: input.customPrice!.unitAmount,
          product_data: {
            name: input.customPrice!.productName,
            metadata: input.customPrice!.productMetadata ?? {},
          },
        },
        quantity: 1,
      };

  const body: Record<string, unknown> = {
    mode: input.mode,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    line_items: [lineItem],
    metadata: input.metadata,
  };

  if (input.currency) body.currency = input.currency.toLowerCase();

  if (input.stripeCustomerId) body.customer = input.stripeCustomerId;
  else if (input.email) body.customer_email = input.email;

  if (input.mode === "subscription") {
    body.subscription_data = { metadata: input.metadata };
  } else if (!input.stripeCustomerId) {
    body.customer_creation = "always";
  }

  return stripeRequest<StripeCheckoutSession>("POST", "/checkout/sessions", body);
}

export async function createStripeBillingPortalSession(input: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  return stripeRequest<{ id: string; url: string }>("POST", "/billing_portal/sessions", {
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  const timestamp = Number(timestampPart?.slice(2));
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header.");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > 300) throw new Error("Stripe webhook signature is too old.");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((candidate) => {
    try {
      const candidateBuffer = Buffer.from(candidate, "hex");
      return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });

  if (!valid) throw new Error("Invalid Stripe webhook signature.");
}

export function parseStripeWebhookEvent(rawBody: string) {
  const parsed = JSON.parse(rawBody) as StripeWebhookEvent;
  if (!parsed?.id || !parsed?.type || !parsed?.data?.object) {
    throw new Error("Invalid Stripe event payload.");
  }
  return parsed;
}

export function unixSecondsToIso(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? new Date(number * 1000).toISOString() : null;
}
