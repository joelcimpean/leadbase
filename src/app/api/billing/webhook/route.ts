import { NextResponse } from "next/server";

import { getPublicPlan, normalizeTierIndex, type LeadbaseBillingInterval } from "@/lib/public-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseStripeWebhookEvent,
  unixSecondsToIso,
  verifyStripeWebhookSignature,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";

function idOf(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as any).id === "string") return (value as any).id as string;
  return null;
}

function lookupPlanFromKey(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^leadbase_(starter|pro|scale)_(\d+)_(monthly|yearly)$/);
  if (!match) return null;
  const plan = getPublicPlan(match[1]);
  if (!plan) return null;
  const credits = Number(match[2]);
  const tierIndex = plan.tiers.findIndex((tier) => tier.credits === credits);
  if (tierIndex < 0) return null;
  return {
    planId: plan.id,
    tierIndex,
    credits,
    billing: match[3] as LeadbaseBillingInterval,
  };
}

function subscriptionSelection(object: Record<string, any>) {
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const metadataPlan = getPublicPlan(metadata.plan_id);
  if (metadataPlan) {
    const tierIndex = normalizeTierIndex(metadataPlan, metadata.tier_index);
    const tier = metadataPlan.tiers[tierIndex];
    if (tier) {
      return {
        userId: metadata.user_id || null,
        planId: metadataPlan.id,
        tierIndex,
        credits: tier.credits,
        billing: metadata.billing_interval === "yearly" ? "yearly" as const : "monthly" as const,
      };
    }
  }

  const price = object.items?.data?.[0]?.price;
  const fromLookup = lookupPlanFromKey(price?.lookup_key);
  return fromLookup ? { userId: metadata.user_id || null, ...fromLookup } : null;
}

async function resolveUserId(object: Record<string, any>) {
  const direct = object.metadata?.user_id;
  if (typeof direct === "string" && direct) return direct;

  const admin = createAdminClient();
  const subscriptionId =
    idOf(object.subscription) ??
    idOf(object.parent?.subscription_details?.subscription) ??
    idOf(object.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) ??
    (object.object === "subscription" ? idOf(object) : null);
  const customerId = idOf(object.customer);

  if (subscriptionId) {
    const { data } = await admin
      .from("ai_usage_accounts")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  if (customerId) {
    const { data } = await admin
      .from("ai_usage_accounts")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  return null;
}

async function applySubscription(input: {
  userId: string;
  planId: "starter" | "pro" | "scale";
  tierIndex: number;
  credits: number;
  billing: LeadbaseBillingInterval;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  forceWalletRefresh?: boolean;
}) {
  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from("ai_usage_accounts")
    .select("plan_id, plan_tier_index, monthly_credit_limit, stripe_subscription_id, credit_period_started_at, credit_period_resets_at")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);

  const changedPlan =
    input.forceWalletRefresh ||
    existing?.plan_id !== input.planId ||
    Number(existing?.plan_tier_index ?? -1) !== input.tierIndex ||
    Number(existing?.monthly_credit_limit ?? -1) !== input.credits ||
    existing?.stripe_subscription_id !== input.stripeSubscriptionId;

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const patch: Record<string, unknown> = {
    plan_id: input.planId,
    plan_tier_index: input.tierIndex,
    billing_interval: input.billing,
    subscription_status: input.status,
    monthly_credit_limit: input.credits,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId,
    subscription_current_period_end: input.currentPeriodEnd,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    monthly_token_limit: 0,
    purchased_token_balance: 0,
    updated_at: now.toISOString(),
  };

  if (changedPlan) {
    patch.plan_credit_balance = input.status === "active" || input.status === "trialing" ? input.credits : 0;
    patch.credit_period_started_at = now.toISOString();
    patch.credit_period_resets_at = nextMonth.toISOString();
  }

  const { error } = await admin
    .from("ai_usage_accounts")
    .upsert({ user_id: input.userId, ...patch }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function applyCheckoutCompleted(object: Record<string, any>, eventId: string) {
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const userId = metadata.user_id || object.client_reference_id;
  if (!userId) throw new Error("Checkout session has no Leadbase user id.");

  const customerId = idOf(object.customer);
  const subscriptionId = idOf(object.subscription);
  const admin = createAdminClient();

  if (metadata.leadbase_kind === "credit_topup") {
    if (object.payment_status !== "paid") return;
    const credits = Number(metadata.credits);
    if (!Number.isFinite(credits) || credits <= 0) throw new Error("Invalid credit top-up metadata.");

    if (customerId) {
      const { error } = await admin
        .from("ai_usage_accounts")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }

    const { error } = await admin.rpc("leadbase_grant_credits", {
      p_user_id: userId,
      p_credits: Math.round(credits),
      p_idempotency_key: `stripe:${eventId}`,
      p_source: "stripe_topup",
      p_metadata: {
        stripeEventId: eventId,
        stripeCheckoutSessionId: object.id,
        topupId: metadata.topup_id ?? null,
      },
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (metadata.leadbase_kind === "subscription") {
    // Do not unlock a paid plan from checkout.session.completed until Stripe
    // confirms payment. Async methods are activated by async_payment_succeeded.
    if (object.payment_status !== "paid" && object.payment_status !== "no_payment_required") return;

    const plan = getPublicPlan(metadata.plan_id);
    if (!plan) throw new Error("Unknown plan in Stripe checkout metadata.");
    const tierIndex = normalizeTierIndex(plan, metadata.tier_index);
    const tier = plan.tiers[tierIndex];
    if (!tier) throw new Error("Invalid plan tier in Stripe checkout metadata.");

    await applySubscription({
      userId,
      planId: plan.id,
      tierIndex,
      credits: tier.credits,
      billing: metadata.billing_interval === "yearly" ? "yearly" : "monthly",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      forceWalletRefresh: true,
    });
  }
}

async function applySubscriptionEvent(object: Record<string, any>, deleted = false) {
  const userId = await resolveUserId(object);
  if (!userId) throw new Error("Could not map Stripe subscription to a Leadbase user.");
  const admin = createAdminClient();

  if (deleted) {
    const { error } = await admin
      .from("ai_usage_accounts")
      .update({
        plan_id: "free",
        plan_tier_index: 0,
        subscription_status: "canceled",
        monthly_credit_limit: 0,
        plan_credit_balance: 0,
        stripe_subscription_id: idOf(object),
        stripe_customer_id: idOf(object.customer),
        subscription_current_period_end: unixSecondsToIso(object.current_period_end),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const selection = subscriptionSelection(object);
  if (!selection) throw new Error("Could not resolve Leadbase plan from Stripe subscription.");

  await applySubscription({
    userId,
    planId: selection.planId,
    tierIndex: selection.tierIndex,
    credits: selection.credits,
    billing: selection.billing,
    stripeCustomerId: idOf(object.customer),
    stripeSubscriptionId: idOf(object),
    status: String(object.status ?? "active"),
    cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
    currentPeriodEnd: unixSecondsToIso(object.current_period_end),
  });
}

async function applyInvoiceState(object: Record<string, any>, paid: boolean) {
  const userId = await resolveUserId(object);
  if (!userId) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_usage_accounts")
    .update({
      subscription_status: paid ? "active" : "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    verifyStripeWebhookSignature(rawBody, request.headers.get("stripe-signature"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 },
    );
  }

  let event;
  try {
    event = parseStripeWebhookEvent(rawBody);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe event." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("stripe_webhook_events")
    .select("status")
    .eq("event_id", event.id)
    .maybeSingle();
  if (previous?.status === "processed") return NextResponse.json({ received: true, duplicate: true });

  const { error: startError } = await admin
    .from("stripe_webhook_events")
    .upsert({
      event_id: event.id,
      event_type: event.type,
      status: "processing",
      error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "event_id" });
  if (startError) {
    console.error("Could not record Stripe webhook event:", startError);
    return NextResponse.json({ error: "Webhook ledger unavailable." }, { status: 500 });
  }

  try {
    const object = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await applyCheckoutCompleted(object, event.id);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await applySubscriptionEvent(object, false);
        break;
      case "customer.subscription.deleted":
        await applySubscriptionEvent(object, true);
        break;
      case "invoice.paid":
        await applyInvoiceState(object, true);
        break;
      case "invoice.payment_failed":
        await applyInvoiceState(object, false);
        break;
      default:
        break;
    }

    await admin
      .from("stripe_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} (${event.type}) failed:`, error);
    const message = error instanceof Error ? error.message : "Unknown webhook processing error.";
    await admin
      .from("stripe_webhook_events")
      .update({ status: "failed", error: message.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
