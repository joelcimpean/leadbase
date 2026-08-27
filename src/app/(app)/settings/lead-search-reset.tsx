"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

type ResetResponse = {
  ok?:
    boolean;

  error?:
    string;

  deletedCandidates?:
    number;

  deletedSearches?:
    number;

  releasedCompanies?:
    number;
};

/* =========================================================
   COPY
========================================================= */

const copy = {
  de: {
    button:
      "Lead-Suche zurücksetzen",

    warningTitle:
      "Suchhistorie wirklich löschen?",

    warning:
      "Dadurch werden alle bisherigen Find-Leads-Suchläufe und Suchkandidaten gelöscht. Deine bestehenden CRM-Leads bleiben erhalten.",

    confirmationLabel:
      "Zum Bestätigen RESET eingeben",

    confirmationPlaceholder:
      "RESET",

    cancel:
      "Abbrechen",

    confirm:
      "Jetzt zurücksetzen",

    resetting:
      "Wird zurückgesetzt...",

    success:
      "Lead-Suche wurde zurückgesetzt.",

    candidates:
      "Kandidaten gelöscht",

    searches:
      "Suchläufe gelöscht",

    companies:
      "alte Firmen-Sperren gelöst",

    failed:
      "Die Lead-Suche konnte nicht zurückgesetzt werden.",
  },

  en: {
    button:
      "Reset lead discovery",

    warningTitle:
      "Delete discovery history?",

    warning:
      "This deletes all previous Find Leads searches and search candidates. Existing CRM leads are kept.",

    confirmationLabel:
      "Type RESET to confirm",

    confirmationPlaceholder:
      "RESET",

    cancel:
      "Cancel",

    confirm:
      "Reset now",

    resetting:
      "Resetting...",

    success:
      "Lead discovery was reset.",

    candidates:
      "candidates deleted",

    searches:
      "searches deleted",

    companies:
      "old company blocks released",

    failed:
      "Lead discovery could not be reset.",
  },
} as const;

/* =========================================================
   COMPONENT
========================================================= */

export function LeadSearchReset() {
  const {
    language,
  } =
    useLanguage();

  const router =
    useRouter();

  const text =
    copy[
      language
    ];

  const [
    confirmationOpen,
    setConfirmationOpen,
  ] =
    useState(
      false
    );

  const [
    confirmation,
    setConfirmation,
  ] =
    useState(
      ""
    );

  const [
    resetting,
    setResetting,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<{
      candidates:
        number;

      searches:
        number;

      companies:
        number;
    } | null>(
      null
    );

  /* =======================================================
     RESET
  ======================================================= */

  async function resetLeadDiscovery() {
    if (
      resetting ||
      confirmation !==
        "RESET"
    ) {
      return;
    }

    setResetting(
      true
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    try {
      const response =
        await fetch(
          "/api/settings/reset-lead-search",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          text.failed
        );
      }

      const result =
        (await response.json()) as
          ResetResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          text.failed
        );
      }

      /*
       * AI lead-search conversations are stored locally
       * in the browser. A reset should also clear these so
       * the next search really starts completely fresh.
       */
      window.localStorage.removeItem(
        "leadbase:ai-lead-search-chat:v1"
      );

      setSuccess({
        candidates:
          result.deletedCandidates ??
          0,

        searches:
          result.deletedSearches ??
          0,

        companies:
          result.releasedCompanies ??
          0,
      });

      setConfirmation(
        ""
      );

      setConfirmationOpen(
        false
      );

      router.refresh();
    } catch (
      resetError
    ) {
      console.error(
        "Could not reset lead discovery:",
        resetError
      );

      setError(
        resetError instanceof
          Error
          ? resetError.message
          : text.failed
      );
    } finally {
      setResetting(
        false
      );
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-w-0">
      {!confirmationOpen ? (
        <button
          type="button"
          onClick={() => {
            setConfirmationOpen(
              true
            );

            setConfirmation(
              ""
            );

            setError(
              null
            );

            setSuccess(
              null
            );
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 sm:h-9 sm:w-auto dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          <RotateCcw className="size-4" />

          {
            text.button
          }
        </button>
      ) : (
        <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
              <AlertTriangle className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                {
                  text.warningTitle
                }
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700/80 dark:text-red-300/75">
                {
                  text.warning
                }
              </p>

              <label
                htmlFor="lead-search-reset-confirmation"
                className="mt-4 block text-xs font-medium text-red-800 dark:text-red-200"
              >
                {
                  text.confirmationLabel
                }
              </label>

              <input
                id="lead-search-reset-confirmation"
                type="text"
                value={
                  confirmation
                }
                onChange={
                  (
                    event
                  ) =>
                    setConfirmation(
                      event.target.value
                    )
                }
                placeholder={
                  text.confirmationPlaceholder
                }
                autoComplete="off"
                spellCheck={
                  false
                }
                className="mt-2 h-10 w-full rounded-lg border border-red-200 bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-red-400 dark:border-red-900/60"
              />

              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    resetting
                  }
                  onClick={() => {
                    setConfirmationOpen(
                      false
                    );

                    setConfirmation(
                      ""
                    );
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 sm:h-9"
                >
                  {
                    text.cancel
                  }
                </button>

                <button
                  type="button"
                  disabled={
                    resetting ||
                    confirmation !==
                      "RESET"
                  }
                  onClick={() =>
                    void resetLeadDiscovery()
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9"
                >
                  {resetting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}

                  {resetting
                    ? text.resetting
                    : text.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success ? (
        <div className="mt-3 flex max-w-2xl items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />

          <p className="text-xs leading-5">
            {
              text.success
            }{" "}
            {success.candidates}{" "}
            {
              text.candidates
            },{" "}
            {success.searches}{" "}
            {
              text.searches
            },{" "}
            {success.companies}{" "}
            {
              text.companies
            }.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {
            error
          }
        </p>
      ) : null}
    </div>
  );
}