import {
  notFound,
} from "next/navigation";

import {
  CompetitorSnapshotClient,
} from "./competitor-snapshot-client";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

type CompetitorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompetitorPage({
  params,
}: CompetitorPageProps) {
  const {
    id,
  } = await params;

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
    notFound();
  }

  const {
    data: lead,
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
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    !lead
  ) {
    notFound();
  }

  const company =
    Array.isArray(
      lead.company
    )
      ? lead.company[0]
      : lead.company;

  const language =
    await getAppLanguage();

  return (
    <CompetitorSnapshotClient
      leadId={
        id
      }
      companyName={
        company?.name ??
        "Lead"
      }
      language={
        language
      }
    />
  );
}
