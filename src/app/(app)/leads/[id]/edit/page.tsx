import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { updateLeadDetails } from "../../actions";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default async function EditLeadPage({
  params,
  searchParams,
}: EditLeadPageProps) {
  const { id } = await params;
  const { error: formError } = await searchParams;

  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(`
      id,
      campaign_id,
      priority,
      estimated_project_value,
      notes,
      company:companies (
        id,
        name,
        website_url,
        industry,
        location,
        phone,
        description,
        contact_form_url,
        linkedin_url,
        instagram_url
      ),
      primary_contact:contacts (
        id,
        full_name,
        job_title,
        email,
        phone,
        linkedin_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const { data: campaigns, error: campaignsError } = await supabase
  .from("campaigns")
  .select(`
    id,
    name,
    status
  `)
  .neq("status", "ARCHIVED")
  .order("name", {
    ascending: true,
  });

if (campaignsError) {
  console.error("Could not load campaigns:", campaignsError);
}

  const company = getSingleRelation(lead.company);
  const contact = getSingleRelation(lead.primary_contact);

  if (!company) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 py-8 lg:px-10 lg:py-10">
      <Link
        href={`/leads/${lead.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to lead
      </Link>

      <header className="mt-6">
        <p className="text-sm text-muted-foreground">CRM</p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Edit lead
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Update company, contact and opportunity information.
        </p>
      </header>

      <form action={updateLeadDetails} className="mt-8 space-y-5">
        <input type="hidden" name="leadId" value={lead.id} />

        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border">
                <Pencil className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  Company information
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Basic information about the business.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Company name *"
                name="companyName"
                defaultValue={company.name}
                required
              />

              <Field
                label="Website"
                name="websiteUrl"
                defaultValue={company.website_url}
              />

              <Field
                label="Industry"
                name="industry"
                defaultValue={company.industry}
              />

              <Field
                label="Location"
                name="location"
                defaultValue={company.location}
              />

              <Field
                label="Company phone"
                name="companyPhone"
                defaultValue={company.phone}
              />

              <Field
                label="Contact form"
                name="contactFormUrl"
                defaultValue={company.contact_form_url}
              />

              <Field
                label="LinkedIn"
                name="companyLinkedinUrl"
                defaultValue={company.linkedin_url}
              />

              <Field
                label="Instagram"
                name="instagramUrl"
                defaultValue={company.instagram_url}
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="description">Company description</Label>

              <Textarea
                id="description"
                name="description"
                defaultValue={company.description ?? ""}
                placeholder="Short company description..."
                className="min-h-28"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">Primary contact</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Leave fields empty when the information is not known.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Contact person"
                name="contactPerson"
                defaultValue={contact?.full_name}
              />

              <Field
                label="Job title"
                name="jobTitle"
                defaultValue={contact?.job_title}
              />

              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={contact?.email}
              />

              <Field
                label="Phone"
                name="contactPhone"
                defaultValue={contact?.phone}
              />

              <Field
                label="LinkedIn"
                name="contactLinkedinUrl"
                defaultValue={contact?.linkedin_url}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              Opportunity
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
  <Label htmlFor="campaignId">
    Campaign
  </Label>

  <select
    id="campaignId"
    name="campaignId"
    defaultValue={lead.campaign_id ?? ""}
    className="flex h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  >
    <option value="">
      No campaign
    </option>

    {(campaigns ?? []).map((campaign) => (
      <option
        key={campaign.id}
        value={campaign.id}
      >
        {campaign.name}
        {campaign.status !== "ACTIVE"
          ? ` · ${campaign.status.toLowerCase()}`
          : ""}
      </option>
    ))}
  </select>
</div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>

                <select
                  id="priority"
                  name="priority"
                  defaultValue={lead.priority ?? ""}
                  className="flex h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No priority</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <Field
                label="Estimated project value"
                name="estimatedProjectValue"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  lead.estimated_project_value !== null
                    ? String(lead.estimated_project_value)
                    : ""
                }
                placeholder="e.g. 1500"
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="notes">Notes</Label>

              <Textarea
                id="notes"
                name="notes"
                defaultValue={lead.notes ?? ""}
                placeholder="Internal notes about this lead..."
                className="min-h-32"
              />
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
            href={`/leads/${lead.id}`}
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
  type = "text",
  required = false,
  placeholder,
  min,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>

      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
      />
    </div>
  );
}