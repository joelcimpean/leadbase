import Link from "next/link";

import {
  Clock3,
  ExternalLink,
  Globe2,
  MapPin,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import {
  AiLeadSearchChat,
} from "./ai-lead-search-chat";

import {
  CandidateActions,
} from "./candidate-actions-buttons";

import {
  FindLeadsSearchForm,
  type FindLeadsCampaign,
} from "./search-form";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  acquisitionCopy,
  getPlaceTypeLabel,
  getSearchStatusLabel,
} from "@/lib/acquisition-i18n";

import {
  type AppLanguage,
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

type FindLeadsPageProps = {
  searchParams: Promise<{
    search?: string;

    error?: string;
  }>;
};

/* =========================================================
   STATUS
========================================================= */

function statusClass(
  status: string
) {
  switch (
    status
  ) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "RUNNING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  date: string,
  language:
    AppLanguage
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      date
    )
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function FindLeadsPage({
  searchParams,
}: FindLeadsPageProps) {
  const {
    search:
      selectedSearchId,

    error:
      pageError,
  } =
    await searchParams;

  const language =
    await getAppLanguage();

  const text =
    acquisitionCopy[
      language
    ].findLeads;

  const supabase =
    await createClient();

  /* =======================================================
     CAMPAIGNS
  ======================================================= */

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
        target_industry,
        target_geography,
        status
      `)
      .neq(
        "status",
        "ARCHIVED"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
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

  /* =======================================================
     RECENT SEARCHES
  ======================================================= */

  const {
    data:
      searches,

    error:
      searchesError,
  } =
    await supabase
      .from(
        "lead_searches"
      )
      .select(`
        id,
        query,
        industry,
        location,
        result_limit,
        result_count,
        status,
        error_message,
        created_at,

        campaign:campaigns (
          id,
          name
        )
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        8
      );

  if (
    searchesError
  ) {
    console.error(
      "Could not load lead searches:",
      searchesError
    );
  }

  const campaignRows =
    (
      campaigns ??
      []
    ) as FindLeadsCampaign[];

  const searchRows =
    searches ??
    [];

  /* =======================================================
     ACTIVE SEARCH
  ======================================================= */

  const activeSearchId =
    selectedSearchId ??
    searchRows.find(
      (
        search
      ) =>
        search.status ===
        "COMPLETED"
    )?.id ??
    null;

  /* =======================================================
     CANDIDATES
  ======================================================= */

  let candidates:
    {
      id: string;

      name: string;

      website_url:
        | string
        | null;

      phone:
        | string
        | null;

      formatted_address:
        | string
        | null;

      maps_url:
        | string
        | null;

      rating:
        | number
        | null;

      review_count:
        | number
        | null;

      primary_type:
        | string
        | null;

      status:
        string;
    }[] = [];

  if (
    activeSearchId
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "lead_candidates"
        )
        .select(`
          id,
          name,
          website_url,
          phone,
          formatted_address,
          maps_url,
          rating,
          review_count,
          primary_type,
          status
        `)
        .eq(
          "search_id",
          activeSearchId
        )
        .eq(
          "status",
          "DISCOVERED"
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      error
    ) {
      console.error(
        "Could not load candidates:",
        error
      );
    }

    candidates =
      data ??
      [];
  }

  const activeSearch =
    searchRows.find(
      (
        search
      ) =>
        search.id ===
        activeSearchId
    ) ??
    null;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header>
        <p className="text-sm text-muted-foreground">
          {
            text.eyebrow
          }
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {
            text.title
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            text.description
          }
        </p>
      </header>

      {/* ===================================================
          ERROR
      =================================================== */}

      {pageError ? (
        <div className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mt-6 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {
            pageError
          }
        </div>
      ) : null}

      {/* ===================================================
          AI LEAD SEARCH
      =================================================== */}

      {campaignRows.length ===
      0 ? (
        <Card className="mt-6 min-w-0 border-dashed shadow-none md:mt-8">
          <CardContent className="px-4 py-10 text-center sm:px-6">
            <Sparkles className="mx-auto size-5 text-muted-foreground" />

            <p className="mt-3 text-sm font-medium">
              {
                text.createCampaignFirst
              }
            </p>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              {
                text.createCampaignFirstDescription
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <AiLeadSearchChat
          campaigns={
            campaignRows
          }
        />
      )}

      {/* ===================================================
          RESULTS

          Intentionally directly below the AI chat.
      =================================================== */}

      {activeSearch ? (
        <section className="mt-7 md:mt-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {
                  text.results
                }
              </p>

              <h2 className="mt-1 break-words text-xl font-semibold tracking-tight">
                {
                  activeSearch.query
                }
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  candidates.length
                }{" "}
                {candidates.length ===
                1
                  ? text.companyWaiting
                  : text.companiesWaiting}
              </p>
            </div>

            <Badge
              variant="outline"
              className={`w-fit shrink-0 ${statusClass(
                activeSearch.status
              )}`}
            >
              {getSearchStatusLabel(
                activeSearch.status,
                language
              )}
            </Badge>
          </div>

          {candidates.length ===
          0 ? (
            <Card className="mt-4 border-dashed shadow-none">
              <CardContent className="flex min-h-40 items-center justify-center p-5 text-center sm:p-6">
                <div>
                  <p className="text-sm font-medium">
                    {
                      text.reviewComplete
                    }
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {
                      text.reviewCompleteDescription
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {candidates.map(
                (
                  candidate
                ) => {
                  const placeType =
                    getPlaceTypeLabel(
                      candidate.primary_type,
                      language
                    );

                  return (
                    <Card
                      key={
                        candidate.id
                      }
                      className="min-w-0 shadow-none"
                    >
                      <CardContent className="p-4 sm:p-5">
                        {/* =================================
                            TOP
                        ================================= */}

                        <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-semibold sm:text-base">
                              {
                                candidate.name
                              }
                            </h3>

                            {placeType ? (
                              <p className="mt-1 break-words text-xs text-muted-foreground">
                                {
                                  placeType
                                }
                              </p>
                            ) : null}
                          </div>

                          {candidate.rating !==
                          null ? (
                            <div className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-sm">
                              <Star className="size-3.5" />

                              <span className="font-medium">
                                {
                                  candidate.rating
                                }
                              </span>

                              {candidate.review_count !==
                              null ? (
                                <span className="hidden text-xs text-muted-foreground min-[390px]:inline">
                                  (
                                  {
                                    candidate.review_count
                                  }
                                  )
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {/* =================================
                            ADDRESS
                        ================================= */}

                        {candidate.formatted_address ? (
                          <div className="mt-4 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 size-4 shrink-0" />

                            <span className="break-words leading-6">
                              {
                                candidate.formatted_address
                              }
                            </span>
                          </div>
                        ) : null}

                        {/* =================================
                            PHONE
                        ================================= */}

                        {candidate.phone ? (
                          <div className="mt-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {
                                text.phone
                              }
                            </p>

                            <a
                              href={`tel:${candidate.phone}`}
                              className="mt-1 block w-fit break-all text-sm font-medium transition-colors hover:text-muted-foreground"
                            >
                              {
                                candidate.phone
                              }
                            </a>
                          </div>
                        ) : null}

                        {/* =================================
                            LINKS
                        ================================= */}

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          {candidate.website_url ? (
                            <a
                              href={
                                candidate.website_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hover:bg-muted sm:h-8 sm:w-auto"
                            >
                              <Globe2 className="size-3.5 shrink-0" />

                              <span className="truncate">
                                {
                                  text.website
                                }
                              </span>

                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="inline-flex h-10 items-center justify-center rounded-lg border px-2.5 text-xs text-muted-foreground sm:h-8">
                              {
                                text.noWebsite
                              }
                            </span>
                          )}

                          {candidate.maps_url ? (
                            <a
                              href={
                                candidate.maps_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hover:bg-muted sm:h-8 sm:w-auto"
                            >
                              <MapPin className="size-3.5 shrink-0" />

                              <span className="truncate">
                                Google Maps
                              </span>

                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          ) : null}
                        </div>

                        {/* =================================
                            ACTIONS
                        ================================= */}

                        <CandidateActions
                          candidateId={
                            candidate.id
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          )}
        </section>
      ) : null}

      {/* ===================================================
          MANUAL SEARCH
      =================================================== */}

      <Card className="mt-8 min-w-0 shadow-none md:mt-10">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Search className="size-4" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {
                  text.leadSearch
                }
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  text.leadSearchDescription
                }
              </p>
            </div>
          </div>

          {campaignRows.length ===
          0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-4 py-8 text-center sm:px-6 sm:py-10">
              <Sparkles className="mx-auto size-5 text-muted-foreground" />

              <p className="mt-3 text-sm font-medium">
                {
                  text.createCampaignFirst
                }
              </p>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {
                  text.createCampaignFirstDescription
                }
              </p>
            </div>
          ) : (
            <div className="mt-6 md:mt-7">
              <FindLeadsSearchForm
                campaigns={
                  campaignRows
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================
          RECENT SEARCHES
      =================================================== */}

      <section className="mt-8 md:mt-10">
        <div>
          <h2 className="text-sm font-semibold">
            {
              text.recentSearches
            }
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {
              text.recentSearchesDescription
            }
          </p>
        </div>

        {searchRows.length ===
        0 ? (
          <Card className="mt-4 border-dashed shadow-none">
            <CardContent className="flex min-h-44 items-center justify-center p-5 sm:p-6">
              <div className="text-center">
                <div className="mx-auto flex size-9 items-center justify-center rounded-lg border">
                  <Clock3 className="size-4 text-muted-foreground" />
                </div>

                <p className="mt-4 text-sm font-medium">
                  {
                    text.noSearches
                  }
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    text.noSearchesDescription
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border">
            {searchRows.map(
              (
                search,
                index
              ) => {
                const campaign =
                  Array.isArray(
                    search.campaign
                  )
                    ? search.campaign[0]
                    : search.campaign;

                return (
                  <Link
                    key={
                      search.id
                    }
                    href={`/find-leads?search=${search.id}`}
                    className={`block px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5 ${
                      index !==
                      searchRows.length -
                        1
                        ? "border-b"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">
                          {
                            search.query
                          }
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                          {campaign?.name ??
                            text.noCampaign}

                          {" · "}

                          {formatDate(
                            search.created_at,
                            language
                          )}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={`shrink-0 ${statusClass(
                          search.status
                        )}`}
                      >
                        {getSearchStatusLabel(
                          search.status,
                          language
                        )}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border sm:mt-0 sm:float-right sm:ml-6 sm:w-48 sm:border-0">
                      <div className="border-r px-3 py-2.5 sm:px-2 sm:py-0">
                        <p className="text-[11px] text-muted-foreground">
                          {
                            text.resultCount
                          }
                        </p>

                        <p className="mt-0.5 text-sm font-medium">
                          {
                            search.result_count
                          }
                        </p>
                      </div>

                      <div className="px-3 py-2.5 sm:px-2 sm:py-0">
                        <p className="text-[11px] text-muted-foreground">
                          {
                            text.limit
                          }
                        </p>

                        <p className="mt-0.5 text-sm font-medium">
                          {
                            search.result_limit
                          }
                        </p>
                      </div>
                    </div>

                    <div className="clear-both" />
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}