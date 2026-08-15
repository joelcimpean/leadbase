import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Megaphone,
} from "lucide-react";

import { updateCampaignDetails } from "../../actions";

import {
  Button,
  buttonVariants,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

type EditCampaignPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditCampaignPage({
  params,
  searchParams,
}: EditCampaignPageProps) {
  const { id } = await params;
  const { error: formError } = await searchParams;

  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      target_industry,
      target_geography,
      company_size_preference,
      target_roles,
      research_criteria,
      website_criteria,
      outreach_angle,
      email_tone,
      follow_up_days,
      status
    `)
    .eq("id", id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 py-8 lg:px-10 lg:py-10">
      <Link
        href={`/campaigns/${campaign.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to campaign
      </Link>

      <header className="mt-6">
        <p className="text-sm text-muted-foreground">
          Outreach
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Edit campaign
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Update the target profile, qualification criteria
          and outreach strategy.
        </p>
      </header>

      <form
        action={updateCampaignDetails}
        className="mt-8 space-y-5"
      >
        <input
          type="hidden"
          name="campaignId"
          value={campaign.id}
        />

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
                  Target market and campaign status.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Campaign name *"
                name="name"
                defaultValue={campaign.name}
                required
              />

              <Field
                label="Target industry"
                name="targetIndustry"
                defaultValue={campaign.target_industry}
              />

              <Field
                label="Target geography"
                name="targetGeography"
                defaultValue={campaign.target_geography}
              />

              <Field
                label="Company-size preference"
                name="companySizePreference"
                defaultValue={
                  campaign.company_size_preference
                }
              />

              <Field
                label="Target roles"
                name="targetRoles"
                defaultValue={campaign.target_roles}
              />

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status
                </Label>

                <select
                  id="status"
                  name="status"
                  defaultValue={campaign.status}
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

                  <option value="ARCHIVED">
                    Archived
                  </option>
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

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Research criteria"
                name="researchCriteria"
                defaultValue={
                  campaign.research_criteria
                }
              />

              <TextAreaField
                label="Website criteria"
                name="websiteCriteria"
                defaultValue={
                  campaign.website_criteria
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Outreach
            </h2>

            <div className="mt-6 space-y-5">
              <TextAreaField
                label="Outreach angle"
                name="outreachAngle"
                defaultValue={
                  campaign.outreach_angle
                }
              />

              <TextAreaField
                label="Email tone"
                name="emailTone"
                defaultValue={campaign.email_tone}
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
                    defaultValue={
                      campaign.follow_up_days
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

        {formError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link
            href={`/campaigns/${campaign.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            Cancel
          </Link>

          <Button type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
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
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>

      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="min-h-28"
      />
    </div>
  );
}