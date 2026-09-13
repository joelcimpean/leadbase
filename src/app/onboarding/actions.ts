"use server";

import { revalidatePath } from "next/cache";

import {
  getPublicPlan,
  normalizeTierIndex,
  type LeadbaseBillingInterval,
  type LeadbasePublicPlanId,
} from "@/lib/public-plans";
import {
  normalizeLeadbaseDesignDefaults,
  type LeadbaseDesignDefaults,
} from "@/lib/design-defaults";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inferCurrencyFromLocation,
  normalizeLeadbaseCurrency,
  type LeadbaseCurrencyMode,
} from "@/lib/account-currency";
import { createClient } from "@/lib/supabase/server";
import {
  assertPlanAiSelectionAvailable,
  assertPlanFeatureAvailable,
  isPlanAccessError,
  planAccessMessage,
} from "@/lib/plan-access";

export type OnboardingPlanSelection = {
  planId: LeadbasePublicPlanId | "free";
  tierIndex: number;
  billing: LeadbaseBillingInterval;
};

export type OnboardingProfileInput = {
  fullName: string;
  location: string;
  phoneCountryCode?: string;
  phone?: string;
  website?: string;
  outreachRole?: string;
  company?: string;
  focus?: string;
  signature?: string;
  description?: string;
  currency?: string;
  currencyMode?: LeadbaseCurrencyMode;
};

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; field?: "fullName" | "location" };

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Nicht angemeldet.");
  return { supabase, user };
}

export async function saveOnboardingPlan(
  selection: OnboardingPlanSelection,
): Promise<Result<{ planId: string }>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const billing: LeadbaseBillingInterval =
      selection.billing === "yearly" ? "yearly" : "monthly";

    let storedPlan: Record<string, unknown>;
    if (selection.planId === "free") {
      storedPlan = {
        id: "free",
        planId: "free",
        billing,
        tierIndex: 0,
        credits: null,
        priceEur: 0,
        checkoutStatus: "free",
      };
    } else {
      const plan = getPublicPlan(selection.planId);
      if (!plan) return { ok: false, error: "Ungültiger Plan." };
      const tierIndex = normalizeTierIndex(plan, selection.tierIndex);
      const tier = plan.tiers[tierIndex];
      storedPlan = {
        id: plan.id,
        planId: plan.id,
        billing,
        tierIndex,
        credits: tier.credits,
        priceEur:
          billing === "yearly"
            ? tier.monthlyPriceEur * 10
            : tier.monthlyPriceEur,
        checkoutStatus: "pending_checkout",
      };
    }

    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        leadbase_plan_selection: storedPlan,
        leadbase_onboarding_step: "profile",
      },
    });
    if (metadataError) return { ok: false, error: metadataError.message };

    // Billing is intentionally not faked here. Until Stripe is connected, a
    // paid-looking selection stays pending_checkout and never grants paid plan
    // entitlements. The existing usage ledger remains the metering source.
    const admin = createAdminClient();
    const { error: accountError } = await admin
      .from("ai_usage_accounts")
      .upsert(
        {
          user_id: user.id,
          plan_id: "free",
          subscription_status: "free",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (accountError) console.error("Could not sync onboarding plan marker:", accountError);

    revalidatePath("/", "layout");
    return { ok: true, data: { planId: String(storedPlan.id) } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Plan konnte nicht gespeichert werden.",
    };
  }
}

export async function saveOnboardingProfile(
  input: OnboardingProfileInput,
): Promise<Result<{ replyEmail: string }>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const fullName = clean(input.fullName, 160);
    const location = clean(input.location, 180);

    if (!fullName) {
      return { ok: false, error: "Dieses Feld ist erforderlich.", field: "fullName" };
    }
    if (!location) {
      return { ok: false, error: "Dieses Feld ist erforderlich.", field: "location" };
    }

    const { data: gmailConnection } = await supabase
      .from("gmail_connections")
      .select("email_address")
      .eq("user_id", user.id)
      .maybeSingle();

    const replyEmail =
      clean(gmailConnection?.email_address, 254) || clean(user.email, 254);

    const currencyMode: LeadbaseCurrencyMode = input.currencyMode === "manual" ? "manual" : "auto";
    const currency = currencyMode === "manual"
      ? normalizeLeadbaseCurrency(input.currency)
      : (inferCurrencyFromLocation(location) ?? normalizeLeadbaseCurrency(input.currency));

    const profile = {
      senderName: fullName,
      outreachRole: clean(input.outreachRole, 160),
      replyEmail,
      website: clean(input.website, 300),
      signature: clean(input.signature, 2000),
      company: clean(input.company, 180),
      focus: clean(input.focus, 240),
      description: clean(input.description, 1200),
      fullName,
      phoneCountryCode: clean(input.phoneCountryCode, 8),
      phone: clean(input.phone, 50),
      location,
      currency,
      currencyMode,
    };

    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        full_name: fullName,
        name: fullName,
        leadbase_profile: profile,
        leadbase_profile_completed: true,
        leadbase_onboarding_completed: true,
        leadbase_onboarding_step: "done",
        leadbase_product_tour_completed: false,
      },
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    return { ok: true, data: { replyEmail } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.",
    };
  }
}

export async function saveDesignDefaults(
  input: LeadbaseDesignDefaults,
): Promise<Result<{ defaults: LeadbaseDesignDefaults }>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const defaults = normalizeLeadbaseDesignDefaults(input);

    await assertPlanAiSelectionAvailable(user.id, {
      feature: "design_generation",
      model: defaults.designModel,
      reasoningEffort: defaults.reasoningEffort,
    });

    if (defaults.motionPreset !== "none") {
      await assertPlanFeatureAvailable(user.id, "design_motion");
    }

    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        leadbase_design_defaults: defaults,
      },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    revalidatePath("/leads", "layout");
    return { ok: true, data: { defaults } };
  } catch (error) {
    if (isPlanAccessError(error)) {
      return {
        ok: false,
        error: planAccessMessage(error, "de") ?? "Dieses Design-Setting ist in deinem Plan nicht enthalten.",
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Design-Defaults konnten nicht gespeichert werden.",
    };
  }
}

export async function completeProductTour(): Promise<Result> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        leadbase_product_tour_completed: true,
      },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tour konnte nicht abgeschlossen werden.",
    };
  }
}
