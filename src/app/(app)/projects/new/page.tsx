import Link from "next/link";

import {
  ArrowLeft,
  BriefcaseBusiness,
} from "lucide-react";

import {
  createProject,
} from "../actions";

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

/* =========================================================
   TYPES
========================================================= */

type NewProjectPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

/* =========================================================
   PAGE
========================================================= */

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const [
    {
      error,
    },

    language,
  ] =
    await Promise.all([
      searchParams,
      getAppLanguage(),
    ]);

  const text =
    languageCopy[
      language
    ].projects;

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
            text.addPageTitle
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            text.addPageDescription
          }
        </p>
      </header>

      <form
        action={
          createProject
        }
        className="mt-6 space-y-4 sm:mt-8"
      >
        <Card className="shadow-none">
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
                  defaultValue="COMPLETED"
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

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {
              error
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
              text.addProjectButton
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
  type = "text",
  placeholder,
  required = false,
  min,
  step,
}: {
  name: string;

  label: string;

  type?: string;

  placeholder?: string;

  required?: boolean;

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
        placeholder={
          placeholder
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