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
import { resolveAccountCurrency } from "@/lib/account-currency";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { planAllowsFeature } from "@/lib/plan-entitlements";
import { PlanLockedWorkspace } from "@/components/plan-locked-workspace";

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

  const { data: { user } } = await supabase.auth.getUser();
  const planAccess = user ? await getLeadbasePlanAccess(user.id) : null;
  const projectManagementLocked = !planAccess || !planAllowsFeature(planAccess.planId, "project_creation");
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const storedProfile = userMetadata.leadbase_profile && typeof userMetadata.leadbase_profile === "object"
    ? userMetadata.leadbase_profile as Record<string, unknown>
    : null;
  const accountCurrency = resolveAccountCurrency({
    storedCurrency: storedProfile?.currency,
    currencyMode: storedProfile?.currencyMode,
    location: typeof storedProfile?.location === "string" ? storedProfile.location : null,
  }).currency;

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
          accountCurrency,
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

  const workspace = (
    <div className="leadbase-route-projects min-h-full">
      <WorkspacePageMotion />

      <ProjectsWorkspace
        language={
          language
        }
        projects={
          workspaceProjects
        }
        accountCurrency={accountCurrency}
      />
    </div>
  );

  if (projectManagementLocked) {
    const de = language === "de";
    return (
      <PlanLockedWorkspace
        eyebrow={de ? "Projekt-Workspace" : "Project workspace"}
        title={de ? "Dein Projekt ist bereit" : "Your project is ready"}
        description={
          workspaceProjects.length > 0
            ? de
              ? `Leadbase hat ${workspaceProjects.length === 1 ? "dein gewonnenes Projekt" : `${workspaceProjects.length} Projekte`} angelegt. Mit Starter kannst du ${workspaceProjects.length === 1 ? "es" : "sie"} öffnen, bearbeiten und verwalten.`
              : `Leadbase created ${workspaceProjects.length === 1 ? "your won project" : `${workspaceProjects.length} projects`}. Starter unlocks opening, editing and managing ${workspaceProjects.length === 1 ? "it" : "them"}.`
            : de
              ? "Sobald dein Free-Lead ein Angebot annimmt, legt Leadbase das Projekt automatisch an. Die Projektverwaltung wird mit Starter freigeschaltet."
              : "When your Free lead accepts a proposal, Leadbase creates the project automatically. Starter unlocks project management."
        }
        ctaLabel={de ? "Auf Starter upgraden" : "Upgrade to Starter"}
        badge={workspaceProjects.length > 0 ? `${workspaceProjects.length} ${workspaceProjects.length === 1 ? (de ? "Projekt" : "project") : (de ? "Projekte" : "projects")}` : (de ? "Starter+" : "Starter+")}
      >
        {workspace}
      </PlanLockedWorkspace>
    );
  }

  return workspace;
}
