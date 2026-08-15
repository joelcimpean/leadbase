"use client";

import { Trash2 } from "lucide-react";

import { deleteCampaign } from "../actions";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";

export function DeleteCampaignDialog({
  campaignId,
  campaignName,
  leadCount,
}: {
  campaignId: string;
  campaignName: string;
  leadCount: number;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="
              size-9
              rounded-lg
              border-red-200
              text-red-600
              hover:border-red-300
              hover:bg-red-50
              hover:text-red-700
            "
            aria-label="Delete campaign"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete campaign?
          </AlertDialogTitle>

          <AlertDialogDescription>
            You are about to permanently
            delete{" "}
            <strong>
              {campaignName}
            </strong>
            .

            {leadCount > 0
              ? ` Its ${leadCount} ${
                  leadCount === 1
                    ? "lead"
                    : "leads"
                } will remain in your CRM but will no longer belong to this campaign.`
              : " This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={deleteCampaign}>
          <input
            type="hidden"
            name="campaignId"
            value={campaignId}
          />

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}