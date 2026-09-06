import Link from "next/link";

import {
  Plus,
} from "lucide-react";

import {
  LeadsTable,
  type LeadTableRow,
} from "./leads-table";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  leadsCopy,
} from "@/lib/leads-i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   RELATION HELPER
========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

/* =========================================================
   PAGE
========================================================= */

export default async function LeadsPage() {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const text =
    leadsCopy[
      language
    ];

  const {
    data:
      leads,

    error,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,
        priority,
        analysis_status,
        website_score,
        opportunity_score,
        last_contacted_at,
        created_at,
        manual_sort_order,

        company:companies (
          id,
          name,
          website_url,
          industry,
          location,
          contact_form_url
        ),

        primary_contact:contacts (
          id,
          full_name,
          email
        ),

        campaign:campaigns (
          id,
          name
        )
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  const {
    data: groupOrderRows,
    error: groupOrderError,
  } = await supabase
    .from("lead_table_group_order")
    .select("group_key, sort_order")
    .order("sort_order", { ascending: true });

  if (groupOrderError) {
    console.error(
      "Could not load lead group order:",
      groupOrderError
    );
  }

  const groupOrder = Object.fromEntries(
    (groupOrderRows ?? []).map((row) => [
      row.group_key,
      Number(row.sort_order),
    ])
  ) as Record<string, number>;

  if (
    error
  ) {
    console.error(
      "Could not load leads:",
      error
    );
  }

  /* =======================================================
     MAP DATABASE DATA
  ======================================================= */

  const leadRows:
    LeadTableRow[] =
    (
      leads ??
      []
    ).map(
      (
        lead
      ) => {
        const company =
          getSingleRelation(
            lead.company
          );

        const contact =
          getSingleRelation(
            lead.primary_contact
          );

        const campaign =
          getSingleRelation(
            lead.campaign
          );

        return {
          id:
            lead.id,

          companyName:
            company?.name ??
            text.common
              .unknownCompany,

          industry:
            company?.industry ??
            null,

          location:
            company?.location ??
            null,

          websiteUrl:
            company?.website_url ??
            null,

          contactFormUrl:
            company?.contact_form_url ??
            null,

          contactEmail:
            contact?.email ??
            null,

          websiteScore:
            lead.website_score,

          opportunityScore:
            lead.opportunity_score,

          status:
            lead.status,

          priority:
            lead.priority,

          analysisStatus:
            lead.analysis_status,

          lastContactedAt:
            lead.last_contacted_at,

          createdAt:
            lead.created_at,

          sortOrder:
            lead.manual_sort_order,

          campaignId:
            campaign?.id ??
            null,

          campaignName:
            campaign?.name ??
            null,
        };
      }
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1700px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {
              text.page.eyebrow
            }
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {
              text.page.title
            }
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {
              text.page.description
            }
          </p>
        </div>

        <Link
          href="/leads/new"
          className={buttonVariants({
            className:
              "w-full gap-2 sm:w-fit",
          })}
        >
          <Plus className="size-4" />

          {
            text.page.addLead
          }
        </Link>
      </header>

      <LeadsTable
        leads={
          leadRows
        }
        groupOrder={
          groupOrder
        }
      />
    </div>
  );
}