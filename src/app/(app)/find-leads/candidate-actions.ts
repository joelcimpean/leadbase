"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/* =========================================================
   ADD CANDIDATE TO CRM
========================================================= */

export async function saveCandidateAsLead(
  formData: FormData
) {
  const candidateId =
    formData.get("candidateId");

  if (
    typeof candidateId !== "string" ||
    !candidateId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /* ---------------------------------------------------------
     LOAD CANDIDATE
  --------------------------------------------------------- */

  const {
    data: candidate,
    error: candidateError,
  } = await supabase
    .from("lead_candidates")
    .select(`
      id,
      campaign_id,
      lead_id,
      external_id,
      name,
      website_url,
      website_domain,
      phone,
      formatted_address,
      website_score,
      opportunity_score,
      status
    `)
    .eq("id", candidateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    candidateError ||
    !candidate
  ) {
    console.error(
      "Could not load candidate:",
      candidateError
    );

    return;
  }

  /* Already saved */

  if (
    candidate.status === "SAVED" &&
    candidate.lead_id
  ) {
    return;
  }

  if (!candidate.campaign_id) {
    console.error(
      "Candidate has no campaign."
    );

    return;
  }

  /* ---------------------------------------------------------
     FIND EXISTING COMPANY
  --------------------------------------------------------- */

  let companyId:
    | string
    | null = null;

  const {
    data: existingCompany,
    error: existingCompanyError,
  } = await supabase
    .from("companies")
    .select("id")
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "google_place_id",
      candidate.external_id
    )
    .limit(1)
    .maybeSingle();

  if (
    existingCompanyError
  ) {
    console.error(
      "Could not check existing company:",
      existingCompanyError
    );

    return;
  }

  if (existingCompany) {
    companyId =
      existingCompany.id;
  }

  /* ---------------------------------------------------------
     CREATE COMPANY
  --------------------------------------------------------- */

  if (!companyId) {
    const {
      data: company,
      error: companyError,
    } = await supabase
      .from("companies")
      .insert({
        user_id:
          user.id,

        name:
          candidate.name,

        website_url:
          candidate.website_url,

        website_domain:
          candidate.website_domain,

        phone:
          candidate.phone,

        location:
          candidate.formatted_address,

        google_place_id:
          candidate.external_id,

        source:
          "GOOGLE_PLACES",
      })
      .select("id")
      .single();

    if (
      companyError ||
      !company
    ) {
      console.error(
        "Could not create company:",
        companyError
      );

      return;
    }

    companyId =
      company.id;
  }

  /* ---------------------------------------------------------
     CHECK WHETHER LEAD ALREADY EXISTS
  --------------------------------------------------------- */

  const {
    data: existingLead,
    error: existingLeadError,
  } = await supabase
    .from("leads")
    .select("id")
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "company_id",
      companyId
    )
    .eq(
      "campaign_id",
      candidate.campaign_id
    )
    .limit(1)
    .maybeSingle();

  if (existingLeadError) {
    console.error(
      "Could not check existing lead:",
      existingLeadError
    );

    return;
  }

  let leadId:
    | string
    | null =
    existingLead?.id ?? null;

  /* ---------------------------------------------------------
     CREATE LEAD
  --------------------------------------------------------- */

  if (!leadId) {
    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("leads")
      .insert({
        user_id:
          user.id,

        company_id:
          companyId,

        campaign_id:
          candidate.campaign_id,

        status:
          "NEW",

        source:
          "GOOGLE_PLACES",

        website_score:
          candidate.website_score,

        opportunity_score:
          candidate.opportunity_score,
      })
      .select("id")
      .single();

    if (
      leadError ||
      !lead
    ) {
      console.error(
        "Could not create lead:",
        leadError
      );

      return;
    }

    leadId =
      lead.id;

    /* -------------------------------------------------------
       ACTIVITY
    ------------------------------------------------------- */

    const {
      error: activityError,
    } = await supabase
      .from("activities")
      .insert({
        user_id:
          user.id,

        lead_id:
          lead.id,

        activity_type:
          "LEAD_CREATED",

        title:
          "Lead created",

        description:
          "Lead was added from Google Places discovery.",
      });

    if (activityError) {
      console.error(
        "Could not create activity:",
        activityError
      );
    }
  }

  /* ---------------------------------------------------------
     MARK CANDIDATE AS SAVED
  --------------------------------------------------------- */

  const {
    error: candidateUpdateError,
  } = await supabase
    .from("lead_candidates")
    .update({
      status:
        "SAVED",

      lead_id:
        leadId,
    })
    .eq(
      "id",
      candidate.id
    )
    .eq(
      "user_id",
      user.id
    );

  if (
    candidateUpdateError
  ) {
    console.error(
      "Could not update candidate:",
      candidateUpdateError
    );

    return;
  }

  /* ---------------------------------------------------------
     REVALIDATE
  --------------------------------------------------------- */

  revalidatePath(
    "/find-leads"
  );

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/campaigns"
  );

  revalidatePath(
    `/campaigns/${candidate.campaign_id}`
  );

  if (leadId) {
    revalidatePath(
      `/leads/${leadId}`
    );
  }
}

/* =========================================================
   REJECT CANDIDATE
========================================================= */

export async function rejectCandidate(
  formData: FormData
) {
  const candidateId =
    formData.get("candidateId");

  if (
    typeof candidateId !== "string" ||
    !candidateId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    error,
  } = await supabase
    .from("lead_candidates")
    .update({
      status:
        "REJECTED",
    })
    .eq(
      "id",
      candidateId
    )
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "status",
      "DISCOVERED"
    );

  if (error) {
    console.error(
      "Could not reject candidate:",
      error
    );

    return;
  }

  revalidatePath(
    "/find-leads"
  );
}