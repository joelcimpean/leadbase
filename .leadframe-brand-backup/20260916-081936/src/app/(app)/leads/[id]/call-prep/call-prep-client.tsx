"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  CircleHelp,
  Eye,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Target,
  UserRound,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  CreditEstimatePill,
} from "@/components/credit-estimate-pill";

/* =========================================================
   TYPES
========================================================= */

type CallPrepData = {
  summary:
    string;

  currentSituation:
    string;

  talkingPoints:
    string[];

  discoveryQuestions:
    string[];

  likelyObjections: Array<{
    objection:
      string;

    response:
      string;
  }>;

  cautionNotes:
    string[];

  nextStep:
    string;
};

type CallPrepContext = {
  companyName:
    string;

  contactName:
    string | null;

  contactJobTitle:
    string | null;

  websiteUrl:
    string | null;

  leadStatus:
    string | null;

  latestReplyClassification:
    string | null;

  latestReplyReason:
    string | null;

  preview: {
    externalSessions:
      number;

    engagedSessions:
      number;

    maxDurationSeconds:
      number;

    maxScrollPercent:
      number;

    latestSeenAt:
      string | null;
  };
};

type ApiResponse = {
  ok:
    boolean;

  found?:
    boolean;

  prep?:
    CallPrepData;

  context?:
    CallPrepContext;

  generatedAt?:
    string | null;

  error?:
    string;
};

type CallPrepClientProps = {
  leadId:
    string;

  companyName:
    string;

  language:
    "de" | "en";
};

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(
  seconds:
    number,
  language:
    "de" | "en"
) {
  if (
    seconds <= 0
  ) {
    return language ===
      "de"
      ? "—"
      : "—";
  }

  if (
    seconds < 60
  ) {
    return `${Math.round(
      seconds
    )}s`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const rest =
    Math.round(
      seconds % 60
    );

  return `${minutes}m ${rest}s`;
}

/* =========================================================
   COMPONENT
========================================================= */

export function CallPrepClient({
  leadId,
  companyName,
  language,
}: CallPrepClientProps) {
  const [prep, setPrep] =
    useState<CallPrepData | null>(
      null
    );

  const [context, setContext] =
    useState<CallPrepContext | null>(
      null
    );

  const [generatedAt, setGeneratedAt] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(
      true
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const startedRef =
    useRef(
      false
    );

  const generate =
    useCallback(
      async () => {
        setLoading(
          true
        );
        setError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/call-prep`,
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    language,
                  }),
              }
            );

          const payload =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok ||
            !payload.ok ||
            !payload.prep ||
            !payload.context
          ) {
            throw new Error(
              payload.error ||
                (language ===
                "de"
                  ? "Call-Vorbereitung konnte nicht erstellt werden."
                  : "Call preparation could not be created.")
            );
          }

          setPrep(
            payload.prep
          );
          setContext(
            payload.context
          );
          setGeneratedAt(
            payload.generatedAt ??
              null
          );
        } catch (generationError) {
          setError(
            generationError instanceof Error
              ? generationError.message
              : language ===
                "de"
              ? "Call-Vorbereitung konnte nicht erstellt werden."
              : "Call preparation could not be created."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        language,
        leadId,
      ]
    );

  const loadSavedOrGenerate =
    useCallback(
      async () => {
        setLoading(
          true
        );
        setError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/call-prep`,
              {
                method:
                  "GET",
                cache:
                  "no-store",
              }
            );

          const payload =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok ||
            !payload.ok
          ) {
            throw new Error(
              payload.error ||
                (language ===
                "de"
                  ? "Gespeicherte Call-Vorbereitung konnte nicht geladen werden."
                  : "Saved call preparation could not be loaded.")
            );
          }

          if (
            payload.found &&
            payload.prep &&
            payload.context
          ) {
            setPrep(
              payload.prep
            );
            setContext(
              payload.context
            );
            setGeneratedAt(
              payload.generatedAt ??
                null
            );
            setLoading(
              false
            );
            return;
          }

          await generate();
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : language ===
                "de"
              ? "Call-Vorbereitung konnte nicht geladen werden."
              : "Call preparation could not be loaded."
          );
          setLoading(
            false
          );
        }
      },
      [
        generate,
        language,
        leadId,
      ]
    );

  useEffect(
    () => {
      if (
        startedRef.current
      ) {
        return;
      }

      startedRef.current =
        true;

      void loadSavedOrGenerate();
    },
    [
      loadSavedOrGenerate,
    ]
  );

  if (
    loading &&
    !prep
  ) {
    return (
      <Card className="leadbase-workspace-card">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />

          <div>
            <p className="font-medium">
              {language ===
              "de"
                ? "Call wird vorbereitet …"
                : "Preparing your call …"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {language ===
              "de"
                ? "Lead, Websiteanalyse, E-Mail-Verlauf und Preview-Verhalten werden zusammengeführt."
                : "Combining the lead, website analysis, email history and preview behavior."}
            </p>

            <div className="mt-2 flex justify-center">
              <CreditEstimatePill
                feature="call_prep"
                language={language}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    error &&
    !prep
  ) {
    return (
      <Card className="leadbase-workspace-card">
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="size-6 text-destructive" />

          <div>
            <p className="font-medium">
              {language ===
              "de"
                ? "Vorbereitung fehlgeschlagen"
                : "Preparation failed"}
            </p>

            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {error}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void loadSavedOrGenerate()
            }
          >
            <RefreshCw className="size-4" />

            {language ===
            "de"
              ? "Erneut versuchen"
              : "Try again"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (
    !prep ||
    !context
  ) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="leadbase-subtle-panel flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {context.contactName ? (
            <Badge
              variant="outline"
              className="gap-1.5"
            >
              <UserRound className="size-3.5" />
              {context.contactName}
              {context.contactJobTitle
                ? ` · ${context.contactJobTitle}`
                : ""}
            </Badge>
          ) : null}

          {context.latestReplyClassification ? (
            <Badge
              variant="outline"
            >
              {context.latestReplyClassification}
            </Badge>
          ) : null}

          <Badge
            variant="outline"
            className="gap-1.5"
          >
            <Eye className="size-3.5" />
            {context.preview.externalSessions} {language ===
            "de"
              ? "Preview-Sessions"
              : "preview sessions"}
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            loading
          }
          onClick={() =>
            void generate()
          }
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}

          {language ===
          "de"
            ? "Neu erstellen"
            : "Regenerate"}

          <CreditEstimatePill
            feature="call_prep"
            language={language}
            hideOnSmall
          />
        </Button>
      </div>

      {generatedAt ? (
        <p className="text-xs text-muted-foreground">
          {language ===
          "de"
            ? `Gespeichert am ${new Date(
                generatedAt
              ).toLocaleString(
                "de-DE"
              )}`
            : `Saved ${new Date(
                generatedAt
              ).toLocaleString(
                "en-GB"
              )}`}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4 text-primary" />
              {language ===
              "de"
                ? "Kurzüberblick"
                : "Quick overview"}
            </div>

            <p className="mt-3 text-sm leading-6">
              {prep.summary}
            </p>
          </CardContent>
        </Card>

        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4 text-primary" />
              {language ===
              "de"
                ? "Aktuelle Situation"
                : "Current situation"}
            </div>

            <p className="mt-3 text-sm leading-6">
              {prep.currentSituation}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-medium">
              <MessageSquareText className="size-4" />
              {language ===
              "de"
                ? "Gesprächspunkte"
                : "Talking points"}
            </div>

            <div className="mt-4 space-y-3">
              {prep.talkingPoints.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${index}-${item}`}
                    className="flex gap-3 text-sm leading-6"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index +
                        1}
                    </span>

                    <span>
                      {item}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-medium">
              <CircleHelp className="size-4" />
              {language ===
              "de"
                ? "Gute Fragen"
                : "Discovery questions"}
            </div>

            <div className="mt-4 space-y-3">
              {prep.discoveryQuestions.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item
                    }
                    className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm leading-6"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="leadbase-workspace-card">
        <CardContent className="p-5">
          <div className="font-medium">
            {language ===
            "de"
              ? "Mögliche Einwände"
              : "Likely objections"}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {prep.likelyObjections.map(
              (
                item
              ) => (
                <div
                  key={`${item.objection}-${item.response}`}
                  className="rounded-xl border p-4"
                >
                  <p className="text-sm font-medium">
                    “{item.objection}”
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.response}
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              {language ===
              "de"
                ? "Preview-Signale"
                : "Preview signals"}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">
                  {language ===
                  "de"
                    ? "Engagierte Sessions"
                    : "Engaged sessions"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {context.preview.engagedSessions}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">
                  {language ===
                  "de"
                    ? "Max. Scrolltiefe"
                    : "Max scroll depth"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {context.preview.maxScrollPercent}%
                </p>
              </div>

              <div className="col-span-2 rounded-lg border p-3">
                <p className="text-muted-foreground">
                  {language ===
                  "de"
                    ? "Längste gemessene Session"
                    : "Longest observed session"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatDuration(
                    context.preview.maxDurationSeconds,
                    language
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="leadbase-workspace-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-medium">
              <Target className="size-4" />
              {language ===
              "de"
                ? "Ziel für diesen Call"
                : "Goal for this call"}
            </div>

            <p className="mt-3 text-sm leading-6">
              {prep.nextStep}
            </p>

            {prep.cautionNotes.length >
            0 ? (
              <div className="mt-5 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  {language ===
                  "de"
                    ? "Nicht voraussetzen"
                    : "Do not assume"}
                </div>

                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {prep.cautionNotes.map(
                    (
                      item
                    ) => (
                      <li
                        key={
                          item
                        }
                        className="flex gap-2"
                      >
                        <span aria-hidden="true">
                          ·
                        </span>
                        <span>
                          {item}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {context.latestReplyReason ? (
        <p className="text-xs text-muted-foreground">
          {language ===
          "de"
            ? "Letzte Antwort-Einschätzung: "
            : "Latest reply assessment: "}
          {context.latestReplyReason}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {language ===
        "de"
          ? `Call Prep für ${companyName} basiert nur auf den in Leadbase vorhandenen Daten.`
          : `Call prep for ${companyName} only uses data currently available in Leadbase.`}
      </p>
    </div>
  );
}
