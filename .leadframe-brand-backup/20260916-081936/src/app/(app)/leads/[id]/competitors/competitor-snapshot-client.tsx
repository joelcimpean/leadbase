"use client";

import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  CreditEstimatePill,
} from "@/components/credit-estimate-pill";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";
import { planAllowsFeature } from "@/lib/plan-entitlements";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import type {
  AppLanguage,
} from "@/lib/i18n";

type MetricKey =
  | "mobile"
  | "cta"
  | "services"
  | "projects"
  | "testimonials"
  | "trust";

type Metrics =
  Record<
    MetricKey,
    boolean | null
  >;

type Competitor = {
  placeId: string | null;
  name: string;
  address: string | null;
  websiteUrl: string;
  mapsUrl: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteScore: number | null;
  metrics: Metrics;
  analysisError: string | null;
};

type Snapshot = {
  version: 1;
  query: string;
  target: {
    name: string;
    websiteUrl: string | null;
    websiteScore: number | null;
    metrics: Metrics;
  };
  competitors: Competitor[];
  market: {
    position:
      | "ABOVE"
      | "AVERAGE"
      | "BELOW"
      | "UNKNOWN";
    competitorMedianScore: number | null;
    scoreDifference: number | null;
    strengths: string[];
    opportunities: string[];
  };
  note: string;
};

type ApiResponse = {
  ok: boolean;
  found?: boolean;
  snapshot?: Snapshot;
  generatedAt?: string | null;
  error?: string;
};

type Props = {
  leadId: string;
  companyName: string;
  language: AppLanguage;
};

const METRICS: Array<{
  key: MetricKey;
  de: string;
  en: string;
}> = [
  {
    key: "mobile",
    de: "Mobile Basis",
    en: "Mobile basics",
  },
  {
    key: "cta",
    de: "Klare CTA",
    en: "Clear CTA",
  },
  {
    key: "services",
    de: "Leistungen",
    en: "Services",
  },
  {
    key: "projects",
    de: "Referenzen",
    en: "Projects",
  },
  {
    key: "testimonials",
    de: "Bewertungen",
    en: "Testimonials",
  },
  {
    key: "trust",
    de: "Trust-Signale",
    en: "Trust signals",
  },
];

function positionCopy(
  value: Snapshot["market"]["position"],
  language: AppLanguage
) {
  if (
    value === "ABOVE"
  ) {
    return language === "de"
      ? "über Vergleichsgruppe"
      : "above comparison group";
  }

  if (
    value === "BELOW"
  ) {
    return language === "de"
      ? "unter Vergleichsgruppe"
      : "below comparison group";
  }

  if (
    value === "AVERAGE"
  ) {
    return language === "de"
      ? "im Bereich der Vergleichsgruppe"
      : "around comparison group";
  }

  return language === "de"
    ? "noch nicht belastbar"
    : "not enough data";
}

function scoreLabel(
  value: number | null
) {
  return value === null
    ? "–"
    : `${Math.round(value)}/100`;
}

function MetricValue({
  value,
}: {
  value: boolean | null;
}) {
  if (
    value === null
  ) {
    return (
      <span className="text-muted-foreground">
        –
      </span>
    );
  }

  return (
    <span
      className={
        value
          ? "font-semibold text-emerald-600 dark:text-emerald-400"
          : "font-semibold text-muted-foreground"
      }
    >
      {value
        ? "✓"
        : "–"}
    </span>
  );
}

export function CompetitorSnapshotClient({
  leadId,
  companyName,
  language,
}: Props) {
  const {
    planId,
    loading: planLoading,
  } = useLeadbasePlan();
  const canUseCompetitorResearch = planAllowsFeature(planId, "competitor_research");

  const [
    snapshot,
    setSnapshot,
  ] = useState<Snapshot | null>(
    null
  );

  const [
    generatedAt,
    setGeneratedAt,
  ] = useState<string | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    generating,
    setGenerating,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const loadSaved =
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
              )}/competitors`,
              {
                cache: "no-store",
              }
            );

          const data =
            (await response.json()) as ApiResponse;

          if (
            !response.ok ||
            !data.ok
          ) {
            throw new Error(
              data.error ??
              "Could not load market snapshot."
            );
          }

          if (
            data.found &&
            data.snapshot
          ) {
            setSnapshot(
              data.snapshot
            );
            setGeneratedAt(
              data.generatedAt ??
              null
            );
          }
        } catch (
          nextError
        ) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not load market snapshot."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        leadId,
      ]
    );

  useEffect(
    () => {
      void loadSaved();
    },
    [
      loadSaved,
    ]
  );

  const generate =
    useCallback(
      async () => {
        if (!canUseCompetitorResearch) {
          setError(
            language === "de"
              ? "Competitor Research ist ab dem Pro-Plan verfügbar."
              : "Competitor Research is available from the Pro plan."
          );
          return;
        }

        setGenerating(
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
              )}/competitors`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  language,
                }),
              }
            );

          const data =
            (await response.json()) as ApiResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.snapshot
          ) {
            throw new Error(
              data.error ??
              "Could not create market snapshot."
            );
          }

          setSnapshot(
            data.snapshot
          );
          setGeneratedAt(
            data.generatedAt ??
            new Date().toISOString()
          );
        } catch (
          nextError
        ) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not create market snapshot."
          );
        } finally {
          setGenerating(
            false
          );
        }
      },
      [
        language,
        leadId,
        canUseCompetitorResearch,
      ]
    );

  const generatedLabel =
    useMemo(
      () => {
        if (
          !generatedAt
        ) {
          return null;
        }

        try {
          return new Intl.DateTimeFormat(
            language === "de"
              ? "de-DE"
              : "en-GB",
            {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone:
                "Europe/Berlin",
            }
          ).format(
            new Date(
              generatedAt
            )
          );
        } catch {
          return generatedAt;
        }
      },
      [
        generatedAt,
        language,
      ]
    );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/leads/${encodeURIComponent(
              leadId
            )}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {language === "de"
              ? "Zurück zum Lead"
              : "Back to lead"}
          </Link>

          <div className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {language === "de"
                ? "Regionaler Marktvergleich"
                : "Regional market snapshot"}
            </h1>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {language === "de"
              ? `Interner Vergleich für ${companyName}. Leadbase betrachtet eine kleine Auswahl öffentlich auffindbarer regionaler Wettbewerber – kein vollständiges Markt-Ranking.`
              : `Internal comparison for ${companyName}. Leadbase reviews a small sample of publicly discoverable regional competitors — not a complete market ranking.`}
          </p>
        </div>

        {snapshot ? (
          <Button
            type="button"
            variant="outline"
            disabled={
              generating ||
              planLoading ||
              !canUseCompetitorResearch
            }
            title={!canUseCompetitorResearch ? (language === "de" ? "Ab Pro" : "Pro+") : undefined}
            onClick={() =>
              void generate()
            }
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {language === "de"
              ? "Neu analysieren"
              : "Refresh snapshot"}

            {!generating ? (
              <CreditEstimatePill
                feature="competitor_research"
                language={language}
                hideOnSmall
              />
            ) : null}
          </Button>
        ) : null}
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {language === "de"
              ? "Gespeicherten Marktvergleich laden …"
              : "Loading saved market snapshot …"}
          </CardContent>
        </Card>
      ) : null}

      {!loading &&
      !snapshot ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {language === "de"
                ? "Noch kein Marktvergleich"
                : "No market snapshot yet"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {language === "de"
                ? "Leadbase sucht passende Unternehmen in Branche und Region, analysiert bis zu drei öffentliche Websites und stellt die wichtigsten Unterschiede neutral gegenüber."
                : "Leadbase finds relevant companies in the same industry and region, analyzes up to three public websites and neutrally compares the key differences."}
            </p>
            <Button
              type="button"
              disabled={
                generating ||
                planLoading ||
                !canUseCompetitorResearch
              }
              title={!canUseCompetitorResearch ? (language === "de" ? "Ab Pro" : "Pro+") : undefined}
              onClick={() =>
                void generate()
              }
              className="mt-5 gap-2"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BarChart3 className="size-4" />
              )}
              {generating
                ? language === "de"
                  ? "Markt wird analysiert …"
                  : "Analyzing market …"
                : language === "de"
                  ? "Marktvergleich erstellen"
                  : "Create market snapshot"}

              {!generating ? (
                <CreditEstimatePill
                  feature="competitor_research"
                  language={language}
                  hideOnSmall
                />
              ) : null}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {language === "de"
                    ? "Marktposition"
                    : "Market position"}
                </p>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                  {snapshot.market.position === "ABOVE" ? (
                    <TrendingUp className="size-5 text-emerald-600" />
                  ) : snapshot.market.position === "BELOW" ? (
                    <TrendingDown className="size-5 text-amber-600" />
                  ) : (
                    <ShieldCheck className="size-5 text-muted-foreground" />
                  )}
                  {positionCopy(
                    snapshot.market.position,
                    language
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {language === "de"
                    ? "Nur relativ zu den hier analysierten Websites."
                    : "Only relative to the websites analyzed here."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {companyName}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {scoreLabel(
                    snapshot.target.websiteScore
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {language === "de"
                    ? "Website Score"
                    : "Website score"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {language === "de"
                    ? "Vergleichsgruppe"
                    : "Comparison group"}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {scoreLabel(
                    snapshot.market.competitorMedianScore
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {language === "de"
                    ? `Median aus ${snapshot.competitors.length} Websites`
                    : `Median across ${snapshot.competitors.length} websites`}
                </p>
              </CardContent>
            </Card>
          </div>

          {(snapshot.market.strengths.length > 0 ||
            snapshot.market.opportunities.length > 0) ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="py-5">
                  <h2 className="font-semibold">
                    {language === "de"
                      ? "Was bereits gut sichtbar ist"
                      : "What is already visible"}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {snapshot.market.strengths.length > 0
                      ? snapshot.market.strengths.map(
                          (item) => (
                            <Badge
                              key={item}
                              variant="outline"
                            >
                              {item}
                            </Badge>
                          )
                        )
                      : (
                        <span className="text-sm text-muted-foreground">
                          {language === "de"
                            ? "Keine eindeutige Stärke aus dieser kleinen Stichprobe ableitbar."
                            : "No clear advantage can be inferred from this small sample."}
                        </span>
                      )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-5">
                  <h2 className="font-semibold">
                    {language === "de"
                      ? "Mögliche Chancen"
                      : "Potential opportunities"}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {snapshot.market.opportunities.length > 0
                      ? snapshot.market.opportunities.map(
                          (item) => (
                            <Badge
                              key={item}
                              variant="outline"
                            >
                              {item}
                            </Badge>
                          )
                        )
                      : (
                        <span className="text-sm text-muted-foreground">
                          {language === "de"
                            ? "In dieser Stichprobe gibt es keinen klaren strukturellen Rückstand."
                            : "No clear structural gap in this sample."}
                        </span>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        {language === "de"
                          ? "Website"
                          : "Website"}
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        Score
                      </th>
                      {METRICS.map(
                        (metric) => (
                          <th
                            key={metric.key}
                            className="px-3 py-3 text-center font-medium"
                          >
                            {language === "de"
                              ? metric.de
                              : metric.en}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-primary/[0.035]">
                      <td className="px-4 py-3 font-semibold">
                        {snapshot.target.name}
                        <div className="text-xs font-normal text-muted-foreground">
                          {language === "de"
                            ? "Dieser Lead"
                            : "This lead"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {scoreLabel(
                          snapshot.target.websiteScore
                        )}
                      </td>
                      {METRICS.map(
                        (metric) => (
                          <td
                            key={metric.key}
                            className="px-3 py-3 text-center"
                          >
                            <MetricValue
                              value={
                                snapshot.target.metrics[
                                  metric.key
                                ]
                              }
                            />
                          </td>
                        )
                      )}
                    </tr>

                    {snapshot.competitors.map(
                      (competitor) => (
                        <tr
                          key={`${competitor.placeId ?? competitor.websiteUrl}`}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {competitor.name}
                                </p>
                                {competitor.address ? (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {competitor.address}
                                  </p>
                                ) : null}
                                {competitor.analysisError ? (
                                  <p className="mt-1 text-xs text-amber-600">
                                    {language === "de"
                                      ? "Website konnte nur teilweise analysiert werden."
                                      : "Website could only be partially analyzed."}
                                  </p>
                                ) : null}
                              </div>
                              <a
                                href={competitor.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-muted-foreground transition hover:text-foreground"
                                aria-label={
                                  language === "de"
                                    ? `${competitor.name} öffnen`
                                    : `Open ${competitor.name}`
                                }
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {scoreLabel(
                              competitor.websiteScore
                            )}
                          </td>
                          {METRICS.map(
                            (metric) => (
                              <td
                                key={metric.key}
                                className="px-3 py-3 text-center"
                              >
                                <MetricValue
                                  value={
                                    competitor.metrics[
                                      metric.key
                                    ]
                                  }
                                />
                              </td>
                            )
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-xs leading-5 text-muted-foreground">
            {snapshot.note}
            {generatedLabel
              ? ` · ${language === "de" ? "Erstellt" : "Generated"}: ${generatedLabel}`
              : ""}
          </div>
        </>
      ) : null}
    </div>
  );
}
