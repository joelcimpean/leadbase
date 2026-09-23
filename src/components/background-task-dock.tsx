"use client";

import {
  Film,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import {
  useAppBackgroundTasks,
} from "@/components/app-background-tasks";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  PersistentAiActivityRows,
} from "@/components/persistent-ai-activity";

function ProgressRow({
  icon: Icon,
  label,
  current,
  total,
  detail,
}: {
  icon: typeof Sparkles;
  label: string;
  current: number;
  total: number;
  detail?: string | null;
}) {
  const percentage =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            current / total * 100
          )
        )
      : 0;

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background/95 p-3 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.08] text-primary">
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold">
              {label}
            </p>
            <span className="font-mono text-xs font-semibold tabular-nums text-primary">
              {current}/{total}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width:
                  `${percentage}%`,
              }}
            />
          </div>

          {detail ? (
            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {detail}
            </p>
          ) : null}
        </div>

        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export function BackgroundTaskDock() {
  const {
    analysisTask,
    designTask,
    gifTask,
  } =
    useAppBackgroundTasks();

  const {
    language,
  } =
    useLanguage();

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[90] w-[min(360px,calc(100vw-2rem))] space-y-2 md:bottom-20 md:right-5">
      <div className="pointer-events-auto space-y-2">
        <PersistentAiActivityRows />
        {analysisTask.running ? (
          <ProgressRow
            icon={Sparkles}
            label={
              language === "de"
                ? "Websites analysieren"
                : "Analyzing websites"
            }
            current={analysisTask.current}
            total={analysisTask.total}
            detail={analysisTask.currentCompany}
          />
        ) : null}

        {designTask.running ? (
          <ProgressRow
            icon={WandSparkles}
            label={
              language === "de"
                ? "Designs im Hintergrund"
                : "Designs in background"
            }
            current={designTask.current}
            total={designTask.total}
            detail={designTask.currentCompany}
          />
        ) : null}

        {gifTask.running ? (
          <ProgressRow
            icon={Film}
            label={
              language === "de"
                ? "GIFs erstellen"
                : "Generating GIFs"
            }
            current={gifTask.current}
            total={gifTask.total}
            detail={gifTask.currentCompany}
          />
        ) : null}
      </div>
    </div>
  );
}
