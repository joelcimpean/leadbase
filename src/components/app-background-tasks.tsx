"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  analyzeLeadWebsite,
} from "@/app/(app)/leads/analysis-actions";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

export type BackgroundAnalysisItem = {
  id:
    string;

  companyName:
    string;
};

export type BackgroundAnalysisTask = {
  running:
    boolean;

  current:
    number;

  total:
    number;

  succeeded:
    number;

  failed:
    number;

  currentCompany:
    string
    | null;
};

type AppBackgroundTasksContextValue = {
  analysisTask:
    BackgroundAnalysisTask;

  startBulkAnalysis:
    (
      items:
        BackgroundAnalysisItem[]
    ) => boolean;
};

/* =========================================================
   DEFAULT
========================================================= */

const EMPTY_ANALYSIS_TASK:
  BackgroundAnalysisTask = {
  running:
    false,

  current:
    0,

  total:
    0,

  succeeded:
    0,

  failed:
    0,

  currentCompany:
    null,
};

/* =========================================================
   CONTEXT
========================================================= */

const AppBackgroundTasksContext =
  createContext<
    AppBackgroundTasksContextValue
    | null
  >(
    null
  );

/* =========================================================
   PROVIDER
========================================================= */

export function AppBackgroundTasksProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  const [
    analysisTask,
    setAnalysisTask,
  ] =
    useState<
      BackgroundAnalysisTask
    >(
      EMPTY_ANALYSIS_TASK
    );

  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const {
    notify,
  } =
    useAppNotifications();

  const startBulkAnalysis =
    useCallback(
      (
        items:
          BackgroundAnalysisItem[]
      ) => {
        if (
          analysisTask.running ||
          items.length ===
            0
        ) {
          return false;
        }

        setAnalysisTask({
          running:
            true,

          current:
            0,

          total:
            items.length,

          succeeded:
            0,

          failed:
            0,

          currentCompany:
            items[0]
              ?.companyName ??
            null,
        });

        notify({
          variant:
            "info",

          title:
            language ===
              "de"
              ? "Analyse gestartet"
              : "Analysis started",

          description:
            language ===
              "de"
              ? `${items.length} Lead${items.length === 1 ? "" : "s"} werden analysiert. Du kannst Leadbase währenddessen weiter benutzen.`
              : `${items.length} lead${items.length === 1 ? "" : "s"} are being analyzed. You can keep using Leadbase meanwhile.`,

          durationMs:
            4_500,
        });

        void (
          async () => {
            let succeeded =
              0;

            let failed =
              0;

            const failedItems: {
              id:
                string;

              companyName:
                string;

              reason:
                string;
            }[] =
              [];

            for (
              let index =
                0;
              index <
                items.length;
              index +=
                1
            ) {
              const item =
                items[
                  index
                ];

              setAnalysisTask(
                (
                  current
                ) => ({
                  ...current,

                  current:
                    index,

                  currentCompany:
                    item.companyName,
                })
              );

              try {
                const formData =
                  new FormData();

                formData.set(
                  "leadId",
                  item.id
                );

                await analyzeLeadWebsite(
                  formData
                );

                succeeded +=
                  1;
              } catch (
                error
              ) {
                failed +=
                  1;

                failedItems.push({
                  id:
                    item.id,

                  companyName:
                    item.companyName,

                  reason:
                    error instanceof
                      Error
                      ? error.message
                      : language ===
                          "de"
                        ? "Unbekannter Analysefehler"
                        : "Unknown analysis error",
                });
              }

              setAnalysisTask(
                (
                  current
                ) => ({
                  ...current,

                  current:
                    index +
                    1,

                  succeeded,

                  failed,
                })
              );
            }

            notify({
              variant:
                failed >
                0
                  ? "warning"
                  : "success",

              title:
                language ===
                  "de"
                  ? failed >
                    0
                    ? "Analyse abgeschlossen – mit Fehlern"
                    : "Analyse abgeschlossen"
                  : failed >
                      0
                    ? "Analysis complete — with errors"
                    : "Analysis complete",

              description:
                language ===
                  "de"
                  ? `${succeeded} erfolgreich · ${failed} fehlgeschlagen`
                  : `${succeeded} successful · ${failed} failed`,

              items:
                failedItems
                  .slice(
                    0,
                    4
                  )
                  .map(
                    (
                      item
                    ) => ({
                      title:
                        item.companyName,

                      description:
                        item.reason,

                      href:
                        `/leads/${item.id}`,
                    })
                  ),

              durationMs:
                failed >
                0
                  ? 12_000
                  : 7_000,
            });

            setAnalysisTask(
              EMPTY_ANALYSIS_TASK
            );

            router.refresh();
          }
        )();

        return true;
      },
      [
        analysisTask.running,
        language,
        notify,
        router,
      ]
    );

  const value =
    useMemo(
      () => ({
        analysisTask,
        startBulkAnalysis,
      }),
      [
        analysisTask,
        startBulkAnalysis,
      ]
    );

  return (
    <AppBackgroundTasksContext.Provider
      value={
        value
      }
    >
      {
        children
      }
    </AppBackgroundTasksContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAppBackgroundTasks() {
  const context =
    useContext(
      AppBackgroundTasksContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useAppBackgroundTasks must be used inside AppBackgroundTasksProvider."
    );
  }

  return context;
}
