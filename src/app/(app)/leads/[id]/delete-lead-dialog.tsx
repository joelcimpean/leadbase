"use client";

import { Trash2 } from "lucide-react";

import { deleteLead } from "../actions";

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

export function DeleteLeadDialog({
  leadId,
  companyName,
}: {
  leadId: string;
  companyName: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Delete lead"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete lead?</AlertDialogTitle>

          <AlertDialogDescription>
            You are about to permanently delete {companyName}. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={deleteLead}>
          <input type="hidden" name="leadId" value={leadId} />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}