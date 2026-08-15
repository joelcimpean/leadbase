import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";

import { createCampaign } from "../actions";
import { SubmitCampaignButton } from "./submit-button";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type NewCampaignPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 py-8 lg:px-10 lg:py-10">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to campaigns
      </Link>

      <header className="mt-6">
        <p className="text-sm text-muted-foreground">
          Outreach
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Create campaign
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Define who you want to find, what makes a good
          prospect and how outreach should be approached.
        </p>
      </header>

      <form
        action={createCampaign}
        className="mt-8 space-y-5"
      >
        <Card className="shadow-none">
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
                  Name and target market for this campaign.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Campaign name *"
                name="name"
                placeholder="e.g. Landscaping Baden-Württemberg"
                required
              />

              <Field
                label="Target industry"
                name="targetIndustry"
                placeholder="e.g. Landscaping"
              />

              <Field
                label="Target geography"
                name="targetGeography"
                placeholder="e.g. Baden-Württemberg"
              />

              <Field
                label="Company-size preference"
                name="companySizePreference"
                placeholder="e.g. 2–30 employees"
              />

              <Field
                label="Target roles"
                name="targetRoles"
                placeholder="e.g. Owner, Managing Director"
              />

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
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Qualification
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Tell Joel Leados what a promising lead looks like.
            </p>

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Research criteria"
                name="researchCriteria"
                placeholder="e.g. Active business, strong project references, established local presence..."
              />

              <TextAreaField
                label="Website criteria"
                name="websiteCriteria"
                placeholder="e.g. Older visual design, weak mobile experience, unclear CTA, projects are not presented well..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Outreach
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Define the angle AI should eventually use when
              preparing personalized outreach.
            </p>

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Outreach angle"
                name="outreachAngle"
                placeholder="e.g. Their actual work looks stronger than their current website represents..."
              />

              <TextAreaField
                label="Email tone"
                name="emailTone"
                placeholder="e.g. Short, personal, relaxed, direct, freelancer-to-business-owner..."
              />

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
                    defaultValue="5"
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

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link
            href="/campaigns"
            className={buttonVariants({
              variant: "outline",
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

function Field({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
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
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>

      <Textarea
        id={name}
        name={name}
        placeholder={placeholder}
        className="min-h-28"
      />
    </div>
  );
}