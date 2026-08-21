"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

export type BulkDeleteResult =
  | {
      success: true;
      deletedCount: number;
    }
  | {
      success: false;
      error: string;
    };

/* =========================================================
   BULK DELETE LEADS
========================================================= */

export async function bulkDeleteLeads(
  leadIds: string[]
): Promise<BulkDeleteResult> {
  /* =======================================================
     CLEAN IDS
  ======================================================= */

  const cleanLeadIds = Array.from(
    new Set(
      leadIds.filter(
        (leadId) =>
          typeof leadId === "string" &&
          leadId.trim().length > 0
      )
    )
  );

  if (cleanLeadIds.length === 0) {
    return {
      success: false,
      error: "No leads were selected.",
    };
  }

  /* =======================================================
     AUTH
  ======================================================= */

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /* =======================================================
     LOAD OWNED LEADS

     Important:
     We only delete leads that actually belong
     to the currently signed-in user.
  ======================================================= */

  const {
    data: leads,
    error: leadsError,
  } = await supabase
    .from("leads")
    .select(`
      id,
      company_id,
      campaign_id
    `)
    .eq("user_id", user.id)
    .in("id", cleanLeadIds);

  if (leadsError) {
    console.error(
      "Could not load leads for bulk delete:",
      leadsError
    );

    return {
      success: false,
      error:
        "The selected leads could not be loaded.",
    };
  }

  if (!leads || leads.length === 0) {
    return {
      success: false,
      error:
        "No matching leads were found.",
    };
  }

  const ownedLeadIds = leads.map(
    (lead) => lead.id
  );

  /* =======================================================
     KEEP RELATED IDS

     We need these after deleting the leads so we can:
     - clean up unused companies
     - refresh affected campaigns
  ======================================================= */

  const companyIds = Array.from(
    new Set(
      leads
        .map(
          (lead) =>
            lead.company_id
        )
        .filter(
          (
            companyId
          ): companyId is string =>
            typeof companyId ===
              "string" &&
            companyId.length > 0
        )
    )
  );

  const campaignIds = Array.from(
    new Set(
      leads
        .map(
          (lead) =>
            lead.campaign_id
        )
        .filter(
          (
            campaignId
          ): campaignId is string =>
            typeof campaignId ===
              "string" &&
            campaignId.length > 0
        )
    )
  );

  /* =======================================================
     DELETE LEADS
  ======================================================= */

  const {
    error: deleteError,
  } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", user.id)
    .in("id", ownedLeadIds);

  if (deleteError) {
    console.error(
      "Bulk lead delete failed:",
      deleteError
    );

    return {
      success: false,
      error:
        "The selected leads could not be deleted.",
    };
  }

  /* =======================================================
     CLEAN UP COMPANIES

     A company should only be deleted when no other
     lead still references it.

     This matches the behaviour of the existing
     single-lead delete action.
  ======================================================= */

  if (companyIds.length > 0) {
    const {
      data: remainingLeads,
      error:
        remainingLeadsError,
    } = await supabase
      .from("leads")
      .select("company_id")
      .eq("user_id", user.id)
      .in(
        "company_id",
        companyIds
      );

    if (
      remainingLeadsError
    ) {
      console.error(
        "Could not check remaining company usage:",
        remainingLeadsError
      );
    } else {
      const usedCompanyIds =
        new Set(
          (
            remainingLeads ??
            []
          )
            .map(
              (lead) =>
                lead.company_id
            )
            .filter(
              (
                companyId
              ): companyId is string =>
                typeof companyId ===
                  "string" &&
                companyId.length >
                  0
            )
        );

      const unusedCompanyIds =
        companyIds.filter(
          (companyId) =>
            !usedCompanyIds.has(
              companyId
            )
        );

      if (
        unusedCompanyIds.length >
        0
      ) {
        const {
          error:
            companyDeleteError,
        } = await supabase
          .from("companies")
          .delete()
          .eq(
            "user_id",
            user.id
          )
          .in(
            "id",
            unusedCompanyIds
          );

        if (
          companyDeleteError
        ) {
          /*
           * The leads are already deleted at this point.
           * A company cleanup problem therefore should not
           * make the whole user action look like it failed.
           */
          console.error(
            "Could not clean up companies after bulk delete:",
            companyDeleteError
          );
        }
      }
    }
  }

  /* =======================================================
     REVALIDATE
  ======================================================= */

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/campaigns");

  for (
    const campaignId of
    campaignIds
  ) {
    revalidatePath(
      `/campaigns/${campaignId}`
    );
  }

  return {
    success: true,
    deletedCount:
      ownedLeadIds.length,
  };
}