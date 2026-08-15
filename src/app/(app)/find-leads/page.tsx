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
  createClient,
} from "@/lib/supabase/server";

type FindLeadsPageProps = {
  searchParams: Promise<{
    search?: string;
    error?: string;
  }>;
};

function statusClass(
  status: string
) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "RUNNING":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

function statusLabel(
  status: string
) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(date)
  );
}

export default async function FindLeadsPage({
  searchParams,
}: FindLeadsPageProps) {
  const {
    search: selectedSearchId,
    error: pageError,
  } = await searchParams;

  const supabase =
    await createClient();

  /* =========================================================
     CAMPAIGNS
  ========================================================= */

  const {
    data: campaigns,
    error: campaignsError,
  } = await supabase
    .from("campaigns")
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
        ascending: false,
      }
    );

  if (campaignsError) {
    console.error(
      "Could not load campaigns:",
      campaignsError
    );
  }

  /* =========================================================
     RECENT SEARCHES
  ========================================================= */

  const {
    data: searches,
    error: searchesError,
  } = await supabase
    .from("lead_searches")
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
        ascending: false,
      }
    )
    .limit(8);

  if (searchesError) {
    console.error(
      "Could not load lead searches:",
      searchesError
    );
  }

  const campaignRows =
    (campaigns ??
      []) as FindLeadsCampaign[];

  const searchRows =
    searches ?? [];

  /* =========================================================
     ACTIVE SEARCH
  ========================================================= */

  const activeSearchId =
    selectedSearchId ??
    searchRows.find(
      (search) =>
        search.status ===
        "COMPLETED"
    )?.id ??
    null;

  /* =========================================================
     CANDIDATES

     Only DISCOVERED candidates are shown.
     SAVED + REJECTED disappear from the review queue.
  ========================================================= */

  let candidates:
    | {
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

        status: string;
      }[] = [];

  if (activeSearchId) {
    const {
      data,
      error,
    } = await supabase
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
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Could not load candidates:",
        error
      );
    }

    candidates =
      data ?? [];
  }

  const activeSearch =
    searchRows.find(
      (search) =>
        search.id ===
        activeSearchId
    ) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8 lg:px-10 lg:py-10">
      {/* HEADER */}

      <header>
        <p className="text-sm text-muted-foreground">
          Discovery
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Find Leads
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Find companies that
          match one of your
          campaigns and review
          them before adding them
          to your CRM.
        </p>
      </header>

      {/* ERROR */}

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {/* SEARCH */}

      <Card className="mt-8 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Search className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Lead search
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Choose a campaign
                and adjust the search
                criteria if needed.
              </p>
            </div>
          </div>

          {campaignRows.length ===
          0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-6 py-10 text-center">
              <Sparkles className="mx-auto size-5 text-muted-foreground" />

              <p className="mt-3 text-sm font-medium">
                Create a campaign
                first
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Find Leads uses your
                campaign to
                understand which
                companies you are
                looking for.
              </p>
            </div>
          ) : (
            <div className="mt-7">
              <FindLeadsSearchForm
                campaigns={
                  campaignRows
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* RESULTS */}

      {activeSearch ? (
        <div className="mt-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-muted-foreground">
                Results
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {
                  activeSearch.query
                }
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {
                  candidates.length
                }{" "}
                {candidates.length ===
                1
                  ? "company waiting for review"
                  : "companies waiting for review"}
              </p>
            </div>

            <Badge
              variant="outline"
              className={statusClass(
                activeSearch.status
              )}
            >
              {statusLabel(
                activeSearch.status
              )}
            </Badge>
          </div>

          {candidates.length ===
          0 ? (
            <Card className="mt-4 border-dashed shadow-none">
              <CardContent className="flex min-h-40 items-center justify-center p-6 text-center">
                <div>
                  <p className="text-sm font-medium">
                    Review complete
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    All companies
                    from this search
                    were saved or
                    rejected.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {candidates.map(
                (candidate) => (
                  <Card
                    key={
                      candidate.id
                    }
                    className="shadow-none"
                  >
                    <CardContent className="p-5">
                      {/* TOP */}

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            {
                              candidate.name
                            }
                          </h3>

                          {candidate.primary_type ? (
                            <p className="mt-1 text-xs capitalize text-muted-foreground">
                              {candidate.primary_type.replaceAll(
                                "_",
                                " "
                              )}
                            </p>
                          ) : null}
                        </div>

                        {candidate.rating !==
                        null ? (
                          <div className="flex shrink-0 items-center gap-1 text-sm">
                            <Star className="size-3.5" />

                            <span className="font-medium">
                              {
                                candidate.rating
                              }
                            </span>

                            {candidate.review_count !==
                            null ? (
                              <span className="text-xs text-muted-foreground">
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

                      {/* ADDRESS */}

                      {candidate.formatted_address ? (
                        <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 size-4 shrink-0" />

                          <span>
                            {
                              candidate.formatted_address
                            }
                          </span>
                        </div>
                      ) : null}

                      {/* LINKS */}

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {candidate.website_url ? (
                          <a
                            href={
                              candidate.website_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            <Globe2 className="size-3.5" />

                            Website

                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="inline-flex h-8 items-center rounded-lg border px-2.5 text-xs text-muted-foreground">
                            No website
                          </span>
                        )}

                        {candidate.maps_url ? (
                          <a
                            href={
                              candidate.maps_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            Google Maps

                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}

                        {candidate.phone ? (
                          <span className="text-xs text-muted-foreground">
                            {
                              candidate.phone
                            }
                          </span>
                        ) : null}
                      </div>

                      {/* ACTIONS */}

                      <CandidateActions
                        candidateId={
                          candidate.id
                        }
                      />
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* RECENT SEARCHES */}

      <div className="mt-10">
        <div>
          <h2 className="text-sm font-semibold">
            Recent searches
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Your latest company
            discovery runs.
          </p>
        </div>

        {searchRows.length ===
        0 ? (
          <Card className="mt-4 border-dashed shadow-none">
            <CardContent className="flex min-h-44 items-center justify-center p-6">
              <div className="text-center">
                <div className="mx-auto flex size-9 items-center justify-center rounded-lg border">
                  <Clock3 className="size-4 text-muted-foreground" />
                </div>

                <p className="mt-4 text-sm font-medium">
                  No searches yet
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your first lead
                  search will appear
                  here.
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
                    ? search
                        .campaign[0]
                    : search.campaign;

                return (
                  <Link
                    key={
                      search.id
                    }
                    href={`/find-leads?search=${search.id}`}
                    className={`flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center ${
                      index !==
                      searchRows.length -
                        1
                        ? "border-b"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {
                            search.query
                          }
                        </p>

                        <Badge
                          variant="outline"
                          className={statusClass(
                            search.status
                          )}
                        >
                          {statusLabel(
                            search.status
                          )}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {campaign?.name ??
                          "No campaign"}

                        {" · "}

                        {formatDate(
                          search.created_at
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-6 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Results
                        </p>

                        <p className="mt-0.5 font-medium">
                          {
                            search.result_count
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Limit
                        </p>

                        <p className="mt-0.5 font-medium">
                          {
                            search.result_limit
                          }
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}