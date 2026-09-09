import {
  ProjectsWorkspace,
  type ProjectWorkspaceItem,
} from "./projects-workspace";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   HELPERS
========================================================= */

function projectStatusPriority(
  status: string
) {
  switch (status) {
    case "IN_PROGRESS":
      return 0;
    case "PLANNED":
      return 1;
    case "COMPLETED":
      return 2;
    case "CANCELLED":
      return 3;
    default:
      return 4;
  }
}

function projectSortTimestamp(
  project: {
    started_at:
      | string
      | null;
    completed_at:
      | string
      | null;
    created_at:
      string;
  }
) {
  const value =
    project.completed_at ??
    project.started_at ??
    project.created_at;

  const timestamp =
    new Date(
      value
    ).getTime();

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

/* =========================================================
   PAGE
========================================================= */

export default async function ProjectsPage() {
  const [
    supabase,
    language,
  ] = await Promise.all([
    createClient(),
    getAppLanguage(),
  ]);

  const {
    data:
      projects,
    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .select(`
        id,
        client_name,
        project_name,
        website_url,
        media_url,
        media_mode,
        status,
        total_value,
        amount_paid,
        currency,
        started_at,
        completed_at,
        notes,
        created_at
      `);

  if (error) {
    console.error(
      "Could not load client projects:",
      error
    );
  }

  const rows =
    [
      ...(projects ?? []),
    ].sort(
      (
        a,
        b
      ) => {
        const byStatus =
          projectStatusPriority(
            a.status
          ) -
          projectStatusPriority(
            b.status
          );

        if (
          byStatus !==
          0
        ) {
          return byStatus;
        }

        return (
          projectSortTimestamp(
            b
          ) -
          projectSortTimestamp(
            a
          )
        );
      }
    );

  const workspaceProjects:
    ProjectWorkspaceItem[] =
    rows.map(
      (
        project
      ) => ({
        id:
          project.id,
        clientName:
          project.client_name,
        projectName:
          project.project_name,
        websiteUrl:
          project.website_url,
        mediaUrl:
          project.media_url,
        mediaMode:
          project.media_mode,
        status:
          project.status,
        totalValue:
          Number(
            project.total_value ??
              0
          ),
        amountPaid:
          Number(
            project.amount_paid ??
              0
          ),
        currency:
          project.currency ||
          "EUR",
        startedAt:
          project.started_at,
        completedAt:
          project.completed_at,
        notes:
          project.notes,
        createdAt:
          project.created_at,
      })
    );

  return (
    <div className="leadbase-route-projects min-h-full">
      <WorkspacePageMotion />

      <ProjectsWorkspace
        language={
          language
        }
        projects={
          workspaceProjects
        }
      />
    </div>
  );
}
