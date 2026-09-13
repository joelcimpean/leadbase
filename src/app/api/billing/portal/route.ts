import { NextResponse } from "next/server";

import { createStripeBillingPortalSession, stripeBillingConfigured } from "@/lib/stripe-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeBillingConfigured()) return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_usage_accounts")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer exists for this account yet." }, { status: 400 });
    }

    const configured = process.env.LEADBASE_PUBLIC_APP_URL?.trim();
    const origin = configured ? configured.replace(/\/$/, "") : new URL(request.url).origin;
    const session = await createStripeBillingPortalSession({
      stripeCustomerId: data.stripe_customer_id,
      returnUrl: `${origin}/profile`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Could not create Stripe customer portal session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message.replace(/^STRIPE_ERROR:/, "") : "Billing portal could not be opened." },
      { status: 500 },
    );
  }
}
