# Leadbase Phase 13 — Billing, Credits & Cost Protection

## What this patch changes

- Customer-facing billing unit is **Credits**.
- Raw OpenAI tokens are diagnostic only and are no longer the customer billing unit.
- Provider cost is converted server-side at **250 Credits per USD of raw AI provider cost**.
- Cached input is priced separately.
- More expensive models consume more Credits automatically.
- Starter / Pro / Scale model and feature entitlements are enforced server-side.
- GPT-6 Astra is Scale-only.
- Free accounts receive **50 one-time Credits**, not an unlimited development balance.
- Monthly plan Credits and purchased Credits are separate wallets.
- Purchased Credits do not expire and are used after monthly plan Credits.
- AI calls reserve Credits before the provider request to stop concurrent overspending.
- Failed/stale reservations are returned automatically.
- Per-user and global provider-cost safety caps fail closed.
- Stripe hosted Checkout, Customer Portal route and signed webhook processing are included.
- Stripe top-ups are granted only after a verified paid webhook.
- Stripe webhook events are idempotent.
- Sidebar/profile usage displays Credits instead of raw token limits.

## Database migration

Run this once in the Supabase SQL Editor **before testing billing or AI usage**:

`sql/22-phase13-billing-credits-cost-protection.sql`

The migration is additive/idempotent and keeps the old token columns only for rollback compatibility.

## Required environment variables

Copy the relevant values from `.env.phase13.example` into `.env.local` and later Vercel.

For sandbox testing:

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `LEADBASE_PUBLIC_APP_URL=http://localhost:3000`

Recommended launch safety caps:

- `LEADBASE_AI_USER_DAILY_COST_CAP_USD=5`
- `LEADBASE_AI_GLOBAL_DAILY_COST_CAP_USD=25`
- `LEADBASE_AI_GLOBAL_MONTHLY_COST_CAP_USD=250`

## Stripe webhook

Endpoint:

`https://YOUR-DOMAIN/api/billing/webhook`

For local testing use Stripe CLI forwarding or another HTTPS tunnel and use its `whsec_...` signing secret.

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Stripe price lookup keys

The code does not hard-code Stripe Price IDs. It looks up the exact lookup keys already created in the Leadbase sandbox. Re-create the same lookup keys later in Live mode.

Subscription keys follow:

`leadbase_<starter|pro|scale>_<credits>_<monthly|yearly>`

Top-ups:

- `leadbase_topup_500`
- `leadbase_topup_1500`
- `leadbase_topup_4000`

## Important launch note

This patch does **not** activate the Stripe account, configure tax/legal business onboarding, or switch to live keys. Keep sandbox mode until checkout, webhook, plan changes, cancellation and top-ups have all been tested end-to-end.
