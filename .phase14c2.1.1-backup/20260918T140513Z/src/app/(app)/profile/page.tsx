import { redirect } from "next/navigation";

import { WorkspacePageMotion } from "@/components/workspace-page-motion";
import { createClient } from "@/lib/supabase/server";
import type { AccountPlanSelection, LeadbaseProfileData, ProposalBrandingDefaults, ProposalTemplateId } from "./actions";
import { normalizeLeadbaseDesignDefaults } from "@/lib/design-defaults";
import { resolveAccountCurrency } from "@/lib/account-currency";
import { ProfilePrecisionClient } from "./profile-precision-client";
import { getPublicPlan, priceForTier } from "@/lib/public-plans";

function string(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const stored = (metadata.leadbase_profile ?? {}) as Partial<LeadbaseProfileData>;
  const accountEmail = user.email ?? "";

  const { data: gmailConnection } = await supabase
    .from("gmail_connections")
    .select("email_address")
    .eq("user_id", user.id)
    .maybeSingle();

  const accountName = string(stored.fullName, string(metadata.full_name, string(metadata.name)));
  const derivedReplyEmail = string(gmailConnection?.email_address, accountEmail);

  const accountCurrency = resolveAccountCurrency({
    storedCurrency: stored.currency,
    currencyMode: stored.currencyMode,
    location: string(stored.location),
  });

  const initialProfile: LeadbaseProfileData = {
    senderName: string(stored.senderName, accountName),
    outreachRole: string(stored.outreachRole),
    replyEmail: derivedReplyEmail,
    website: string(stored.website),
    signature: string(stored.signature),
    company: string(stored.company),
    focus: string(stored.focus),
    description: string(stored.description),
    fullName: accountName,
    phoneCountryCode: string(stored.phoneCountryCode),
    phone: string(stored.phone),
    location: string(stored.location),
    currency: accountCurrency.currency,
    currencyMode: accountCurrency.mode,
  };

  const initialDesignDefaults = normalizeLeadbaseDesignDefaults(
    metadata.leadbase_design_defaults,
  );

  const rawBranding = (metadata.leadbase_proposal_branding ?? {}) as Partial<ProposalBrandingDefaults>;
  const templateIds = new Set<ProposalTemplateId>(["signature", "minimal", "kontur", "kanzlei", "prisma", "atelier", "kompakt"]);
  const rawTemplateId = typeof rawBranding.templateId === "string" ? rawBranding.templateId : "signature";
  const initialBranding: ProposalBrandingDefaults = {
    accentColor: string(rawBranding.accentColor, "#002BBA"),
    logoUrl: typeof rawBranding.logoUrl === "string" ? rawBranding.logoUrl : null,
    logoPath: typeof rawBranding.logoPath === "string" ? rawBranding.logoPath : null,
    templateId: templateIds.has(rawTemplateId as ProposalTemplateId) ? rawTemplateId as ProposalTemplateId : "signature",
  };

  const rawPlanSelectionRecord = (metadata.leadbase_plan_selection ?? {}) as Record<string, unknown>;
  const rawPlanSelection = rawPlanSelectionRecord as Partial<AccountPlanSelection>;
  const rawPlanId = rawPlanSelection.planId ?? (typeof rawPlanSelectionRecord.id === "string" ? rawPlanSelectionRecord.id : undefined);

  const { data: billingAccount } = await supabase
    .from("ai_usage_accounts")
    .select("plan_id, plan_tier_index, billing_interval, subscription_status, monthly_credit_limit")
    .eq("user_id", user.id)
    .maybeSingle();

  const activePlan = getPublicPlan(billingAccount?.plan_id);
  const activeTierIndex = activePlan
    ? Math.max(0, Math.min(activePlan.tiers.length - 1, Math.round(Number(billingAccount?.plan_tier_index ?? 0))))
    : 0;
  const activeTier = activePlan?.tiers[activeTierIndex] ?? null;
  const activeBilling = billingAccount?.billing_interval === "yearly" ? "yearly" as const : "monthly" as const;
  const subscriptionActive = billingAccount?.subscription_status === "active" || billingAccount?.subscription_status === "trialing";

  const initialPlanSelection: AccountPlanSelection = activePlan && subscriptionActive
    ? {
        planId: activePlan.id,
        tierIndex: activeTierIndex,
        billing: activeBilling,
        checkoutStatus: "active",
        credits: activeTier?.credits ?? Number(billingAccount?.monthly_credit_limit ?? 0),
        priceEur: activeTier ? priceForTier(activeTier, activeBilling) : 0,
      }
    : {
        planId: rawPlanId === "starter" || rawPlanId === "pro" || rawPlanId === "scale" || rawPlanId === "free" ? rawPlanId : "free",
        tierIndex: Number.isFinite(Number(rawPlanSelection.tierIndex)) ? Math.max(0, Math.min(3, Math.round(Number(rawPlanSelection.tierIndex)))) : 0,
        billing: rawPlanSelection.billing === "yearly" ? "yearly" : "monthly",
        checkoutStatus: rawPlanSelection.checkoutStatus === "pending_checkout" ? "pending_checkout" : "free",
        credits: typeof rawPlanSelection.credits === "number" ? rawPlanSelection.credits : null,
        priceEur: typeof rawPlanSelection.priceEur === "number" ? rawPlanSelection.priceEur : 0,
      };

  return (
    <div className="leadbase-workspace-page leadbase-route-profile h-full min-h-0">
      <WorkspacePageMotion />
      <ProfilePrecisionClient
        initialProfile={initialProfile}
        accountEmail={accountEmail}
        initialAvatarUrl={typeof metadata.avatar_url === "string" ? metadata.avatar_url : null}
        initialBranding={initialBranding}
        initialDesignDefaults={initialDesignDefaults}
        gmailEmail={gmailConnection?.email_address ?? null}
        initialPlanSelection={initialPlanSelection}
      />
    </div>
  );
}
