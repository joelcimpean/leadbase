"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { analyzeWebsite } from "@/lib/website-analysis";
import { captureWebsiteScreenshots } from "@/lib/website-screenshot";
import { analyzeWebsiteVisuals } from "@/lib/visual-website-analysis";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
   HELPERS
========================================================= */

function getSingleRelation<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getPriority(
  opportunityScore: number
): "LOW" | "MEDIUM" | "HIGH" {
  if (opportunityScore >= 65) {
    return "HIGH";
  }

  if (opportunityScore >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

/* =========================================================
   ANALYZE LEAD WEBSITE
========================================================= */

export async function analyzeLeadWebsite(
  formData: FormData
) {
  const leadId =
    formData.get("leadId");

  if (
    typeof leadId !== "string" ||
    !leadId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect("/login");
  }

  /* =========================================================
     LOAD LEAD
  ========================================================= */

  const {
    data: lead,
    error: leadError,
  } = await supabase
    .from("leads")
    .select(`
      id,
      company_id,
      primary_contact_id,
      campaign_id,

      company:companies (
        id,
        website_url,
        phone,
        contact_form_url
      ),

      primary_contact:contacts (
        id,
        full_name,
        job_title,
        salutation,
        is_decision_maker,
        email,
        phone,
        source_url
      )
    `)
    .eq(
      "id",
      leadId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    console.error(
      "Could not load lead for analysis:",
      leadError
    );

    return;
  }

  const company =
    getSingleRelation(
      lead.company
    );

  const currentContact =
    getSingleRelation(
      lead.primary_contact
    );

  /* =========================================================
     NO WEBSITE
  ========================================================= */

  if (
    !company?.website_url
  ) {
    const findings = [
      {
        key: "website",
        label: "Website",
        passed: false,

        detail:
          "No website was found for this company.",
      },
    ];

    const {
      error:
        noWebsiteError,
    } = await supabase
      .from("leads")
      .update({
        structural_score:
          0,

        website_score:
          0,

        opportunity_score:
          95,

        priority:
          "HIGH",

        research_summary:
          "No website was found for this company. This may represent a strong website opportunity, but the business should be manually verified before outreach.",

        website_findings:
          findings,

        analysis_status:
          "COMPLETED",

        analyzed_at:
          new Date().toISOString(),

        analysis_error:
          null,

        visual_score:
          null,

        redesign_potential:
          null,

        visual_analysis:
          {},

        visual_analysis_status:
          "NOT_ANALYZED",

        visual_analysis_error:
          null,

        visual_analyzed_at:
          null,

        visual_model:
          null,

        visual_input_tokens:
          null,

        visual_output_tokens:
          null,

        visual_total_tokens:
          null,
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      );

    if (
      noWebsiteError
    ) {
      console.error(
        "Could not save no-website analysis:",
        noWebsiteError
      );

      return;
    }

    revalidateEverything(
      leadId,
      lead.campaign_id
    );

    return;
  }

  /* =========================================================
     MARK AS ANALYZING
  ========================================================= */

  const {
    error:
      analyzingError,
  } = await supabase
    .from("leads")
    .update({
      analysis_status:
        "ANALYZING",

      analysis_error:
        null,

      visual_analysis_status:
        "ANALYZING",

      visual_analysis_error:
        null,
    })
    .eq(
      "id",
      leadId
    )
    .eq(
      "user_id",
      user.id
    );

  if (
    analyzingError
  ) {
    console.error(
      "Could not mark lead as analyzing:",
      analyzingError
    );

    return;
  }

  /* =========================================================
     STRUCTURAL / MULTI-PAGE ANALYSIS
  ========================================================= */

  let structuralResult;

  try {
    structuralResult =
      await analyzeWebsite(
        company.website_url
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Structural website analysis failed.";

    console.error(
      "Structural website analysis failed:",
      message
    );

    await supabase
      .from("leads")
      .update({
        analysis_status:
          "FAILED",

        analysis_error:
          message,

        analyzed_at:
          new Date().toISOString(),

        visual_analysis_status:
          "NOT_ANALYZED",
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      );

    revalidateEverything(
      leadId,
      lead.campaign_id
    );

    return;
  }

  /* =========================================================
     ENRICH COMPANY
  ========================================================= */

  const companyUpdates: {
    phone?: string;
    contact_form_url?: string;
  } = {};

  if (
    structuralResult.discoveredPhone &&
    !company.phone
  ) {
    companyUpdates.phone =
      structuralResult.discoveredPhone;
  }

  if (
    structuralResult.contactFormUrl &&
    !company.contact_form_url
  ) {
    companyUpdates.contact_form_url =
      structuralResult.contactFormUrl;
  }

  if (
    Object.keys(
      companyUpdates
    ).length > 0
  ) {
    const {
      error:
        companyUpdateError,
    } = await supabase
      .from("companies")
      .update(
        companyUpdates
      )
      .eq(
        "id",
        lead.company_id
      )
      .eq(
        "user_id",
        user.id
      );

    if (
      companyUpdateError
    ) {
      console.error(
        "Could not enrich company:",
        companyUpdateError
      );
    }
  }

  /* =========================================================
     ENRICH PRIMARY CONTACT
  ========================================================= */

  const discoveredName =
    structuralResult.decisionMakerName;

  const discoveredRole =
    structuralResult.decisionMakerRole;

  const discoveredSalutation =
    structuralResult.decisionMakerSalutation;

  const discoveredContactSource =
    structuralResult.decisionMakerSourceUrl ??
    structuralResult.emailSourceUrl ??
    structuralResult.phoneSourceUrl;

  /*
   * CASE 1:
   * Contact already exists.
   *
   * Example Thomas:
   * email + phone already exist,
   * but name/job title were previously empty.
   *
   * We enrich the existing contact instead of
   * creating a duplicate.
   */

  if (
    currentContact?.id
  ) {
    const contactUpdates: {
      full_name?: string;
      job_title?: string;
      salutation?: "HERR" | "FRAU";
      is_decision_maker?: boolean;
      email?: string;
      phone?: string;
      source_url?: string;
    } = {};

    /* -------------------------------------------------------
       NAME
    ------------------------------------------------------- */

    if (
      discoveredName &&
      !currentContact.full_name
    ) {
      contactUpdates.full_name =
        discoveredName;
    }

    /* -------------------------------------------------------
       ROLE
    ------------------------------------------------------- */

    if (
      discoveredRole &&
      !currentContact.job_title
    ) {
      contactUpdates.job_title =
        discoveredRole;
    }

    /* -------------------------------------------------------
       SALUTATION

       Only set when website explicitly gave us
       Herr/Frau. We never guess this from first name.
    ------------------------------------------------------- */

    if (
      discoveredSalutation &&
      !currentContact.salutation
    ) {
      contactUpdates.salutation =
        discoveredSalutation;
    }

    /* -------------------------------------------------------
       DECISION MAKER FLAG
    ------------------------------------------------------- */

    if (
      discoveredName &&
      !currentContact.is_decision_maker
    ) {
      contactUpdates.is_decision_maker =
        true;
    }

    /* -------------------------------------------------------
       EMAIL
    ------------------------------------------------------- */

    if (
      structuralResult.discoveredEmail &&
      !currentContact.email
    ) {
      contactUpdates.email =
        structuralResult.discoveredEmail;
    }

    /* -------------------------------------------------------
       PHONE
    ------------------------------------------------------- */

    if (
      structuralResult.discoveredPhone &&
      !currentContact.phone
    ) {
      contactUpdates.phone =
        structuralResult.discoveredPhone;
    }

    /* -------------------------------------------------------
       SOURCE
    ------------------------------------------------------- */

    if (
      discoveredContactSource &&
      !currentContact.source_url
    ) {
      contactUpdates.source_url =
        discoveredContactSource;
    }

    /* -------------------------------------------------------
       UPDATE
    ------------------------------------------------------- */

    if (
      Object.keys(
        contactUpdates
      ).length > 0
    ) {
      const {
        error:
          contactUpdateError,
      } = await supabase
        .from("contacts")
        .update(
          contactUpdates
        )
        .eq(
          "id",
          currentContact.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (
        contactUpdateError
      ) {
        console.error(
          "Could not enrich contact:",
          contactUpdateError
        );
      }
    }
  }

  /*
   * CASE 2:
   * No primary contact exists yet.
   *
   * Create one when we found at least:
   * - a person,
   * - an email,
   * - or a phone number.
   */

  else if (
    discoveredName ||
    structuralResult.discoveredEmail ||
    structuralResult.discoveredPhone
  ) {
    const {
      data:
        newContact,

      error:
        contactCreateError,
    } = await supabase
      .from("contacts")
      .insert({
        user_id:
          user.id,

        company_id:
          lead.company_id,

        full_name:
          discoveredName,

        job_title:
          discoveredRole,

        salutation:
          discoveredSalutation,

        is_decision_maker:
          Boolean(
            discoveredName
          ),

        email:
          structuralResult.discoveredEmail,

        phone:
          structuralResult.discoveredPhone,

        source_url:
          discoveredContactSource,

        is_primary:
          true,
      })
      .select("id")
      .single();

    if (
      contactCreateError ||
      !newContact
    ) {
      console.error(
        "Could not create discovered contact:",
        contactCreateError
      );
    } else {
      const {
        error:
          attachContactError,
      } = await supabase
        .from("leads")
        .update({
          primary_contact_id:
            newContact.id,
        })
        .eq(
          "id",
          leadId
        )
        .eq(
          "user_id",
          user.id
        );

      if (
        attachContactError
      ) {
        console.error(
          "Could not attach contact to lead:",
          attachContactError
        );
      }
    }
  }

  /* =========================================================
     VISUAL ANALYSIS
  ========================================================= */

  try {
    const screenshots =
      await captureWebsiteScreenshots(
        company.website_url
      );

    const visualResult =
      await analyzeWebsiteVisuals({
        websiteUrl:
          screenshots.finalUrl,

        desktop:
          screenshots.desktop,

        mobile:
          screenshots.mobile,
      });

    /* =======================================================
       FINAL SCORES

       Structural = HTML, content, conversion, business signals
       Visual     = design, hierarchy, branding, mobile quality
    ======================================================= */

    const finalWebsiteScore =
      Math.round(
        structuralResult.websiteScore *
          0.45 +
          visualResult.visualScore *
            0.55
      );

    const finalOpportunityScore =
      Math.round(
        structuralResult.opportunityScore *
          0.45 +
          visualResult.redesignPotential *
            0.55
      );

    const finalPriority =
      getPriority(
        finalOpportunityScore
      );

    /* =======================================================
       COMBINED SUMMARY
    ======================================================= */

    const combinedSummary = [
      structuralResult.summary,

      `Visual analysis: ${visualResult.summary}`,

      `Redesign potential: ${visualResult.redesignPotential}/100.`,

      `Redesign reason: ${visualResult.redesignReason}`,

      `Suggested outreach angle: ${visualResult.outreachAngle}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    /* =======================================================
       SAVE COMPLETE V3 RESULT
    ======================================================= */

    const {
      error:
        finalUpdateError,
    } = await supabase
      .from("leads")
      .update({
        structural_score:
          structuralResult.websiteScore,

        visual_score:
          visualResult.visualScore,

        redesign_potential:
          visualResult.redesignPotential,

        website_score:
          finalWebsiteScore,

        opportunity_score:
          finalOpportunityScore,

        priority:
          finalPriority,

        research_summary:
          combinedSummary,

        website_findings:
          structuralResult.findings,

        analysis_status:
          "COMPLETED",

        analyzed_at:
          new Date().toISOString(),

        analysis_error:
          null,

        visual_analysis:
          visualResult,

        visual_analysis_status:
          "COMPLETED",

        visual_analysis_error:
          null,

        visual_analyzed_at:
          new Date().toISOString(),

        visual_model:
          visualResult.model,

        visual_input_tokens:
          visualResult.usage.inputTokens,

        visual_output_tokens:
          visualResult.usage.outputTokens,

        visual_total_tokens:
          visualResult.usage.totalTokens,
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      );

    if (
      finalUpdateError
    ) {
      throw new Error(
        finalUpdateError.message
      );
    }

    /* =======================================================
       ACTIVITY
    ======================================================= */

    const {
      error:
        activityError,
    } = await supabase
      .from("activities")
      .insert({
        user_id:
          user.id,

        lead_id:
          leadId,

        activity_type:
          "WEBSITE_ANALYZED",

        title:
          "Website analyzed",

        description:
          `Final website score ${finalWebsiteScore}/100 · ` +
          `Opportunity score ${finalOpportunityScore}/100 · ` +
          `Visual score ${visualResult.visualScore}/100 · ` +
          `${structuralResult.analyzedPages.length} pages crawled.`,
      });

    if (
      activityError
    ) {
      console.error(
        "Could not create analysis activity:",
        activityError
      );
    }
  } catch (error) {
    /* =======================================================
       VISUAL FAILED
       KEEP STRUCTURAL ANALYSIS
    ======================================================= */

    const message =
      error instanceof Error
        ? error.message
        : "Visual website analysis failed.";

    console.error(
      "Visual website analysis failed:",
      message
    );

    const {
      error:
        fallbackError,
    } = await supabase
      .from("leads")
      .update({
        structural_score:
          structuralResult.websiteScore,

        website_score:
          structuralResult.websiteScore,

        opportunity_score:
          structuralResult.opportunityScore,

        priority:
          structuralResult.priority,

        research_summary:
          structuralResult.summary,

        website_findings:
          structuralResult.findings,

        analysis_status:
          "COMPLETED",

        analyzed_at:
          new Date().toISOString(),

        analysis_error:
          null,

        visual_analysis_status:
          "FAILED",

        visual_analysis_error:
          message,

        visual_analyzed_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      );

    if (
      fallbackError
    ) {
      console.error(
        "Could not save structural fallback:",
        fallbackError
      );
    }
  }

  /* =========================================================
     REFRESH UI
  ========================================================= */

  revalidateEverything(
    leadId,
    lead.campaign_id
  );
}

/* =========================================================
   REVALIDATE
========================================================= */

function revalidateEverything(
  leadId: string,
  campaignId:
    | string
    | null
) {
  revalidatePath(
    "/leads"
  );

  revalidatePath(
    `/leads/${leadId}`
  );

  revalidatePath(
    `/leads/${leadId}/edit`
  );

  revalidatePath(
    "/campaigns"
  );

  if (
    campaignId
  ) {
    revalidatePath(
      `/campaigns/${campaignId}`
    );
  }
}