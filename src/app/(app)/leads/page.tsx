import Link from "next/link";
import { Plus } from "lucide-react";

import {
  LeadsTable,
  type LeadTableRow,
} from "./leads-table";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      priority,
      website_score,
      opportunity_score,
      last_contacted_at,
      created_at,
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
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Could not load leads:", error);
  }

  const leadRows: LeadTableRow[] = (leads ?? []).map((lead) => {
    const company = getSingleRelation(lead.company);
    const contact = getSingleRelation(lead.primary_contact);

    return {
      id: lead.id,

      companyName:
        company?.name ?? "Unknown company",

      industry:
        company?.industry ?? null,

      location:
        company?.location ?? null,

      websiteUrl:
        company?.website_url ?? null,

      contactFormUrl:
        company?.contact_form_url ?? null,

      contactEmail:
        contact?.email ?? null,

      websiteScore:
        lead.website_score,

      opportunityScore:
        lead.opportunity_score,

      status:
        lead.status,

      priority:
        lead.priority,

      lastContactedAt:
        lead.last_contacted_at,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1700px] px-8 py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            CRM
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Leads
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review companies, track outreach and see what
            needs your attention next.
          </p>
        </div>

        <Link
          href="/leads/new"
          className={buttonVariants({
            className: "w-fit gap-2",
          })}
        >
          <Plus className="size-4" />
          Add lead
        </Link>
      </header>

      <LeadsTable leads={leadRows} />
    </div>
  );
}