import Link from "next/link";

import {
  ArrowLeft,
  Megaphone,
  Sparkles,
} from "lucide-react";

import {
  createCampaign,
} from "../actions";

import {
  SubmitCampaignButton,
} from "./submit-button";

import {
  IndustryAutocomplete,
} from "@/components/industry-autocomplete";

import {
  Badge,
} from "@/components/ui/badge";

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
  getCampaignIdea,
} from "@/lib/campaign-ideas";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

/* =========================================================
   TYPES
========================================================= */

type NewCampaignPageProps = {
  searchParams: Promise<{
    error?: string;
    idea?: string;
  }>;
};

/* =========================================================
   PAGE
========================================================= */

export default async function NewCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const {
    error,
    idea: ideaId,
  } = await searchParams;

  const idea =
    getCampaignIdea(
      ideaId
    );

  return (
    <div className="leadbase-workspace-page mx-auto min-h-full w-full max-w-[1080px] px-4 py-5 sm:px-6 sm:py-7 md:px-8 lg:px-10 lg:py-10">
      <WorkspacePageMotion />
      {/* ===================================================
          BACK
      =================================================== */}

      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        Back to campaigns
      </Link>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header data-workspace-reveal className="leadbase-workspace-header mt-6 p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Outreach
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Create campaign
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Define one specific
          target group Leadbase
          should research and
          contact.
        </p>
      </header>

      {/* ===================================================
          IDEA INFO
      =================================================== */}

      {idea ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Sparkles className="size-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                Campaign template:
                {" "}
                {idea.name}
              </p>

              <Badge
                variant="outline"
                className="font-normal"
              >
                {idea.fit}
              </Badge>
            </div>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              We prefilled the
              targeting and
              outreach strategy.
              Review everything and
              add the region you
              want to search.
            </p>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          FORM
      =================================================== */}

      <form
        action={createCampaign}
        className="mt-8 space-y-5"
      >
        {/* =================================================
            BASICS
        ================================================= */}

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border">
                <Megaphone className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  Campaign basics
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Define the target
                  market for this
                  campaign.
                </p>
              </div>
            </div>

            {/* =============================================
                EXPLANATION
            ============================================= */}

            <div className="mt-5 rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium">
                One campaign = one
                industry + one
                region
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Example:
                &quot;Photovoltaik
                – Karlsruhe&quot; or
                &quot;Gartenbau –
                Zollernalbkreis&quot;.
                Keep campaigns
                specific instead of
                creating one broad
                &quot;Handwerker&quot;
                campaign.
              </p>
            </div>

            {/* =============================================
                FIELDS
            ============================================= */}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {/* NAME */}

              <Field
                label="Campaign name *"
                name="name"
                placeholder="e.g. Photovoltaik – Karlsruhe"
                defaultValue={
                  idea?.name ?? ""
                }
                required
              />

              {/* INDUSTRY */}

              <div className="space-y-2">
                <Label htmlFor="targetIndustry">
                  Target industry
                </Label>

                <IndustryAutocomplete
                  id="targetIndustry"
                  name="targetIndustry"
                  defaultValue={
                    idea?.industry ??
                    ""
                  }
                  placeholder="Search e.g. Solar, Gartenbau, Friseur..."
                />

                <p className="text-xs leading-5 text-muted-foreground">
                  Choose one
                  specific type of
                  business.
                </p>
              </div>

              {/* GEOGRAPHY */}

              <Field
                label="Target geography"
                name="targetGeography"
                placeholder="e.g. Karlsruhe"
              />

              {/* SIZE */}

              <Field
                label="Company-size preference"
                name="companySizePreference"
                placeholder="e.g. 2–30 employees"
                defaultValue={
                  idea
                    ?.companySizePreference ??
                  ""
                }
              />

              {/* ROLES */}

              <Field
                label="Target roles"
                name="targetRoles"
                placeholder="e.g. Owner, Managing Director"
                defaultValue={
                  idea?.targetRoles ??
                  ""
                }
              />

              {/* STATUS */}

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status
                </Label>

                <select
                  id="status"
                  name="status"
                  defaultValue="DRAFT"
                  className="flex h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DRAFT">
                    Draft
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="PAUSED">
                    Paused
                  </option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            QUALIFICATION
        ================================================= */}

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Qualification
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Tell Leadbase what a
              promising lead looks
              like.
            </p>

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Research criteria"
                name="researchCriteria"
                placeholder="e.g. Active business, strong project references, established local presence..."
                defaultValue={
                  idea
                    ?.researchCriteria ??
                  ""
                }
              />

              <TextAreaField
                label="Website criteria"
                name="websiteCriteria"
                placeholder="e.g. Older visual design, weak mobile experience, unclear CTA..."
                defaultValue={
                  idea
                    ?.websiteCriteria ??
                  ""
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            OUTREACH
        ================================================= */}

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Outreach
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Define the angle AI
              should use when
              preparing
              personalized
              outreach.
            </p>

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Outreach angle"
                name="outreachAngle"
                placeholder="e.g. Their actual work looks stronger than their current website represents..."
                defaultValue={
                  idea
                    ?.outreachAngle ??
                  ""
                }
              />

              <TextAreaField
                label="Email tone"
                name="emailTone"
                placeholder="e.g. Short, personal, relaxed, direct..."
                defaultValue={
                  idea?.emailTone ??
                  ""
                }
              />

              {/* FOLLOW UP */}

              <div className="max-w-xs space-y-2">
                <Label htmlFor="followUpDays">
                  Follow-up after
                </Label>

                <div className="relative">
                  <Input
                    id="followUpDays"
                    name="followUpDays"
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    defaultValue={
                      idea
                        ?.followUpDays ??
                      5
                    }
                    className="pr-14"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    days
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            ERROR
        ================================================= */}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        ) : null}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex justify-end gap-3">
          <Link
            href="/campaigns"
            className={buttonVariants({
              variant:
                "outline",
            })}
          >
            Cancel
          </Link>

          <SubmitCampaignButton />
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>

      <Input
        id={name}
        name={name}
        placeholder={
          placeholder
        }
        defaultValue={
          defaultValue ?? ""
        }
        required={required}
      />
    </div>
  );
}

/* =========================================================
   TEXTAREA FIELD
========================================================= */

function TextAreaField({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>

      <Textarea
        id={name}
        name={name}
        placeholder={
          placeholder
        }
        defaultValue={
          defaultValue ?? ""
        }
        className="min-h-28"
      />
    </div>
  );
}