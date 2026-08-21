import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  Pencil,
} from "lucide-react";

import {
  updateLeadDetails,
} from "../../actions";

import {
  Button,
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
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  leadsCopy,
} from "@/lib/leads-i18n";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
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

  return value;
}

/* =========================================================
   PAGE
========================================================= */

export default async function EditLeadPage({
  params,
  searchParams,
}: EditLeadPageProps) {
  const [
    {
      id,
    },

    {
      error:
        formError,
    },

    language,
  ] =
    await Promise.all([
      params,
      searchParams,
      getAppLanguage(),
    ]);

  const text =
    leadsCopy[
      language
    ];

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
      .eq(
        "id",
        id
      )
      .single();

  if (
    error ||
    !lead
  ) {
    notFound();
  }

  const {
    data:
      campaigns,

    error:
      campaignsError,
  } =
    await supabase
      .from(
        "campaigns"
      )
      .select(`
        id,
        name,
        status
      `)
      .neq(
        "status",
        "ARCHIVED"
      )
      .order(
        "name",
        {
          ascending:
            true,
        }
      );

  if (
    campaignsError
  ) {
    console.error(
      "Could not load campaigns:",
      campaignsError
    );
  }

  const company =
    getSingleRelation(
      lead.company
    );

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  if (
    !company
  ) {
    notFound();
  }

  function campaignStatusLabel(
    status: string
  ) {
    switch (
      status
    ) {
      case "DRAFT":
        return text.edit
          .campaignDraft;

      case "PAUSED":
        return text.edit
          .campaignPaused;

      case "ARCHIVED":
        return text.edit
          .campaignArchived;

      default:
        return text.edit
          .campaignInactive;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <Link
        href={`/leads/${lead.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        {
          text.edit
            .backToLead
        }
      </Link>

      <header className="mt-5 sm:mt-6">
        <p className="text-sm text-muted-foreground">
          CRM
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {
            text.edit.title
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            text.edit
              .description
          }
        </p>
      </header>

      <form
        action={
          updateLeadDetails
        }
        className="mt-6 space-y-4 sm:mt-8 sm:space-y-5"
      >
        <input
          type="hidden"
          name="leadId"
          value={
            lead.id
          }
        />

        <Card className="min-w-0 shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <Pencil className="size-4" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {
                    text.edit
                      .companyInformation
                  }
                </h2>

                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {
                    text.edit
                      .companyInformationDescription
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label={`${text.edit.companyName} *`}
                name="companyName"
                defaultValue={
                  company.name
                }
                required
              />

              <Field
                label={
                  text.edit.website
                }
                name="websiteUrl"
                defaultValue={
                  company.website_url
                }
              />

              <Field
                label={
                  text.edit.industry
                }
                name="industry"
                defaultValue={
                  company.industry
                }
              />

              <Field
                label={
                  text.edit.location
                }
                name="location"
                defaultValue={
                  company.location
                }
              />

              <Field
                label={
                  text.edit
                    .companyPhone
                }
                name="companyPhone"
                defaultValue={
                  company.phone
                }
              />

              <Field
                label={
                  text.edit
                    .contactForm
                }
                name="contactFormUrl"
                defaultValue={
                  company.contact_form_url
                }
              />

              <Field
                label="LinkedIn"
                name="companyLinkedinUrl"
                defaultValue={
                  company.linkedin_url
                }
              />

              <Field
                label="Instagram"
                name="instagramUrl"
                defaultValue={
                  company.instagram_url
                }
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="description">
                {
                  text.edit
                    .companyDescription
                }
              </Label>

              <Textarea
                id="description"
                name="description"
                defaultValue={
                  company.description ??
                  ""
                }
                placeholder={
                  text.edit
                    .companyDescriptionPlaceholder
                }
                className="min-h-32 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold">
              {
                text.edit
                  .primaryContact
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                text.edit
                  .primaryContactDescription
              }
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label={
                  text.edit
                    .contactPerson
                }
                name="contactPerson"
                defaultValue={
                  contact?.full_name
                }
              />

              <Field
                label={
                  text.edit
                    .jobTitle
                }
                name="jobTitle"
                defaultValue={
                  contact?.job_title
                }
              />

              <Field
                label={
                  text.edit.email
                }
                name="email"
                type="email"
                defaultValue={
                  contact?.email
                }
              />

              <Field
                label={
                  text.edit.phone
                }
                name="contactPhone"
                defaultValue={
                  contact?.phone
                }
              />

              <Field
                label="LinkedIn"
                name="contactLinkedinUrl"
                defaultValue={
                  contact?.linkedin_url
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold">
              {
                text.edit
                  .opportunity
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                text.edit
                  .opportunityDescription
              }
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="campaignId">
                  {
                    text.edit
                      .campaign
                  }
                </Label>

                <select
                  id="campaignId"
                  name="campaignId"
                  defaultValue={
                    lead.campaign_id ??
                    ""
                  }
                  className="flex h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:h-10"
                >
                  <option value="">
                    {
                      text.edit
                        .noCampaign
                    }
                  </option>

                  {(campaigns ??
                    []).map(
                    (
                      campaign
                    ) => (
                      <option
                        key={
                          campaign.id
                        }
                        value={
                          campaign.id
                        }
                      >
                        {
                          campaign.name
                        }

                        {campaign.status !==
                        "ACTIVE"
                          ? ` · ${campaignStatusLabel(
                              campaign.status
                            )}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="priority">
                  {
                    text.edit
                      .priority
                  }
                </Label>

                <select
                  id="priority"
                  name="priority"
                  defaultValue={
                    lead.priority ??
                    ""
                  }
                  className="flex h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:h-10"
                >
                  <option value="">
                    {
                      text.edit
                        .noPriority
                    }
                  </option>

                  <option value="LOW">
                    {
                      text.edit
                        .priorityLow
                    }
                  </option>

                  <option value="MEDIUM">
                    {
                      text.edit
                        .priorityMedium
                    }
                  </option>

                  <option value="HIGH">
                    {
                      text.edit
                        .priorityHigh
                    }
                  </option>
                </select>
              </div>

              <Field
                label={
                  text.edit
                    .estimatedProjectValue
                }
                name="estimatedProjectValue"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  lead.estimated_project_value !==
                  null
                    ? String(
                        lead.estimated_project_value
                      )
                    : ""
                }
                placeholder={
                  text.edit
                    .estimatedProjectValuePlaceholder
                }
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="notes">
                {
                  text.edit.notes
                }
              </Label>

              <Textarea
                id="notes"
                name="notes"
                defaultValue={
                  lead.notes ??
                  ""
                }
                placeholder={
                  text.edit
                    .notesPlaceholder
                }
                className="min-h-36 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {formError ? (
          <div className="break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {
              formError
            }
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:justify-end sm:gap-3">
          <Link
            href={`/leads/${lead.id}`}
            className={buttonVariants({
              variant:
                "outline",

              className:
                "h-11 w-full sm:h-9 sm:w-auto",
            })}
          >
            {
              text.common
                .cancel
            }
          </Link>

          <Button
            type="submit"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {
              text.common
                .saveChanges
            }
          </Button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

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

  defaultValue?:
    | string
    | null;

  type?: string;

  required?: boolean;

  placeholder?: string;

  min?: string;

  step?: string;
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
        defaultValue={
          defaultValue ??
          ""
        }
        required={
          required
        }
        placeholder={
          placeholder
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