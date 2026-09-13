"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";
import { resolveAccountCurrency } from "@/lib/account-currency";

/* =========================================================
   WEBSITE DOMAIN
========================================================= */

function normalizeDomain(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return null;
  }

  const trimmed =
    value
      .trim()
      .toLowerCase();

  if (
    !trimmed
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        trimmed.startsWith(
          "http://"
        ) ||
          trimmed.startsWith(
            "https://"
          )
          ? trimmed
          : `https://${trimmed}`
      );

    return url.hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );
  } catch {
    return trimmed.replace(
      /^www\./,
      ""
    );
  }
}

/* =========================================================
   ADD CANDIDATE TO CRM
========================================================= */

export async function saveCandidateAsLead(
  formData: FormData
) {
  const candidateId =
    formData.get(
      "candidateId"
    );

  if (
    typeof candidateId !==
      "string" ||
    !candidateId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
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

  /* =======================================================
     LOAD CANDIDATE
  ======================================================= */

  const {
    data:
      candidate,

    error:
      candidateError,
  } =
    await supabase
      .from(
        "lead_candidates"
      )
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
        latitude,
        longitude,
        website_score,
        opportunity_score,
        status
      `)
      .eq(
        "id",
        candidateId
      )
      .eq(
        "user_id",
        user.id
      )
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

  if (
    candidate.status ===
      "SAVED" &&
    candidate.lead_id
  ) {
    return;
  }

  if (
    !candidate.campaign_id
  ) {
    console.error(
      "Candidate has no campaign."
    );

    return;
  }

  const candidateDomain =
    normalizeDomain(
      candidate.website_domain ??
        candidate.website_url
    );

  /* =======================================================
     FIND COMPANY BY GOOGLE PLACE ID
  ======================================================= */

  let companyId:
    | string
    | null =
    null;

  if (
    candidate.external_id
  ) {
    const {
      data:
        existingCompany,

      error:
        existingCompanyError,
    } =
      await supabase
        .from(
          "companies"
        )
        .select(`
          id,
          latitude,
          longitude
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "google_place_id",
          candidate.external_id
        )
        .limit(
          1
        )
        .maybeSingle();

    if (
      existingCompanyError
    ) {
      console.error(
        "Could not check existing company by Google Place ID:",
        existingCompanyError
      );

      return;
    }

    if (
      existingCompany
    ) {
      companyId =
        existingCompany.id;

      if (
        (
          existingCompany.latitude ===
            null ||
          existingCompany.longitude ===
            null
        ) &&
        candidate.latitude !==
          null &&
        candidate.longitude !==
          null
      ) {
        const {
          error:
            coordinateUpdateError,
        } =
          await supabase
            .from(
              "companies"
            )
            .update({
              latitude:
                candidate.latitude,

              longitude:
                candidate.longitude,
            })
            .eq(
              "id",
              existingCompany.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (
          coordinateUpdateError
        ) {
          console.error(
            "Could not add coordinates to existing company:",
            coordinateUpdateError
          );
        }
      }
    }
  }

  /* =======================================================
     FIND COMPANY BY DOMAIN
  ======================================================= */

  if (
    !companyId &&
    candidateDomain
  ) {
    const {
      data:
        existingCompanyByDomain,

      error:
        existingCompanyByDomainError,
    } =
      await supabase
        .from(
          "companies"
        )
        .select(`
          id,
          latitude,
          longitude
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "website_domain",
          candidateDomain
        )
        .limit(
          1
        )
        .maybeSingle();

    if (
      existingCompanyByDomainError
    ) {
      console.error(
        "Could not check existing company by website domain:",
        existingCompanyByDomainError
      );

      return;
    }

    if (
      existingCompanyByDomain
    ) {
      companyId =
        existingCompanyByDomain.id;

      if (
        (
          existingCompanyByDomain.latitude ===
            null ||
          existingCompanyByDomain.longitude ===
            null
        ) &&
        candidate.latitude !==
          null &&
        candidate.longitude !==
          null
      ) {
        const {
          error:
            coordinateUpdateError,
        } =
          await supabase
            .from(
              "companies"
            )
            .update({
              latitude:
                candidate.latitude,

              longitude:
                candidate.longitude,
            })
            .eq(
              "id",
              existingCompanyByDomain.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (
          coordinateUpdateError
        ) {
          console.error(
            "Could not add coordinates to existing company:",
            coordinateUpdateError
          );
        }
      }
    }
  }

  /* =======================================================
     OLDER COMPANIES FALLBACK
  ======================================================= */

  if (
    !companyId &&
    candidateDomain
  ) {
    const {
      data:
        companiesWithWebsite,

      error:
        companiesWithWebsiteError,
    } =
      await supabase
        .from(
          "companies"
        )
        .select(`
          id,
          website_url,
          website_domain,
          latitude,
          longitude
        `)
        .eq(
          "user_id",
          user.id
        )
        .not(
          "website_url",
          "is",
          null
        );

    if (
      companiesWithWebsiteError
    ) {
      console.error(
        "Could not check older companies by website:",
        companiesWithWebsiteError
      );

      return;
    }

    const domainMatch =
      (
        companiesWithWebsite ??
        []
      ).find(
        (
          company
        ) =>
          normalizeDomain(
            company.website_domain ??
              company.website_url
          ) ===
          candidateDomain
      );

    if (
      domainMatch
    ) {
      companyId =
        domainMatch.id;

      if (
        (
          domainMatch.latitude ===
            null ||
          domainMatch.longitude ===
            null
        ) &&
        candidate.latitude !==
          null &&
        candidate.longitude !==
          null
      ) {
        const {
          error:
            coordinateUpdateError,
        } =
          await supabase
            .from(
              "companies"
            )
            .update({
              latitude:
                candidate.latitude,

              longitude:
                candidate.longitude,
            })
            .eq(
              "id",
              domainMatch.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (
          coordinateUpdateError
        ) {
          console.error(
            "Could not add coordinates to older company:",
            coordinateUpdateError
          );
        }
      }
    }
  }

  /* =======================================================
     CREATE COMPANY
  ======================================================= */

  if (
    !companyId
  ) {
    const {
      data:
        company,

      error:
        companyError,
    } =
      await supabase
        .from(
          "companies"
        )
        .insert({
          user_id:
            user.id,

          name:
            candidate.name,

          website_url:
            candidate.website_url,

          website_domain:
            candidateDomain,

          phone:
            candidate.phone,

          location:
            candidate.formatted_address,

          latitude:
            candidate.latitude,

          longitude:
            candidate.longitude,

          google_place_id:
            candidate.external_id,

          source:
            "GOOGLE_PLACES",
        })
        .select(
          "id"
        )
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

  /* =======================================================
     EXISTING LEAD

     Global across campaigns.
  ======================================================= */

  const {
    data:
      existingLead,

    error:
      existingLeadError,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "company_id",
        companyId
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    existingLeadError
  ) {
    console.error(
      "Could not check existing lead:",
      existingLeadError
    );

    return;
  }

  let leadId:
    | string
    | null =
    existingLead?.id ??
    null;

  /* =======================================================
     CREATE LEAD
  ======================================================= */

  if (
    !leadId
  ) {
    const {
      data:
        lead,

      error:
        leadError,
    } =
      await supabase
        .from(
          "leads"
        )
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

          currency:
            accountCurrency,
        })
        .select(
          "id"
        )
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

    const {
      error:
        activityError,
    } =
      await supabase
        .from(
          "activities"
        )
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

    if (
      activityError
    ) {
      console.error(
        "Could not create activity:",
        activityError
      );
    }
  }

  /* =======================================================
     MARK SAVED
  ======================================================= */

  const {
    error:
      candidateUpdateError,
  } =
    await supabase
      .from(
        "lead_candidates"
      )
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

  /* =======================================================
     REVALIDATE
  ======================================================= */

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
    "/"
  );

  revalidatePath(
    `/campaigns/${candidate.campaign_id}`
  );

  if (
    leadId
  ) {
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
    formData.get(
      "candidateId"
    );

  if (
    typeof candidateId !==
      "string" ||
    !candidateId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "lead_candidates"
      )
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

  if (
    error
  ) {
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