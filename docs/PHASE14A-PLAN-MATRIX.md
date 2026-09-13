# Leadbase Phase 14A — Plan / Feature Matrix

Version: `phase14a-2026-09-13`

## Goal

Phase 14A creates one typed product-policy source of truth before Phase 14B starts enforcing every restriction server-side.

Main file:

- `src/lib/plan-entitlements.ts`

`src/lib/public-plans.ts` now re-exports the entitlement types/helpers so existing Phase 13 imports keep working.

**Important:** 14A does not yet wire every route to the full matrix. Existing Phase 13 AI gates are intentionally preserved. Phase 14B will apply `planAllowsFeature()` and `getPlanLimit()` to every relevant server action/API route.

No SQL migration is required for 14A.

---

## Models

| Plan | Provider models allowed | Design choice | Max reasoning |
|---|---|---|---|
| Free | GPT-5 mini, GPT-5.6 Luna | none normally; one Full Lead demo later gets a controlled Sol design | Low |
| Starter | Luna, Terra, Sol, GPT-5 mini | Luna / Terra / Sol | Medium |
| Pro | Luna, Terra, Sol, GPT-5 mini | Luna / Terra / Sol | High |
| Scale | Luna, Terra, Sol, Astra, GPT-5 mini | Luna / Terra / Sol / Astra | Max |

Starter keeps the Phase 13 rule that Sol is only allowed for the design-generation flow. Normal Starter text AI stays on Luna/Terra.

---

## Product limits

| Limit | Free | Starter | Pro | Scale |
|---|---:|---:|---:|---:|
| Leads / month | 25 | 250 | 1,500 | 5,000 |
| Emails / day | 20 | 100 | 300 | 500 |
| AI redesigns / month | 1 demo | 10 | 50 | 150 |
| AI Lead Search results / run | 10 | 25 | 50 | 60 |
| Bulk Analyze / run | 1 | 10 | 50 | 200 |
| Bulk Outreach / run | 1 | 10 | 50 | 200 |
| Bulk Design / run | 0 | 0 | 10 | 25 |
| Bulk GIF / run | 0 | 0 | 10 | 25 |
| PageSpeed | trial | mobile | mobile | mobile + desktop |

Bulk limits are per account/run, not global concurrency limits. They are meant to stop one account from flooding provider capacity while many different users can still work at the same time.

Leadbase does **not** expose a visible global queue and Phase 14A deliberately does not sell a “priority queue” feature.

---

## Free Full Lead Workflow policy

The matrix reserves the following policy for Phase 14C:

- User must explicitly select one of their own leads.
- Confirmation modal before spending anything.
- One-time Free activation bundle.
- Fixed visible price: **50 Credits**.
- Controlled standard design model: **GPT-5.6 Sol**.
- Expected flow: Analyze → Outreach → Call Prep → Proposal Autofill → Standard Design.
- This special demo is the only reason a Free account may use Sol; normal Free model access remains Luna / GPT-5 mini.
- Paid plans run the same workflow using normal measured Credit charging rather than a fixed bundle.

14A defines this policy only. It does not create the button/workflow yet.

---

## AI / API feature inventory

| Feature | Provider(s) | Billing / protection | Typical customer-facing estimate |
|---|---|---|---:|
| AI Lead Search | OpenAI + Google Places | Credits + result cap | ~1–2 Credits |
| Analyze website | OpenAI + browser render | Credits | ~1–3 |
| Evidence Audit | PageSpeed + browser render | quota/cache, no separate Credit label | included in analysis UX |
| Visual analysis | OpenAI + screenshots | part of Analyze | ~1–3 |
| Generate outreach | OpenAI | Credits | ~1–3 |
| Generate follow-up | OpenAI when AI is used | Credits | ~1–3 |
| Generate inbox reply | OpenAI | Credits | ~1–3 |
| Reply intelligence / OOO / intent | OpenAI | background; protect with email/rate limits | hidden |
| Call Prep | OpenAI | Credits | ~1–4 |
| Proposal AI Autofill | OpenAI | Credits | ~2–6 |
| Competitor Research | OpenAI + Google Places + website analysis | Credits + plan gate | ~5–20 |
| Design Research | OpenAI + MaxiBestOf | normally part of design run | ~3–12 internal |
| AI Website Design | OpenAI + browser/stock assets | Credits + design quota | ~15–50 standard |
| Enhance Motion | OpenAI | Credits + plan gate | ~5–20 |
| Preview GIF | browser/render resources | plan quota, not Credits | — |
| Pexels search | Pexels | API quota/cache | — |
| Gmail send/sync/schedule | Gmail API | plan daily limit / provider quota | — |
| Bulk Analyze | same providers as Analyze | Credits per lead + batch-size cap | per lead |
| Bulk Outreach | OpenAI | Credits per lead + batch-size cap | per lead |
| Bulk Design | OpenAI/render/research | Credits per lead + batch-size cap | per design |
| Full Lead Workflow | multiple | Free fixed 50 demo; paid normal usage | ~20–60 typical |

Credit ranges are UX estimates only. The existing `ai-usage.ts` ledger remains authoritative and charges by measured provider usage.

---

## Current backend AI metering found in the code snapshot

Already going through `assertAiUsageAvailable()` / `recordAiUsage()`:

- Lead visual / website analysis
- Outreach generation
- AI Lead Search
- Inbox reply generation
- Call Prep
- Proposal Autofill
- Redesign / Design generation
- Design research inside the redesign flow
- Enhance Motion

Direct OpenAI helper modules also exist for:

- reply intelligence
- visual analysis localization
- visual website analysis
- MaxiBestOf research
- outreach generation
- redesign generation

Some are nested under an already-metered parent request. Phase 14B should verify there is no independently reachable provider call that can bypass the central entitlement/credit guard.

---

## Plan positioning

### Free
Use the product, spend the 50 signup Credits on basic Luna-powered AI or save all 50 for the one-time Full Lead Workflow. No standalone AI design, motion, competitor research, GIF or bulk design.

### Starter
Core Leadbase + Luna/Terra AI + standard Sol design, up to 10 redesigns/month, limited Analyze/Outreach bulk actions. No competitor research, motion, GIF or bulk design.

### Pro
Adds Sol High, competitor research, Enhance Motion, GIF and bulk design. No Astra.

### Scale
Adds GPT-6 Astra, highest lead/email/design/bulk limits and mobile + desktop PageSpeed coverage.

Buying extra Credits never unlocks a higher plan feature/model.

---

## Phase 14B checklist

1. Wire `planAllowsFeature()` into all protected server routes/actions.
2. Wire `getPlanLimit()` into Lead creation/search, email sending and bulk endpoints.
3. Make UI locks use the same matrix instead of separate hard-coded conditions.
4. Return structured `PLAN_REQUIRED`, `MODEL_REQUIRED` and `LIMIT_REACHED` errors.
5. Verify direct provider call sites cannot bypass the central guard.
6. Keep different users parallel; batch limits are per user/run, not a global queue.
7. Keep Credits and entitlements separate: enough Credits never bypasses plan access.

