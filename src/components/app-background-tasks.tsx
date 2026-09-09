"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export type BackgroundAnalysisItem = {
  id: string;
  companyName: string;
};

export type BackgroundDesignItem = {
  id: string;
  companyName: string;
};

export type BackgroundAnalysisTask = {
  running: boolean;
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  currentCompany: string | null;
};

export type BackgroundDesignTask = {
  running: boolean;
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  currentCompany: string | null;
};

type AppBackgroundTasksContextValue = {
  analysisTask: BackgroundAnalysisTask;
  designTask: BackgroundDesignTask;
  gifTask: BackgroundDesignTask;
  startBulkAnalysis: (
    items: BackgroundAnalysisItem[]
  ) => boolean;
  startBulkDesign: (
    items: BackgroundDesignItem[]
  ) => boolean;
  startBulkGif: (
    items: BackgroundDesignItem[]
  ) => boolean;
};

const EMPTY_ANALYSIS_TASK: BackgroundAnalysisTask = {
  running: false,
  current: 0,
  total: 0,
  succeeded: 0,
  failed: 0,
  currentCompany: null,
};

const EMPTY_DESIGN_TASK: BackgroundDesignTask = {
  running: false,
  current: 0,
  total: 0,
  succeeded: 0,
  failed: 0,
  currentCompany: null,
};

const DESIGN_QUEUE_KEY =
  "leadbase:bulk-design-queue:v1";

const GIF_QUEUE_KEY =
  "leadbase:bulk-gif-queue:v1";

const SETTINGS_KEY =
  "leadbase-design-generation-settings";

const AppBackgroundTasksContext =
  createContext<AppBackgroundTasksContextValue | null>(
    null
  );

function readGenerationSettings() {
  try {
    const raw =
      window.localStorage.getItem(
        SETTINGS_KEY
      );

    if (!raw) {
      return {
        designModel:
          "gpt-5.6-sol",
        reasoningEffort:
          "medium",
      };
    }

    const parsed =
      JSON.parse(raw) as {
        designModel?: string;
        reasoningEffort?: string;
      };

    return {
      designModel:
        parsed.designModel ||
        "gpt-5.6-sol",
      reasoningEffort:
        parsed.reasoningEffort ||
        "medium",
    };
  } catch {
    return {
      designModel:
        "gpt-5.6-sol",
      reasoningEffort:
        "medium",
    };
  }
}

function writeQueue(
  key: string,
  items: BackgroundDesignItem[]
) {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(
        key
      );
      return;
    }

    window.localStorage.setItem(
      key,
      JSON.stringify(
        items
      )
    );
  } catch {
    // Queue persistence is best effort. The in-memory job keeps running.
  }
}

function readQueue(
  key: string
) {
  try {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (!raw) {
      return [] as BackgroundDesignItem[];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [] as BackgroundDesignItem[];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id ===
            "string" &&
          typeof item.companyName ===
            "string"
      )
      .slice(0, 30) as BackgroundDesignItem[];
  } catch {
    return [] as BackgroundDesignItem[];
  }
}

export function AppBackgroundTasksProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [analysisTask, setAnalysisTask] =
    useState<BackgroundAnalysisTask>(
      EMPTY_ANALYSIS_TASK
    );

  const [designTask, setDesignTask] =
    useState<BackgroundDesignTask>(
      EMPTY_DESIGN_TASK
    );

  const [gifTask, setGifTask] =
    useState<BackgroundDesignTask>(
      EMPTY_DESIGN_TASK
    );

  const designRunningRef =
    useRef(false);

  const gifRunningRef =
    useRef(false);

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
        items: BackgroundAnalysisItem[]
      ) => {
        if (
          analysisTask.running ||
          items.length === 0
        ) {
          return false;
        }

        setAnalysisTask({
          running: true,
          current: 0,
          total: items.length,
          succeeded: 0,
          failed: 0,
          currentCompany:
            items[0]?.companyName ??
            null,
        });

        void (async () => {
          let succeeded = 0;
          let failed = 0;

          for (
            let index = 0;
            index < items.length;
            index += 1
          ) {
            const item =
              items[index];

            setAnalysisTask(
              (current) => ({
                ...current,
                current: index,
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
              succeeded += 1;
            } catch {
              failed += 1;
            }

            setAnalysisTask(
              (current) => ({
                ...current,
                current:
                  index + 1,
                succeeded,
                failed,
              })
            );
          }

          notify({
            variant:
              failed > 0
                ? "warning"
                : "success",
            title:
              language === "de"
                ? "Analyse abgeschlossen"
                : "Analysis complete",
            description:
              `${succeeded} ✓ · ${failed} ✕`,
          });

          setAnalysisTask(
            EMPTY_ANALYSIS_TASK
          );
          router.refresh();
        })();

        return true;
      },
      [
        analysisTask.running,
        language,
        notify,
        router,
      ]
    );

  const runDesignQueue =
    useCallback(
      async (
        initialItems: BackgroundDesignItem[]
      ) => {
        if (
          designRunningRef.current ||
          initialItems.length === 0
        ) {
          return;
        }

        designRunningRef.current =
          true;

        const items =
          initialItems.slice(
            0,
            30
          );

        const settings =
          readGenerationSettings();

        let nextIndex = 0;
        let completed = 0;
        let succeeded = 0;
        let failed = 0;
        const pending =
          [...items];

        setDesignTask({
          running: true,
          current: 0,
          total: items.length,
          succeeded: 0,
          failed: 0,
          currentCompany:
            items[0]?.companyName ??
            null,
        });

        writeQueue(
          DESIGN_QUEUE_KEY,
          pending
        );

        const worker =
          async () => {
            while (true) {
              const index =
                nextIndex;
              nextIndex += 1;

              if (
                index >=
                items.length
              ) {
                return;
              }

              const item =
                items[index];

              setDesignTask(
                (current) => ({
                  ...current,
                  currentCompany:
                    item.companyName,
                })
              );

              try {
                const response =
                  await fetch(
                    `/api/leads/${encodeURIComponent(
                      item.id
                    )}/redesign-v2`,
                    {
                      method:
                        "POST",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body:
                        JSON.stringify({
                          regenerate:
                            false,
                          designModel:
                            settings.designModel,
                          reasoningEffort:
                            settings.reasoningEffort,
                          motionPreset:
                            "none",
                        }),
                    }
                  );

                const result =
                  (await response.json()) as {
                    ok?: boolean;
                  };

                if (
                  !response.ok ||
                  result.ok === false
                ) {
                  failed += 1;
                } else {
                  succeeded += 1;
                }
              } catch {
                failed += 1;
              }

              completed += 1;

              const pendingIndex =
                pending.findIndex(
                  (entry) =>
                    entry.id ===
                    item.id
                );

              if (
                pendingIndex >= 0
              ) {
                pending.splice(
                  pendingIndex,
                  1
                );
              }

              writeQueue(
                DESIGN_QUEUE_KEY,
                pending
              );

              setDesignTask(
                (current) => ({
                  ...current,
                  current:
                    completed,
                  succeeded,
                  failed,
                  currentCompany:
                    pending[0]
                      ?.companyName ??
                    null,
                })
              );
            }
          };

        try {
          // Two parallel design requests keep bulk runs practical
          // without overwhelming the browser/API with 30 simultaneous jobs.
          await Promise.all([
            worker(),
            worker(),
          ]);

          notify({
            variant:
              failed > 0
                ? "warning"
                : "success",
            title:
              language === "de"
                ? "Bulk-Design abgeschlossen"
                : "Bulk design complete",
            description:
              `${succeeded} ✓ · ${failed} ✕`,
          });
        } finally {
          writeQueue(
            DESIGN_QUEUE_KEY,
            []
          );
          setDesignTask(
            EMPTY_DESIGN_TASK
          );
          designRunningRef.current =
            false;
          router.refresh();
        }
      },
      [
        language,
        notify,
        router,
      ]
    );

  const startBulkDesign =
    useCallback(
      (
        items: BackgroundDesignItem[]
      ) => {
        if (
          designRunningRef.current ||
          items.length === 0
        ) {
          return false;
        }

        void runDesignQueue(
          items.slice(
            0,
            30
          )
        );

        return true;
      },
      [runDesignQueue]
    );

  const runGifQueue =
    useCallback(
      async (
        initialItems: BackgroundDesignItem[]
      ) => {
        if (
          gifRunningRef.current ||
          initialItems.length === 0
        ) {
          return;
        }

        gifRunningRef.current =
          true;

        const items =
          initialItems.slice(
            0,
            30
          );

        let succeeded = 0;
        let failed = 0;
        const pending =
          [...items];

        setGifTask({
          running: true,
          current: 0,
          total: items.length,
          succeeded: 0,
          failed: 0,
          currentCompany:
            items[0]?.companyName ??
            null,
        });

        writeQueue(
          GIF_QUEUE_KEY,
          pending
        );

        try {
          // GIFs are intentionally sequential: each job launches Chromium.
          // This prevents ERR_INSUFFICIENT_RESOURCES during bulk rendering.
          for (
            let index = 0;
            index < items.length;
            index += 1
          ) {
            const item =
              items[index];

            setGifTask(
              (current) => ({
                ...current,
                currentCompany:
                  item.companyName,
              })
            );

            try {
              const shareResponse =
                await fetch(
                  `/api/leads/${encodeURIComponent(
                    item.id
                  )}/redesign-preview/share`,
                  {
                    method:
                      "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body:
                      JSON.stringify({}),
                  }
                );

              const share =
                (await shareResponse.json()) as {
                  ok?: boolean;
                };

              if (
                !shareResponse.ok ||
                share.ok === false
              ) {
                throw new Error(
                  "Could not create public preview"
                );
              }

              const gifResponse =
                await fetch(
                  `/api/leads/${encodeURIComponent(
                    item.id
                  )}/preview-gif`,
                  {
                    method:
                      "POST",
                  }
                );

              const gif =
                (await gifResponse.json()) as {
                  ok?: boolean;
                };

              if (
                !gifResponse.ok ||
                gif.ok === false
              ) {
                throw new Error(
                  "Could not create GIF"
                );
              }

              succeeded += 1;
            } catch {
              failed += 1;
            }

            const pendingIndex =
              pending.findIndex(
                (entry) =>
                  entry.id ===
                  item.id
              );

            if (
              pendingIndex >= 0
            ) {
              pending.splice(
                pendingIndex,
                1
              );
            }

            writeQueue(
              GIF_QUEUE_KEY,
              pending
            );

            setGifTask(
              (current) => ({
                ...current,
                current:
                  index + 1,
                succeeded,
                failed,
                currentCompany:
                  pending[0]
                    ?.companyName ??
                  null,
              })
            );
          }

          notify({
            variant:
              failed > 0
                ? "warning"
                : "success",
            title:
              language === "de"
                ? "Bulk-GIF abgeschlossen"
                : "Bulk GIF complete",
            description:
              `${succeeded} ✓ · ${failed} ✕`,
          });
        } finally {
          writeQueue(
            GIF_QUEUE_KEY,
            []
          );
          setGifTask(
            EMPTY_DESIGN_TASK
          );
          gifRunningRef.current =
            false;
          router.refresh();
        }
      },
      [
        language,
        notify,
        router,
      ]
    );

  const startBulkGif =
    useCallback(
      (
        items: BackgroundDesignItem[]
      ) => {
        if (
          gifRunningRef.current ||
          items.length === 0
        ) {
          return false;
        }

        void runGifQueue(
          items.slice(
            0,
            30
          )
        );

        return true;
      },
      [runGifQueue]
    );

  // Resume unfinished browser-side queues after a page reload.
  // Route changes do not interrupt these jobs because the provider lives in app layout.
  useEffect(
    () => {
      const designItems =
        readQueue(
          DESIGN_QUEUE_KEY
        );

      if (
        designItems.length > 0 &&
        !designRunningRef.current
      ) {
        void runDesignQueue(
          designItems
        );
      }

      const gifItems =
        readQueue(
          GIF_QUEUE_KEY
        );

      if (
        gifItems.length > 0 &&
        !gifRunningRef.current
      ) {
        void runGifQueue(
          gifItems
        );
      }
    }, [runDesignQueue, runGifQueue]);

  const value =
    useMemo(
      () => ({
        analysisTask,
        designTask,
        gifTask,
        startBulkAnalysis,
        startBulkDesign,
        startBulkGif,
      }),
      [
        analysisTask,
        designTask,
        gifTask,
        startBulkAnalysis,
        startBulkDesign,
        startBulkGif,
      ]
    );

  return (
    <AppBackgroundTasksContext.Provider
      value={value}
    >
      {children}
    </AppBackgroundTasksContext.Provider>
  );
}

export function useAppBackgroundTasks() {
  const context =
    useContext(
      AppBackgroundTasksContext
    );

  if (!context) {
    throw new Error(
      "useAppBackgroundTasks must be used inside AppBackgroundTasksProvider."
    );
  }

  return context;
}
