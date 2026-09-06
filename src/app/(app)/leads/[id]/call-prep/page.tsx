import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  PhoneCall,
} from "lucide-react";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  CallPrepClient,
} from "./call-prep-client";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

/* =========================================================
   TYPES
========================================================= */

type CallPrepPageProps = {
  params:
    Promise<{
      id:
        string;
    }>;
};

type CompanyRelation = {
  name:
    string;
};

/* =========================================================
   HELPERS
========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
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

  return (
    value ??
    null
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function CallPrepPage({
  params,
}: CallPrepPageProps) {
  const [
    {
      id,
    },
    language,
  ] =
    await Promise.all([
      params,
      getAppLanguage(),
    ]);

  const supabase =
    await createClient();

  const {
    data:
      lead,
    error,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        company:companies (
          name
        )
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (
    error ||
    !lead
  ) {
    notFound();
  }

  const company =
    getSingleRelation<CompanyRelation>(
      lead.company
    );

  const companyName =
    company?.name ??
    (language ===
    "de"
      ? "Unbekanntes Unternehmen"
      : "Unknown company");

  return (
    <div className="leadbase-workspace-page mx-auto min-h-full w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <WorkspacePageMotion />
      <Link
        href={`/leads/${encodeURIComponent(
          id
        )}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {language ===
        "de"
          ? "Zurück zum Lead"
          : "Back to lead"}
      </Link>

      <header data-workspace-reveal className="leadbase-workspace-header mb-6 mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/30">
            <PhoneCall className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {language ===
              "de"
                ? "Call vorbereiten"
                : "Call prep"}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {companyName}
            </p>
          </div>
        </div>
      </header>

      <CallPrepClient
        leadId={
          id
        }
        companyName={
          companyName
        }
        language={
          language
        }
      />
    </div>
  );
}
