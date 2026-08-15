"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const validStatuses = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
] as const;

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function getFollowUpDays(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return 5;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    parsed > 365
  ) {
    return 5;
  }

  return parsed;
}

/* =========================================================
   CREATE CAMPAIGN
========================================================= */

export async function createCampaign(formData: FormData) {
  const name = formData.get("name");
  const targetIndustry = formData.get("targetIndustry");
  const targetGeography = formData.get("targetGeography");
  const companySizePreference = formData.get(
    "companySizePreference"
  );
  const targetRoles = formData.get("targetRoles");
  const researchCriteria = formData.get("researchCriteria");
  const websiteCriteria = formData.get("websiteCriteria");
  const outreachAngle = formData.get("outreachAngle");
  const emailTone = formData.get("emailTone");
  const followUpDays = formData.get("followUpDays");
  const status = formData.get("status");

  if (typeof name !== "string" || !name.trim()) {
    redirect(
      `/campaigns/new?error=${encodeURIComponent(
        "Bitte gib einen Kampagnennamen ein."
      )}`
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const cleanStatus =
    typeof status === "string" &&
    validStatuses.includes(
      status as (typeof validStatuses)[number]
    )
      ? status
      : "DRAFT";

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: name.trim(),
      target_industry: optionalText(targetIndustry),
      target_geography: optionalText(targetGeography),
      company_size_preference: optionalText(
        companySizePreference
      ),
      target_roles: optionalText(targetRoles),
      research_criteria: optionalText(researchCriteria),
      website_criteria: optionalText(websiteCriteria),
      outreach_angle: optionalText(outreachAngle),
      email_tone: optionalText(emailTone),
      follow_up_days: getFollowUpDays(followUpDays),
      status: cleanStatus,
    })
    .select("id")
    .single();

  if (error || !campaign) {
    console.error("Campaign creation failed:", error);

    redirect(
      `/campaigns/new?error=${encodeURIComponent(
        "Die Kampagne konnte nicht gespeichert werden."
      )}`
    );
  }

  revalidatePath("/campaigns");

  redirect(`/campaigns/${campaign.id}`);
}

/* =========================================================
   UPDATE CAMPAIGN DETAILS
========================================================= */

export async function updateCampaignDetails(
  formData: FormData
) {
  const campaignId = formData.get("campaignId");

  const name = formData.get("name");
  const targetIndustry = formData.get("targetIndustry");
  const targetGeography = formData.get("targetGeography");
  const companySizePreference = formData.get(
    "companySizePreference"
  );
  const targetRoles = formData.get("targetRoles");
  const researchCriteria = formData.get("researchCriteria");
  const websiteCriteria = formData.get("websiteCriteria");
  const outreachAngle = formData.get("outreachAngle");
  const emailTone = formData.get("emailTone");
  const followUpDays = formData.get("followUpDays");
  const status = formData.get("status");

  if (
    typeof campaignId !== "string" ||
    !campaignId ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    return;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cleanStatus =
    typeof status === "string" &&
    validStatuses.includes(
      status as (typeof validStatuses)[number]
    )
      ? status
      : "DRAFT";

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: name.trim(),
      target_industry: optionalText(targetIndustry),
      target_geography: optionalText(targetGeography),
      company_size_preference: optionalText(
        companySizePreference
      ),
      target_roles: optionalText(targetRoles),
      research_criteria: optionalText(researchCriteria),
      website_criteria: optionalText(websiteCriteria),
      outreach_angle: optionalText(outreachAngle),
      email_tone: optionalText(emailTone),
      follow_up_days: getFollowUpDays(followUpDays),
      status: cleanStatus,
    })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Campaign update failed:", error);

    redirect(
      `/campaigns/${campaignId}/edit?error=${encodeURIComponent(
        "Die Kampagne konnte nicht gespeichert werden."
      )}`
    );
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);

  redirect(`/campaigns/${campaignId}`);
}

/* =========================================================
   UPDATE CAMPAIGN STATUS
========================================================= */

export async function updateCampaignStatus(
  formData: FormData
) {
  const campaignId = formData.get("campaignId");
  const status = formData.get("status");

  if (
    typeof campaignId !== "string" ||
    !campaignId ||
    typeof status !== "string" ||
    !validStatuses.includes(
      status as (typeof validStatuses)[number]
    )
  ) {
    return;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      status,
    })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "Campaign status update failed:",
      error
    );

    return;
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
}

/* =========================================================
   DELETE CAMPAIGN
========================================================= */

export async function deleteCampaign(
  formData: FormData
) {
  const campaignId = formData.get("campaignId");

  if (
    typeof campaignId !== "string" ||
    !campaignId
  ) {
    return;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "Campaign deletion failed:",
      error
    );

    return;
  }

  revalidatePath("/campaigns");
  revalidatePath("/leads");

  redirect("/campaigns");
}