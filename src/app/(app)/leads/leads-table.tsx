"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LeadTableRow = {
  id: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  websiteUrl: string | null;
  contactFormUrl: string | null;
  contactEmail: string | null;
  websiteScore: number | null;
  opportunityScore: number | null;
  status: string;
  priority: string | null;
  lastContactedAt: string | null;
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "NOT_A_FIT":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";

    case "DRAFT_READY":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "CONTACTED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "REPLIED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "CALL_BOOKED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "PROPOSAL":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "WON":
      return "border-green-200 bg-green-50 text-green-700";

    case "LOST":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function priorityLabel(priority: string | null) {
  if (!priority) {
    return "No priority";
  }

  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function getNextAction(status: string) {
  switch (status) {
    case "NEW":
      return "Start research";

    case "RESEARCHING":
      return "Finish research";

    case "QUALIFIED":
      return "Prepare outreach";

    case "DRAFT_READY":
      return "Review draft";

    case "CONTACTED":
      return "Wait for reply";

    case "REPLIED":
      return "Review reply";

    case "CALL_BOOKED":
      return "Prepare call";

    case "PROPOSAL":
      return "Follow proposal";

    case "WON":
      return "Client won";

    case "LOST":
    case "NOT_A_FIT":
      return "No action";

    case "DO_NOT_CONTACT":
      return "Blocked";

    default:
      return "Review lead";
  }
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function normalizeUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function LeadsTable({
  leads,
}: {
  leads: LeadTableRow[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredLeads = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.companyName.toLowerCase().includes(searchTerm) ||
        lead.industry?.toLowerCase().includes(searchTerm) ||
        lead.location?.toLowerCase().includes(searchTerm) ||
        lead.contactEmail?.toLowerCase().includes(searchTerm);

      const matchesStatus =
        status === "ALL" || lead.status === status;

      const matchesPriority =
        priority === "ALL" ||
        (priority === "NONE"
          ? lead.priority === null
          : lead.priority === priority);

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [leads, search, status, priority]);

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "ALL" ||
    priority !== "ALL";

  function resetFilters() {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFiltersOpen((current) => !current)
            }
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
              filtersOpen
                ? "bg-muted text-foreground"
                : "bg-background hover:bg-muted/50"
            }`}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Status
            </p>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="h-9 min-w-44 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All statuses</option>
              <option value="NEW">New</option>
              <option value="RESEARCHING">
                Researching
              </option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NOT_A_FIT">
                Not a fit
              </option>
              <option value="DRAFT_READY">
                Draft ready
              </option>
              <option value="CONTACTED">
                Contacted
              </option>
              <option value="REPLIED">Replied</option>
              <option value="CALL_BOOKED">
                Call booked
              </option>
              <option value="PROPOSAL">
                Proposal
              </option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="DO_NOT_CONTACT">
                Do not contact
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Priority
            </p>

            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value)
              }
              className="h-9 min-w-44 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">
                All priorities
              </option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NONE">
                No priority
              </option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-52">
                Company
              </TableHead>

              <TableHead>
                Industry
              </TableHead>

              <TableHead>
                Location
              </TableHead>

              <TableHead>
                Website
              </TableHead>

              <TableHead>
                Opportunity
              </TableHead>

              <TableHead>
                Contact
              </TableHead>

              <TableHead>
                Status
              </TableHead>

              <TableHead>
                Priority
              </TableHead>

              <TableHead>
                Last contact
              </TableHead>

              <TableHead className="min-w-36">
                Next action
              </TableHead>

              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="h-44 text-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      No matching leads
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Try changing your search or filters.
                    </p>

                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={resetFilters}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/leads/${lead.id}`
                          )
                        }
                        className="cursor-pointer text-left font-medium transition-colors hover:text-muted-foreground hover:underline"
                      >
                        {lead.companyName}
                      </button>

                      {lead.websiteUrl ? (
                        <a
                          href={normalizeUrl(
                            lead.websiteUrl
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Website
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No website
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {lead.industry ?? "—"}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {lead.location ?? "—"}
                  </TableCell>

                  <TableCell>
                    {lead.websiteScore !== null ? (
                      <>
                        {lead.websiteScore}

                        <span className="text-muted-foreground">
                          /100
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {lead.opportunityScore !== null ? (
                      <>
                        {lead.opportunityScore}

                        <span className="text-muted-foreground">
                          /100
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {lead.contactEmail
                      ? lead.contactEmail
                      : lead.contactFormUrl
                        ? "Contact form"
                        : "No email found"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap font-medium ${statusClass(
                        lead.status
                      )}`}
                    >
                      {statusLabel(lead.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {priorityLabel(
                      lead.priority
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(
                      lead.lastContactedAt
                    )}
                  </TableCell>

                  <TableCell>
                    {getNextAction(
                      lead.status
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${lead.companyName}`}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/leads/${lead.id}`
                            )
                          }
                        >
                          <Eye className="size-4" />
                          Open lead
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/leads/${lead.id}/edit`
                            )
                          }
                        >
                          <Pencil className="size-4" />
                          Edit lead
                        </DropdownMenuItem>

                        {lead.websiteUrl ? (
                          <>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  normalizeUrl(
                                    lead.websiteUrl!
                                  ),
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <ExternalLink className="size-4" />
                              Visit website
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredLeads.length}
          {filteredLeads.length === 1
            ? " lead"
            : " leads"}

          {filteredLeads.length !==
          leads.length
            ? ` of ${leads.length}`
            : ""}
        </span>

        <span>
          Supabase
        </span>
      </div>
    </>
  );
}