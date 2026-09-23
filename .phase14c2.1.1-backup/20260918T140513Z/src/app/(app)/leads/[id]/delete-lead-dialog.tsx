"use client";

import {
  Trash2,
} from "lucide-react";

import {
  deleteLead,
} from "../actions";

import {
  useLanguage,
} from "@/components/language-provider";

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

import {
  Button,
} from "@/components/ui/button";

export function DeleteLeadDialog({
  leadId,
  companyName,
}: {
  leadId: string;
  companyName: string;
}) {
  const {
    language,
  } =
    useLanguage();

  const text =
    language ===
    "de"
      ? {
          trigger:
            "Lead löschen",

          title:
            "Lead löschen?",

          description:
            `Du bist dabei, ${companyName} dauerhaft zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.`,

          cancel:
            "Abbrechen",

          delete:
            "Lead löschen",
        }
      : {
          trigger:
            "Delete lead",

          title:
            "Delete lead?",

          description:
            `You are about to permanently delete ${companyName}. This action cannot be undone.`,

          cancel:
            "Cancel",

          delete:
            "Delete lead",
        };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            className="h-10 w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-9 sm:w-auto dark:border-red-900/70 dark:hover:bg-red-950/40"
          />
        }
      >
        <Trash2 className="size-4" />

        {
          text.trigger
        }
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {
              text.title
            }
          </AlertDialogTitle>

          <AlertDialogDescription>
            {
              text.description
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          action={
            deleteLead
          }
        >
          <input
            type="hidden"
            name="leadId"
            value={
              leadId
            }
          />

          <AlertDialogFooter>
            <AlertDialogCancel>
              {
                text.cancel
              }
            </AlertDialogCancel>

            <AlertDialogAction
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="size-4" />

              {
                text.delete
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}