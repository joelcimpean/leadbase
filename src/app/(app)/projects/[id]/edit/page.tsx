import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  Pencil,
} from "lucide-react";

import {
  updateProject,
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
  languageCopy,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type EditProjectPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

/* =========================================================
   PAGE
========================================================= */

export default async function EditProjectPage({
  params,
  searchParams,
}: EditProjectPageProps) {
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
    languageCopy[
      language
    ].projects;

  const supabase =
    await createClient();

  const {
    data:
      project,

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
        status,
        total_value,
        amount_paid,
        started_at,
        completed_at,
        notes
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (
    error ||
    !project
  ) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[850px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        {
          text.backToProjects
        }
      </Link>

      <header className="mt-5 sm:mt-6">
        <p className="text-sm text-muted-foreground">
          {
            text.eyebrow
          }
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {
            text.editPageTitle
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            text.editPageDescription
          }
        </p>
      </header>

      <form
        action={
          updateProject
        }
        className="mt-6 space-y-4 sm:mt-8"
      >
        <input
          type="hidden"
          name="projectId"
          value={
            project.id
          }
        />

        <Card className="shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <Pencil className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  {
                    text.projectInformation
                  }
                </h2>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {
                    text.editInformationDescription
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                name="clientName"
                label={`${text.client} *`}
                defaultValue={
                  project.client_name
                }
                required
              />

              <Field
                name="projectName"
                label={`${text.project} *`}
                defaultValue={
                  project.project_name
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
                  defaultValue={
                    project.website_url
                  }
                  placeholder="https://example.com"
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
                  defaultValue={
                    project.status
                  }
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:h-10"
                >
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
                defaultValue={
                  String(
                    project.total_value
                  )
                }
              />

              <Field
                name="amountPaid"
                label={
                  text.alreadyPaid
                }
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  String(
                    project.amount_paid
                  )
                }
              />

              <Field
                name="startedAt"
                label={
                  text.startedLabel
                }
                type="date"
                defaultValue={
                  project.started_at
                }
              />

              <Field
                name="completedAt"
                label={
                  text.completedLabel
                }
                type="date"
                defaultValue={
                  project.completed_at
                }
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
                defaultValue={
                  project.notes ??
                    ""
                }
                placeholder={
                  text.optionalNotes
                }
                className="min-h-32 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {formError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {
              formError
            }
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:justify-end">
          <Link
            href="/projects"
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

          <Button
            type="submit"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {
              text.saveChanges
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
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
  min,
  step,
}: {
  name: string;

  label: string;

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