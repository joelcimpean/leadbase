import Link from "next/link";

import {
  ArrowLeft,
  BriefcaseBusiness,
} from "lucide-react";

import {
  createProject,
} from "../actions";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  languageCopy,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import { AccessGatePanel } from "@/components/access-gate-panel";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { planAllowsFeature } from "@/lib/plan-entitlements";

/* =========================================================
   TYPES
========================================================= */

type NewProjectPageProps = {
  searchParams: Promise<{
    error?:
      string;

    leadId?:
      string;
  }>;
};

/* =========================================================
   RELATION
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

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const [
    params,
    language,
    supabase,
  ] =
    await Promise.all([
      searchParams,
      getAppLanguage(),
      createClient(),
    ]);

  const text =
    languageCopy[
      language
    ].projects;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <AccessGatePanel
        eyebrow="Account"
        title="Sign in required"
        description="Sign in to continue."
        ctaLabel="Sign in"
        ctaHref="/login"
      />
    );
  }

  const planAccess = await getLeadbasePlanAccess(user.id);
  if (!planAllowsFeature(planAccess.planId, "project_creation")) {
    return (
      <AccessGatePanel
        eyebrow={language === "de" ? "Plan-Zugriff" : "Plan access"}
        title={language === "de" ? "Projekte sind ab Starter verfügbar" : "Project creation is available from Starter"}
        description={language === "de" ? "Gewonnene Free-Leads bekommen automatisch ein Projekt. Zum Öffnen, Bearbeiten oder manuellen Anlegen von Projekten brauchst du Starter." : "Won Free leads still get an automatic project. Starter is required to open, edit or manually create projects."}
        ctaLabel={language === "de" ? "Auf Starter upgraden" : "Upgrade to Starter"}
        ctaHref="/profile?dialog=plan"
        secondaryLabel={language === "de" ? "Zurück zu Projekten" : "Back to projects"}
        secondaryHref="/projects"
      />
    );
  }

  const leadId =
    params.leadId
      ?.trim() ??
    "";

  let clientName =
    "";

  let websiteUrl =
    "";

  if (
    leadId
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
        .select(`
          id,

          company:companies (
            id,
            name,
            website_url
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
      leadError
    ) {
      console.error(
        "Could not load lead project prefill:",
        leadError
      );
    }

    const company =
      getSingleRelation(
        lead?.company
      );

    clientName =
      company?.name ??
      "";

    websiteUrl =
      company?.website_url ??
      "";
  }

  const backHref =
    leadId
      ? `/leads/${encodeURIComponent(
          leadId
        )}`
      : "/projects";

  return (
    <div className="leadbase-workspace-page leadbase-route-form mx-auto min-h-full w-full max-w-[920px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
      <WorkspacePageMotion />
      <Link
        href={
          backHref
        }
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        {leadId
          ? language ===
              "de"
            ? "Zurück zum Lead"
            : "Back to lead"
          : text.backToProjects}
      </Link>

      <header data-workspace-reveal className="leadbase-workspace-header mt-5 p-5 sm:mt-6 sm:p-6">
        <p className="text-sm text-muted-foreground">
          {
            text.eyebrow
          }
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {
            text.addPageTitle
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {leadId
            ? language ===
                "de"
              ? "Vorhandene Kundendaten wurden aus dem Lead übernommen. Ergänze nur noch die tatsächlichen Projektdaten."
              : "Existing customer data was copied from the lead. Add only the actual project details."
            : text.addPageDescription}
        </p>
      </header>

      <form
        action={
          createProject
        }
        className="mt-6 space-y-4 sm:mt-8"
      >
        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <BriefcaseBusiness className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  {
                    text.projectInformation
                  }
                </h2>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {
                    text.createInformationDescription
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                name="clientName"
                label={`${text.client} *`}
                placeholder={
                  text.clientPlaceholder
                }
                defaultValue={
                  clientName
                }
                required
              />

              <Field
                name="projectName"
                label={`${text.project} *`}
                placeholder={
                  text.projectPlaceholder
                }
                required
              />

              <div className="sm:col-span-2">
                <Field
                  name="websiteUrl"
                  label={
                    text.website
                  }
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={
                    websiteUrl
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  {
                    text.status
                  }
                </Label>

                <select
                  id="status"
                  name="status"
                  defaultValue=""
                  required
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:h-10"
                >
                  <option
                    value=""
                    disabled
                  >
                    {language ===
                    "de"
                      ? "Status auswählen"
                      : "Select status"}
                  </option>

                  <option value="PLANNED">
                    {
                      text.statusPlanned
                    }
                  </option>

                  <option value="IN_PROGRESS">
                    {
                      text.statusInProgress
                    }
                  </option>

                  <option value="COMPLETED">
                    {
                      text.statusCompleted
                    }
                  </option>

                  <option value="CANCELLED">
                    {
                      text.statusCancelled
                    }
                  </option>
                </select>
              </div>

              <Field
                name="totalValue"
                label={
                  text.totalProjectValue
                }
                type="number"
                min="0"
                step="0.01"
                placeholder="1500"
              />

              <Field
                name="amountPaid"
                label={
                  text.alreadyPaid
                }
                type="number"
                min="0"
                step="0.01"
                placeholder="1500"
              />

              <Field
                name="startedAt"
                label={
                  text.startedLabel
                }
                type="date"
              />

              <Field
                name="completedAt"
                label={
                  text.completedLabel
                }
                type="date"
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="notes">
                {
                  text.notes
                }
              </Label>

              <Textarea
                id="notes"
                name="notes"
                placeholder={
                  text.optionalNotes
                }
                className="min-h-32 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {params.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {
              params.error
            }
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:justify-end">
          <Link
            href={
              backHref
            }
            className={buttonVariants({
              variant:
                "outline",

              className:
                "h-11 w-full sm:h-9 sm:w-auto",
            })}
          >
            {
              text.cancel
            }
          </Link>

          <PendingSubmitButton
            pendingText={
              language ===
                "de"
                ? "Wird hinzugefügt..."
                : "Adding project..."
            }
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:h-9 sm:w-auto"
          >
            {
              text.addProjectButton
            }
          </PendingSubmitButton>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  name,
  label,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
  min,
  step,
}: {
  name:
    string;

  label:
    string;

  type?:
    string;

  placeholder?:
    string;

  defaultValue?:
    string;

  required?:
    boolean;

  min?:
    string;

  step?:
    string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={name}>
        {
          label
        }
      </Label>

      <Input
        id={
          name
        }
        name={
          name
        }
        type={
          type
        }
        placeholder={
          placeholder
        }
        defaultValue={
          defaultValue
        }
        required={
          required
        }
        min={
          min
        }
        step={
          step
        }
        className="h-11 min-w-0 sm:h-10"
      />
    </div>
  );
}
