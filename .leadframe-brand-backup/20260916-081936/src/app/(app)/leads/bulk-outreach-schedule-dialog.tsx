"use client";

import {
  CalendarClock,
  Check,
  Film,
  Loader2,
  Mail,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getBulkOutreachGifPreferences,
  scheduleLeadOutreachForBulk,
} from "./outreach-actions";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

export type BulkScheduleLead = {
  id: string;
  companyName: string;
  contactEmail:
    | string
    | null;
};

type Props = {
  open: boolean;
  leads: BulkScheduleLead[];
  onOpenChange:
    (open: boolean) => void;
  onScheduled?:
    () => void;
};

/* =========================================================
   HELPERS
========================================================= */

function getDefaultScheduledSendValue() {
  const now = new Date();
  now.setMinutes(
    now.getMinutes() + 30
  );
  now.setSeconds(0, 0);

  const local = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000
  );

  return local
    .toISOString()
    .slice(0, 16);
}

/* =========================================================
   COMPONENT
========================================================= */

export function BulkOutreachScheduleDialog({
  open,
  leads,
  onOpenChange,
  onScheduled,
}: Props) {
  const {
    language,
  } = useLanguage();

  const {
    notify,
  } = useAppNotifications();

  const de =
    language === "de";

  const [
    scheduledFor,
    setScheduledFor,
  ] = useState(
    getDefaultScheduledSendValue
  );

  const [
    gifChoices,
    setGifChoices,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    gifReady,
    setGifReady,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    loadingPreferences,
    setLoadingPreferences,
  ] = useState(false);

  const [
    scheduling,
    setScheduling,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState({
    current: 0,
    total: 0,
  });

  const allEnabled =
    leads.length > 0 &&
    leads.every(
      (lead) =>
        gifChoices[lead.id] ?? false
    );

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setScheduledFor(
        getDefaultScheduledSendValue()
      );

      let cancelled = false;

      async function load() {
        setLoadingPreferences(true);

        try {
          const result =
            await getBulkOutreachGifPreferences(
              leads.map(
                (lead) => lead.id
              )
            );

          if (cancelled) {
            return;
          }

          if (!result.ok) {
            throw new Error(
              result.error
            );
          }

          const nextChoices:
            Record<string, boolean> = {};

          const nextReady:
            Record<string, boolean> = {};

          for (const lead of leads) {
            const state =
              result.leads[lead.id];

            nextChoices[lead.id] =
              state?.enabled ?? true;

            nextReady[lead.id] =
              state?.gifReady ?? false;
          }

          setGifChoices(
            nextChoices
          );

          setGifReady(
            nextReady
          );
        } catch (error) {
          if (!cancelled) {
            setGifChoices(
              Object.fromEntries(
                leads.map(
                  (lead) => [
                    lead.id,
                    true,
                  ]
                )
              )
            );

            notify({
              variant: "warning",
              title: de
                ? "GIF-Einstellungen konnten nicht geladen werden"
                : "GIF preferences could not be loaded",
              description:
                error instanceof Error
                  ? error.message
                  : undefined,
            });
          }
        } finally {
          if (!cancelled) {
            setLoadingPreferences(false);
          }
        }
      }

      void load();

      return () => {
        cancelled = true;
      };
    }, [
      open,
      leads,
      notify,
      de,
    ]
  );

  useEffect(
    () => {
      if (!open) {
        return;
      }

      const previous =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function onKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key === "Escape" &&
          !scheduling
        ) {
          onOpenChange(false);
        }
      }

      window.addEventListener(
        "keydown",
        onKeyDown
      );

      return () => {
        document.body.style.overflow =
          previous;

        window.removeEventListener(
          "keydown",
          onKeyDown
        );
      };
    }, [
      open,
      scheduling,
      onOpenChange,
    ]
  );

  const readyCount =
    useMemo(
      () =>
        leads.filter(
          (lead) =>
            gifReady[lead.id]
        ).length,
      [leads, gifReady]
    );

  if (!open) {
    return null;
  }

  function setAll(
    enabled: boolean
  ) {
    setGifChoices(
      Object.fromEntries(
        leads.map(
          (lead) => [
            lead.id,
            enabled,
          ]
        )
      )
    );
  }

  async function schedule() {
    if (
      scheduling ||
      leads.length === 0
    ) {
      return;
    }

    const localDate =
      new Date(scheduledFor);

    if (
      !scheduledFor ||
      !Number.isFinite(
        localDate.getTime()
      ) ||
      localDate.getTime() <=
        Date.now() + 30_000
    ) {
      notify({
        variant: "warning",
        title: de
          ? "Ungültige Sendezeit"
          : "Invalid send time",
        description: de
          ? "Bitte wähle eine zukünftige Uhrzeit."
          : "Please choose a future time.",
      });
      return;
    }

    const iso =
      localDate.toISOString();

    setScheduling(true);
    setProgress({
      current: 0,
      total: leads.length,
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const issues: Array<{
      title: string;
      description?: string;
      href?: string;
    }> = [];

    try {
      for (
        let index = 0;
        index < leads.length;
        index += 1
      ) {
        const lead =
          leads[index];

        try {
          const result =
            await scheduleLeadOutreachForBulk(
              lead.id,
              iso,
              gifChoices[lead.id] ?? false
            );

          if (!result.success) {
            failed += 1;
            issues.push({
              title: lead.companyName,
              description:
                result.error,
              href:
                `/leads/${lead.id}#outreach`,
            });
          } else if (
            result.status === "scheduled"
          ) {
            sent += 1;
          } else {
            skipped += 1;
            issues.push({
              title: lead.companyName,
              description:
                result.reason,
              href:
                `/leads/${lead.id}#outreach`,
            });
          }
        } catch (error) {
          failed += 1;
          issues.push({
            title: lead.companyName,
            description:
              error instanceof Error
                ? error.message
                : de
                  ? "Unbekannter Fehler"
                  : "Unknown error",
            href:
              `/leads/${lead.id}#outreach`,
          });
        }

        setProgress({
          current: index + 1,
          total: leads.length,
        });
      }

      const formatted =
        new Intl.DateTimeFormat(
          de ? "de-DE" : "en-IE",
          {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }
        ).format(localDate);

      notify({
        variant:
          failed > 0 || skipped > 0
            ? "warning"
            : "success",
        title: de
          ? "Outreach geplant"
          : "Outreach scheduled",
        description: de
          ? `${sent} geplant für ${formatted} · ${skipped} übersprungen · ${failed} fehlgeschlagen`
          : `${sent} scheduled for ${formatted} · ${skipped} skipped · ${failed} failed`,
        items:
          issues.length > 0
            ? issues.slice(0, 5)
            : undefined,
        action: {
          label: de
            ? "Geplante Mails öffnen"
            : "Open scheduled emails",
          href: "/scheduled",
        },
      });

      onScheduled?.();
      onOpenChange(false);
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !scheduling
        ) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-background shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              <h2 className="text-base font-semibold">
                {de
                  ? "Outreach planen"
                  : "Schedule outreach"}
              </h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {de
                ? "Zeit wählen und pro Lead festlegen, ob die animierte Vorschau mitgesendet wird."
                : "Choose the send time and decide per lead whether the animated preview is included."}
            </p>
          </div>

          <button
            type="button"
            disabled={scheduling}
            onClick={() =>
              onOpenChange(false)
            }
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label={de ? "Schließen" : "Close"}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <label className="block">
            <span className="text-xs font-medium">
              {de
                ? "Sendezeit"
                : "Send time"}
            </span>
            <input
              type="datetime-local"
              value={scheduledFor}
              disabled={scheduling}
              onChange={(event) =>
                setScheduledFor(
                  event.target.value
                )
              }
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/15 p-3">
            <div className="flex items-center gap-2">
              <Film className="size-4" />
              <div>
                <p className="text-xs font-semibold">
                  {de
                    ? "GIF für alle"
                    : "GIF for all"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {loadingPreferences
                    ? de
                      ? "Einstellungen werden geladen…"
                      : "Loading preferences…"
                    : de
                      ? `${readyCount}/${leads.length} aktuell bereit`
                      : `${readyCount}/${leads.length} currently ready`}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={allEnabled}
              disabled={
                scheduling ||
                loadingPreferences
              }
              onClick={() =>
                setAll(!allEnabled)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:opacity-50 ${
                allEnabled
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-border bg-muted"
              }`}
            >
              <span
                className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
                  allEnabled
                    ? "translate-x-[19px]"
                    : "translate-x-[1px]"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 divide-y overflow-hidden rounded-xl border">
            {leads.map((lead) => {
              const enabled =
                gifChoices[lead.id] ?? false;

              const ready =
                gifReady[lead.id] ?? false;

              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 px-3 py-3 sm:px-4"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
                    <Mail className="size-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {lead.companyName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lead.contactEmail ??
                        (de
                          ? "Keine E-Mail"
                          : "No email")}
                    </p>
                  </div>

                  <div className="hidden items-center gap-1.5 sm:flex">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        ready
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ready
                        ? de
                          ? "GIF bereit"
                          : "GIF ready"
                        : de
                          ? "Noch nicht bereit"
                          : "Not ready yet"}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={
                      scheduling ||
                      loadingPreferences
                    }
                    onClick={() =>
                      setGifChoices((current) => ({
                        ...current,
                        [lead.id]: !enabled,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
                      enabled
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-border bg-muted"
                    }`}
                  >
                    <span
                      className={`flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                        enabled
                          ? "translate-x-[19px]"
                          : "translate-x-[1px]"
                      }`}
                    >
                      {enabled && ready ? (
                        <Check className="size-3 text-emerald-700" />
                      ) : null}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {de
              ? "Ist GIF aktiviert, aber beim Versand noch nicht bereit, wird die normale Text-Mail mit Preview-Link gesendet. Der Versand wird dadurch nie blockiert."
              : "If GIF is enabled but still not ready when the email is sent, Leadbase falls back to the normal text email with the preview link. Sending is never blocked by the GIF."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/10 px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            {scheduling
              ? `${progress.current}/${progress.total}`
              : `${leads.length} ${de ? "Leads" : "leads"}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={scheduling}
              onClick={() =>
                onOpenChange(false)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {de ? "Abbrechen" : "Cancel"}
            </button>

            <button
              type="button"
              disabled={
                scheduling ||
                loadingPreferences ||
                leads.length === 0
              }
              onClick={() =>
                void schedule()
              }
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {scheduling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              {scheduling
                ? de
                  ? "Wird geplant…"
                  : "Scheduling…"
                : de
                  ? "Versand planen"
                  : "Schedule send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
