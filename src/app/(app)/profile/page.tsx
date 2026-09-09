import { redirect } from "next/navigation";

import { WorkspacePageMotion } from "@/components/workspace-page-motion";
import { createClient } from "@/lib/supabase/server";
import type { LeadbaseProfileData, ProposalBrandingDefaults } from "./actions";
import { ProfilePrecisionClient } from "./profile-precision-client";

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

  // Test accounts must start as a genuinely empty workspace. Older versions
  // seeded Joel-specific profile defaults, which made a fresh tester look as if
  // their profile had already been configured. Once the tester saves the
  // profile for the first time, `leadbase_profile_completed` is set to true and
  // the saved values are used normally from then on.
  const { data: usageAccount } = await supabase
    .from("ai_usage_accounts")
    .select("plan_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isUnconfiguredTestAccount =
    usageAccount?.plan_id === "test-80k" && metadata.leadbase_profile_completed !== true;

  const accountName = string(stored.fullName, string(metadata.full_name, string(metadata.name)));

  const initialProfile: LeadbaseProfileData = isUnconfiguredTestAccount
    ? {
        senderName: "",
        outreachRole: "",
        replyEmail: "",
        website: "",
        signature: "",
        company: "",
        focus: "",
        description: "",
        fullName: "",
        phoneCountryCode: "+49",
        phone: "",
        location: "",
      }
    : {
        senderName: string(stored.senderName, accountName),
        outreachRole: string(stored.outreachRole, "Webdesigner & Webentwickler"),
        replyEmail: string(stored.replyEmail, accountEmail || "hello@joelcimpean.com"),
        website: string(stored.website, "joelcimpean.com"),
        signature: string(stored.signature, `Viele Grüße\n${accountName} · Webdesigner & Webentwickler\njoelcimpean.com · ${accountEmail || "hello@joelcimpean.com"}`),
        company: string(stored.company, `${accountName} – Webdesign`),
        focus: string(stored.focus, "Websites für Handwerk & lokale Dienstleister"),
        description: string(stored.description, "Ich baue schnelle, wartungsarme Websites für Betriebe – mit Fokus auf Sichtbarkeit, Anfragen und Terminbuchung."),
        fullName: accountName,
        phoneCountryCode: string(stored.phoneCountryCode, "+49"),
        phone: string(stored.phone),
        location: string(stored.location, "Reutlingen, DE"),
      };

  const rawBranding = (metadata.leadbase_proposal_branding ?? {}) as Partial<ProposalBrandingDefaults>;
  const initialBranding: ProposalBrandingDefaults = {
    accentColor: string(rawBranding.accentColor, "#002BBA"),
    logoUrl: typeof rawBranding.logoUrl === "string" ? rawBranding.logoUrl : null,
    logoPath: typeof rawBranding.logoPath === "string" ? rawBranding.logoPath : null,
  };

  return (
    <div className="leadbase-workspace-page leadbase-route-profile h-full min-h-0">
      <WorkspacePageMotion />
      <ProfilePrecisionClient
        initialProfile={initialProfile}
        accountEmail={accountEmail}
        initialAvatarUrl={typeof metadata.avatar_url === "string" ? metadata.avatar_url : null}
        initialBranding={initialBranding}
      />
    </div>
  );
}
