"use client";

import {
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import {
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import {
  updateCampaignStatus,
} from "../actions";

import {
  DeleteCampaignDialog,
} from "./delete-campaign-dialog";

import {
  buttonVariants,
} from "@/components/ui/button";

/* =========================================================
   STATUSES
========================================================= */

const campaignStatuses = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
] as const;

type CampaignStatus =
  (typeof campaignStatuses)[number];

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(
  status: string
): CampaignStatus {
  if (
    campaignStatuses.includes(
      status as CampaignStatus
    )
  ) {
    return status as CampaignStatus;
  }

  return "DRAFT";
}

/* =========================================================
   COMPONENT
========================================================= */

export function CampaignActions({
  campaignId,
  campaignName,
  initialStatus,
  leadCount,
}: {
  campaignId: string;

  campaignName: string;

  initialStatus: string;

  leadCount: number;
}) {
  const [
    status,
    setStatus,
  ] =
    useState<CampaignStatus>(
      normalizeStatus(
        initialStatus
      )
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  /* =======================================================
     STATUS CHANGE
  ======================================================= */

  function handleStatusChange(
    nextStatus:
      CampaignStatus
  ) {
    const previousStatus =
      status;

    setStatus(
      nextStatus
    );

    const formData =
      new FormData();

    formData.set(
      "campaignId",
      campaignId
    );

    formData.set(
      "status",
      nextStatus
    );

    startTransition(
      async () => {
        try {
          await updateCampaignStatus(
            formData
          );
        } catch (
          error
        ) {
          setStatus(
            previousStatus
          );

          console.error(
            "Could not update campaign status:",
            error
          );
        }
      }
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center xl:justify-end">
      {/* ===================================================
          EDIT
      =================================================== */}

      <Link
        href={`/campaigns/${campaignId}/edit`}
        className={buttonVariants({
          variant:
            "outline",

          className:
            "h-10 w-full gap-2 rounded-lg px-3 text-sm font-medium sm:h-9 sm:w-auto",
        })}
      >
        <Pencil className="size-3.5" />

        Edit
      </Link>

      {/* ===================================================
          STATUS
      =================================================== */}

      <div className="relative w-full sm:w-auto">
        <select
          value={
            status
          }
          disabled={
            isPending
          }
          onChange={(
            event
          ) =>
            handleStatusChange(
              event.target
                .value as CampaignStatus
            )
          }
          aria-label="Campaign status"
          className="h-10 w-full appearance-none rounded-lg border bg-background pl-3 pr-9 text-sm font-medium outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring disabled:cursor-wait disabled:opacity-70 sm:h-9 sm:min-w-[118px]"
        >
          <option value="DRAFT">
            Draft
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="PAUSED">
            Paused
          </option>

          <option value="ARCHIVED">
            Archived
          </option>
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ===================================================
          FIND LEADS
      =================================================== */}

      {status !==
      "ARCHIVED" ? (
        <Link
          href={`/find-leads?campaign=${campaignId}`}
          className={buttonVariants({
            variant:
              "outline",

            className:
              "h-10 w-full gap-2 rounded-lg px-3 text-sm font-medium sm:h-9 sm:w-auto",
          })}
        >
          <Search className="size-4" />

          Find leads
        </Link>
      ) : null}

      {/* ===================================================
          ADD LEAD
      =================================================== */}

      <Link
        href={`/leads/new?campaign=${campaignId}`}
        className={buttonVariants({
          className:
            "h-10 w-full gap-2 rounded-lg px-3 text-sm font-medium sm:h-9 sm:w-auto",
        })}
      >
        <Plus className="size-4" />

        Add lead
      </Link>

      {/* ===================================================
          DELETE
      =================================================== */}

      <div className="col-span-2 sm:col-span-1">
        <DeleteCampaignDialog
          campaignId={
            campaignId
          }
          campaignName={
            campaignName
          }
          leadCount={
            leadCount
          }
        />
      </div>
    </div>
  );
}