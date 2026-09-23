import { NextResponse } from "next/server";

import { normalizeBillingCurrency } from "@/lib/account-currency";
import {
  LEADBASE_CREDIT_TOPUPS,
  customCreditPrice,
  customCreditPriceEur,
  getPublicPlan,
  normalizeCustomCredits,
  normalizeTierIndex,
  priceForTopup,
  stripePlanLookupKey,
  stripeTopupLookupKey,
} from "@/lib/public-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createStripeCheckoutSession,
  findStripePriceByLookupKey,
  stripeBillingConfigured,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";

function safeOrigin(request: Request) {
  const configured = process.env.LEADBASE_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeBillingConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = body.kind === "credits" ? "credits" : "subscription";
    const billingCurrency = normalizeBillingCurrency(body.billingCurrency);
    const admin = createAdminClient();
    const { data: account } = await admin
      .from("ai_usage_accounts")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const origin = safeOrigin(request);
    let lookupKey: string | null = null;
    let customPrice: { currency: string; unitAmount: number; productName: string; productMetadata?: Record<string, string> } | null = null;
    let mode: "subscription" | "payment";
    let metadata: Record<string, string>;

    if (kind === "subscription") {
      const plan = getPublicPlan(body.planId);
      if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
      const tierIndex = normalizeTierIndex(plan, body.tierIndex);
      const tier = plan.tiers[tierIndex];
      const billing = body.billing === "yearly" ? "yearly" : "monthly";
      if (!tier) return NextResponse.json({ error: "Invalid plan tier." }, { status: 400 });

      lookupKey = stripePlanLookupKey(plan.id, tier.credits, billing);
      mode = "subscription";
      metadata = {
        leadbase_kind: "subscription",
        user_id: user.id,
        plan_id: plan.id,
        tier_index: String(tierIndex),
        credits: String(tier.credits),
        billing_interval: billing,
        billing_currency: billingCurrency,
      };
    } else {
      const preset = LEADBASE_CREDIT_TOPUPS.find((item) => item.id === body.presetId);
      mode = "payment";

      if (preset) {
        lookupKey = stripeTopupLookupKey(preset.credits);
        metadata = {
          leadbase_kind: "credit_topup",
          user_id: user.id,
          topup_id: preset.id,
          credits: String(preset.credits),
          billing_currency: billingCurrency,
          price_amount: String(priceForTopup(preset, billingCurrency)),
          price_eur: String(preset.priceEur),
        };
      } else if (body.presetId === "custom") {
        const credits = normalizeCustomCredits(body.credits);
        const priceEur = customCreditPriceEur(credits);
        const selectedPrice = customCreditPrice(credits, billingCurrency);
        if (credits === null || priceEur === null || selectedPrice === null) {
          return NextResponse.json({ error: "Custom credits must be between 500 and 50,000 in steps of 100." }, { status: 400 });
        }
        metadata = {
          leadbase_kind: "credit_topup",
          user_id: user.id,
          topup_id: "custom",
          credits: String(credits),
          billing_currency: billingCurrency,
          price_amount: String(selectedPrice),
          price_eur: String(priceEur),
        };
        customPrice = {
          currency: billingCurrency.toLowerCase(),
          unitAmount: selectedPrice * 100,
          productName: `${credits.toLocaleString("en-US")} Credits`,
          productMetadata: {
            leadbase_type: "credit_topup",
            topup_id: "custom",
            credits: String(credits),
          },
        };
      } else {
        return NextResponse.json({ error: "Unknown credit package." }, { status: 400 });
      }
    }

    const price = lookupKey ? await findStripePriceByLookupKey(lookupKey) : null;
    const session = await createStripeCheckoutSession({
      priceId: price?.id ?? null,
      customPrice,
      mode,
      successUrl: `${origin}/profile?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/profile?billing=cancelled`,
      userId: user.id,
      email: user.email,
      stripeCustomerId: typeof account?.stripe_customer_id === "string" ? account.stripe_customer_id : null,
      metadata,
      currency: billingCurrency,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Could not create Leadbase Stripe checkout:", error);
    const message = error instanceof Error ? error.message : "Checkout could not be created.";
    return NextResponse.json({ error: message.replace(/^STRIPE_ERROR:/, "") }, { status: 500 });
  }
}
