"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resolveAccountCurrency } from "@/lib/account-currency";
import { cancelPendingFollowUps } from "@/lib/outreach-pipeline";
import { getLeadCreationAccess } from "@/lib/free-experience";

const validStatuses = [
  "NEW",
  "RESEARCHING",
  "QUALIFIED",
  "NOT_A_FIT",
  "DRAFT_READY",
  "CONTACTED",
  "REPLIED",
  "CALL_BOOKED",
  "PROPOSAL",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
] as const;

/* =========================================================
   CREATE LEAD
========================================================= */

export async function createLead(formData: FormData) {
  const companyName = formData.get("companyName");
  const websiteUrl = formData.get("websiteUrl");
  const industry = formData.get("industry");
  const location = formData.get("location");

  const email = formData.get("email");
  const contactPerson = formData.get("contactPerson");

  const campaignId = formData.get("campaignId");

  if (typeof companyName !== "string" || !companyName.trim()) {
    redirect(
      `/leads/new?error=${encodeURIComponent(
        "Bitte gib einen Firmennamen ein."
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

  const leadAccess = await getLeadCreationAccess(user.id);
  if (!leadAccess.allowed) {
    redirect(
      `/leads/new?error=${encodeURIComponent(
        "Your one-time Free lead slot has already been used. Upgrade to Starter to add another lead."
      )}`
    );
  }

  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const storedProfile = userMetadata.leadbase_profile && typeof userMetadata.leadbase_profile === "object"
    ? userMetadata.leadbase_profile as Record<string, unknown>
    : null;
  const accountCurrency = resolveAccountCurrency({
    storedCurrency: storedProfile?.currency,
    currencyMode: storedProfile?.currencyMode,
    location: typeof storedProfile?.location === "string" ? storedProfile.location : null,
  }).currency;

  /* ---------------------------------------------------------
     Validate campaign
  --------------------------------------------------------- */

  let cleanCampaignId: string | null = null;

  if (typeof campaignId === "string" && campaignId.trim()) {
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      redirect(
        `/leads/new?error=${encodeURIComponent(
          "Die ausgewählte Kampagne ist ungültig."
        )}`
      );
    }

    cleanCampaignId = campaign.id;
  }

  /* ---------------------------------------------------------
     Website
  --------------------------------------------------------- */

  const cleanWebsite =
    typeof websiteUrl === "string" && websiteUrl.trim()
      ? websiteUrl.trim()
      : null;

  let websiteDomain: string | null = null;

  if (cleanWebsite) {
    try {
      const normalizedUrl = cleanWebsite.startsWith("http")
        ? cleanWebsite
        : `https://${cleanWebsite}`;

      websiteDomain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
    } catch {
      const campaignQuery = cleanCampaignId
        ? `&campaign=${encodeURIComponent(cleanCampaignId)}`
        : "";

      redirect(
        `/leads/new?error=${encodeURIComponent(
          "Die Website-URL ist ungültig."
        )}${campaignQuery}`
      );
    }
  }

  /* ---------------------------------------------------------
     Create company
  --------------------------------------------------------- */

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      user_id: user.id,
      name: companyName.trim(),
      website_url: cleanWebsite,
      website_domain: websiteDomain,

      industry:
        typeof industry === "string" && industry.trim()
          ? industry.trim()
          : null,

      location:
        typeof location === "string" && location.trim()
          ? location.trim()
          : null,

      source: "manual",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    console.error("Company insert failed:", companyError);

    const campaignQuery = cleanCampaignId
      ? `&campaign=${encodeURIComponent(cleanCampaignId)}`
      : "";

    redirect(
      `/leads/new?error=${encodeURIComponent(
        "Die Firma konnte nicht gespeichert werden."
      )}${campaignQuery}`
    );
  }

  /* ---------------------------------------------------------
     Create primary contact if needed
  --------------------------------------------------------- */

  let primaryContactId: string | null = null;

  const hasContact =
    (typeof email === "string" && email.trim()) ||
    (typeof contactPerson === "string" && contactPerson.trim());

  if (hasContact) {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        company_id: company.id,

        full_name:
          typeof contactPerson === "string" && contactPerson.trim()
            ? contactPerson.trim()
            : null,

        email:
          typeof email === "string" && email.trim()
            ? email.trim()
            : null,

        is_primary: true,
      })
      .select("id")
      .single();

    if (contactError || !contact) {
      console.error("Contact insert failed:", contactError);

      await supabase
        .from("companies")
        .delete()
        .eq("id", company.id)
        .eq("user_id", user.id);

      const campaignQuery = cleanCampaignId
        ? `&campaign=${encodeURIComponent(cleanCampaignId)}`
        : "";

      redirect(
        `/leads/new?error=${encodeURIComponent(
          "Der Kontakt konnte nicht gespeichert werden."
        )}${campaignQuery}`
      );
    }

    primaryContactId = contact.id;
  }

  /* ---------------------------------------------------------
     Create lead
  --------------------------------------------------------- */

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      user_id: user.id,
      company_id: company.id,
      primary_contact_id: primaryContactId,
      campaign_id: cleanCampaignId,
      status: "NEW",
      source: "manual",
      currency: accountCurrency,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Lead insert failed:", leadError);

    await supabase
      .from("companies")
      .delete()
      .eq("id", company.id)
      .eq("user_id", user.id);

    const campaignQuery = cleanCampaignId
      ? `&campaign=${encodeURIComponent(cleanCampaignId)}`
      : "";

    const freeLimitReached = leadError?.message?.includes("FREE_LEAD_LIMIT_REACHED");

    redirect(
      `/leads/new?error=${encodeURIComponent(
        freeLimitReached
          ? "Your one-time Free lead slot has already been used. Upgrade to Starter to add another lead."
          : "Der Lead konnte nicht gespeichert werden."
      )}${campaignQuery}`
    );
  }

  /* ---------------------------------------------------------
     Activity
  --------------------------------------------------------- */

  const { error: activityError } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      lead_id: lead.id,
      activity_type: "LEAD_CREATED",
      title: "Lead created",
      description: "Lead was added manually.",
    });

  if (activityError) {
    console.error("Activity creation failed:", activityError);
  }

  /* ---------------------------------------------------------
     Revalidate + redirect
  --------------------------------------------------------- */

  revalidatePath("/leads");
  revalidatePath("/campaigns");

  if (cleanCampaignId) {
    revalidatePath(`/campaigns/${cleanCampaignId}`);

    redirect(`/campaigns/${cleanCampaignId}`);
  }

  redirect("/leads");
}

/* =========================================================
   UPDATE LEAD STATUS
========================================================= */

export async function updateLeadStatus(formData: FormData) {
  const leadId = formData.get("leadId");
  const status = formData.get("status");

  if (
    typeof leadId !== "string" ||
    typeof status !== "string" ||
    !validStatuses.includes(status as (typeof validStatuses)[number])
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

  const { data: currentLead, error: currentLeadError } = await supabase
    .from("leads")
    .select("campaign_id")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentLeadError || !currentLead) {
    console.error("Could not load lead:", currentLeadError);
    return;
  }

  const { error } = await supabase
    .from("leads")
    .update({
      status,
    })
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Status update failed:", error);
    return;
  }

  if (["WON", "LOST", "NOT_A_FIT", "DO_NOT_CONTACT"].includes(status)) {
    await cancelPendingFollowUps({
      supabase,
      userId: user.id,
      leadId,
      reason: status === "WON" ? "lead_won" : status === "LOST" || status === "NOT_A_FIT" ? "lead_lost" : "manual_stop",
      detail: `Follow-up stopped because lead status changed to ${status}.`,
    });
  }

  const { error: activityError } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      lead_id: leadId,
      activity_type: "STATUS_CHANGED",
      title: "Status changed",
      description: `Lead status changed to ${status}.`,
    });

  if (activityError) {
    console.error("Activity creation failed:", activityError);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/campaigns");

  if (currentLead.campaign_id) {
    revalidatePath(`/campaigns/${currentLead.campaign_id}`);
  }
}

/* =========================================================
   DELETE LEAD
========================================================= */

export async function deleteLead(formData: FormData) {
  const leadId = formData.get("leadId");

  if (typeof leadId !== "string" || !leadId) {
    return;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(`
      company_id,
      campaign_id
    `)
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single();

  if (leadError || !lead) {
    console.error("Could not find lead:", leadError);
    return;
  }

  const companyId = lead.company_id;
  const campaignId = lead.campaign_id;

  const { error: deleteError } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Could not delete lead:", deleteError);
    return;
  }

  /* ---------------------------------------------------------
     Delete company if no other lead uses it
  --------------------------------------------------------- */

  const { count, error: countError } = await supabase
    .from("leads")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("company_id", companyId)
    .eq("user_id", user.id);

  if (countError) {
    console.error("Could not check company usage:", countError);
  }

  if (!countError && count === 0) {
    const { error: companyDeleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId)
      .eq("user_id", user.id);

    if (companyDeleteError) {
      console.error("Could not delete company:", companyDeleteError);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/campaigns");

  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
  }

  redirect("/leads");
}

/* =========================================================
   UPDATE LEAD DETAILS
========================================================= */

export async function updateLeadDetails(formData: FormData) {
  const leadId = formData.get("leadId");

  const companyName = formData.get("companyName");
  const websiteUrl = formData.get("websiteUrl");
  const industry = formData.get("industry");
  const location = formData.get("location");
  const companyPhone = formData.get("companyPhone");
  const description = formData.get("description");
  const contactFormUrl = formData.get("contactFormUrl");
  const companyLinkedinUrl = formData.get("companyLinkedinUrl");
  const instagramUrl = formData.get("instagramUrl");

  const contactPerson = formData.get("contactPerson");
  const jobTitle = formData.get("jobTitle");
  const email = formData.get("email");
  const contactPhone = formData.get("contactPhone");
  const contactLinkedinUrl = formData.get("contactLinkedinUrl");

  const campaignId = formData.get("campaignId");
  const priority = formData.get("priority");
  const estimatedProjectValue = formData.get("estimatedProjectValue");
  const notes = formData.get("notes");

  if (
    typeof leadId !== "string" ||
    typeof companyName !== "string" ||
    !companyName.trim()
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

  /* ---------------------------------------------------------
     Current lead
  --------------------------------------------------------- */

  const { data: currentLead, error: leadFetchError } = await supabase
    .from("leads")
    .select(`
      company_id,
      primary_contact_id,
      campaign_id
    `)
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single();

  if (leadFetchError || !currentLead) {
    console.error("Could not load lead for editing:", leadFetchError);
    return;
  }

  const previousCampaignId = currentLead.campaign_id;

  const optionalText = (value: FormDataEntryValue | null) => {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  };

  /* ---------------------------------------------------------
     Website
  --------------------------------------------------------- */

  const cleanWebsite = optionalText(websiteUrl);

  let websiteDomain: string | null = null;

  if (cleanWebsite) {
    try {
      const normalizedUrl = cleanWebsite.startsWith("http")
        ? cleanWebsite
        : `https://${cleanWebsite}`;

      websiteDomain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
    } catch {
      redirect(
        `/leads/${leadId}/edit?error=${encodeURIComponent(
          "Die Website-URL ist ungültig."
        )}`
      );
    }
  }

  /* ---------------------------------------------------------
     Update company
  --------------------------------------------------------- */

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      name: companyName.trim(),
      website_url: cleanWebsite,
      website_domain: websiteDomain,
      industry: optionalText(industry),
      location: optionalText(location),
      phone: optionalText(companyPhone),
      description: optionalText(description),
      contact_form_url: optionalText(contactFormUrl),
      linkedin_url: optionalText(companyLinkedinUrl),
      instagram_url: optionalText(instagramUrl),
    })
    .eq("id", currentLead.company_id)
    .eq("user_id", user.id);

  if (companyError) {
    console.error("Company update failed:", companyError);
    return;
  }

  /* ---------------------------------------------------------
     Contact
  --------------------------------------------------------- */

  const hasContactData = Boolean(
    optionalText(contactPerson) ||
      optionalText(jobTitle) ||
      optionalText(email) ||
      optionalText(contactPhone) ||
      optionalText(contactLinkedinUrl)
  );

  let primaryContactId = currentLead.primary_contact_id;

  if (primaryContactId) {
    const { error: contactError } = await supabase
      .from("contacts")
      .update({
        full_name: optionalText(contactPerson),
        job_title: optionalText(jobTitle),
        email: optionalText(email),
        phone: optionalText(contactPhone),
        linkedin_url: optionalText(contactLinkedinUrl),
      })
      .eq("id", primaryContactId)
      .eq("user_id", user.id);

    if (contactError) {
      console.error("Contact update failed:", contactError);
      return;
    }
  } else if (hasContactData) {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        company_id: currentLead.company_id,
        full_name: optionalText(contactPerson),
        job_title: optionalText(jobTitle),
        email: optionalText(email),
        phone: optionalText(contactPhone),
        linkedin_url: optionalText(contactLinkedinUrl),
        is_primary: true,
      })
      .select("id")
      .single();

    if (contactError || !contact) {
      console.error("Contact creation failed:", contactError);
      return;
    }

    primaryContactId = contact.id;
  }

  /* ---------------------------------------------------------
     Project value
  --------------------------------------------------------- */

  let projectValue: number | null = null;

  if (
    typeof estimatedProjectValue === "string" &&
    estimatedProjectValue.trim()
  ) {
    const parsedValue = Number(estimatedProjectValue);

    if (!Number.isNaN(parsedValue) && parsedValue >= 0) {
      projectValue = parsedValue;
    }
  }

  /* ---------------------------------------------------------
     Priority
  --------------------------------------------------------- */

  const allowedPriorities = [
    "LOW",
    "MEDIUM",
    "HIGH",
  ];

  const cleanPriority =
    typeof priority === "string" &&
    allowedPriorities.includes(priority)
      ? priority
      : null;

  /* ---------------------------------------------------------
     Campaign
  --------------------------------------------------------- */

  let cleanCampaignId: string | null = null;

  if (typeof campaignId === "string" && campaignId.trim()) {
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      redirect(
        `/leads/${leadId}/edit?error=${encodeURIComponent(
          "Die ausgewählte Kampagne ist ungültig."
        )}`
      );
    }

    cleanCampaignId = campaign.id;
  }

  /* ---------------------------------------------------------
     Update lead
  --------------------------------------------------------- */

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      primary_contact_id: primaryContactId,
      campaign_id: cleanCampaignId,
      priority: cleanPriority,
      estimated_project_value: projectValue,
      notes: optionalText(notes),
    })
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (leadError) {
    console.error("Lead update failed:", leadError);
    redirect(
      `/leads/${leadId}/edit?error=${encodeURIComponent(
        `Lead/Notizen konnten nicht gespeichert werden: ${leadError.message}`
      )}`
    );
  }

  /* ---------------------------------------------------------
     Activity
  --------------------------------------------------------- */

  const { error: activityError } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      lead_id: leadId,
      activity_type: "LEAD_UPDATED",
      title: "Lead updated",
      description: "Lead details were updated manually.",
    });

  if (activityError) {
    console.error("Activity creation failed:", activityError);
  }

  /* ---------------------------------------------------------
     Revalidate
  --------------------------------------------------------- */

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/campaigns");

  if (previousCampaignId) {
    revalidatePath(`/campaigns/${previousCampaignId}`);
  }

  if (cleanCampaignId) {
    revalidatePath(`/campaigns/${cleanCampaignId}`);
  }

  redirect(`/leads/${leadId}`);
}
/* =========================================================
   MANUAL LEAD TABLE ORDER
========================================================= */

export async function reorderLeadsWithinGroup({
  groupKey,
  leadIds,
}: {
  groupKey: string;
  leadIds: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      error: "Nicht angemeldet.",
    };
  }

  const cleanLeadIds = Array.from(
    new Set(
      leadIds.filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      )
    )
  );

  if (
    !groupKey ||
    cleanLeadIds.length === 0 ||
    cleanLeadIds.length > 1000
  ) {
    return {
      ok: false as const,
      error: "Ungültige Sortierung.",
    };
  }

  const { error } = await supabase.rpc(
    "reorder_leadbase_leads",
    {
      p_group_key: groupKey,
      p_lead_ids: cleanLeadIds,
    }
  );

  if (error) {
    console.error("Lead reorder failed:", error);

    return {
      ok: false as const,
      error: "Die Reihenfolge konnte nicht gespeichert werden.",
    };
  }

  return {
    ok: true as const,
  };
}

export async function reorderLeadGroups({
  groupKeys,
}: {
  groupKeys: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      error: "Nicht angemeldet.",
    };
  }

  const cleanGroupKeys = Array.from(
    new Set(
      groupKeys.filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0 &&
          value.length <= 80
      )
    )
  );

  if (
    cleanGroupKeys.length === 0 ||
    cleanGroupKeys.length > 200
  ) {
    return {
      ok: false as const,
      error: "Ungültige Gruppensortierung.",
    };
  }

  const { error } = await supabase.rpc(
    "reorder_leadbase_groups",
    {
      p_group_keys: cleanGroupKeys,
    }
  );

  if (error) {
    console.error("Lead group reorder failed:", error);

    return {
      ok: false as const,
      error: "Die Gruppenreihenfolge konnte nicht gespeichert werden.",
    };
  }

  return {
    ok: true as const,
  };
}
