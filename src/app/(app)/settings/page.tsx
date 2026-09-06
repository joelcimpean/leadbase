import {
  Bot,
  CheckCircle2,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MonitorCog,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Zap,
} from "lucide-react";

import {
  LanguageSelector,
} from "@/components/language-selector";

import {
  sendScheduledFollowUpsNow,
  stopScheduledFollowUps,
  stopSingleScheduledFollowUp,
  updateAutomaticFollowUps,
} from "./actions";

import {
  LeadSearchReset,
} from "./lead-search-reset";

import {
  ThemeSelector,
} from "@/components/theme-selector";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  listScheduledFollowUpsForUser,
  type ScheduledFollowUpCandidate,
} from "@/lib/follow-up-worker";

import {
  languageCopy,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type SettingsPageProps = {
  searchParams?: Promise<{
    gmail?:
      | string
      | string[];

    followups?:
      | string
      | string[];

    sent?:
      | string
      | string[];

    skipped?:
      | string
      | string[];

    failed?:
      | string
      | string[];
  }>;
};

function formatBerlinDateTime(
  value:
    string,
  language:
    "de"
    | "en"
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language ===
    "de"
      ? "de-DE"
      : "en-GB",
    {
      timeZone:
        "Europe/Berlin",

      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

type FollowUpGroupId =
  | "overdue"
  | "today"
  | "next3"
  | "next7"
  | "later";

type FollowUpGroup = {
  id:
    FollowUpGroupId;

  label:
    string;

  description:
    string;

  defaultOpen:
    boolean;

  items:
    ScheduledFollowUpCandidate[];
};

function getBerlinDayIndex(
  value:
    string
    | Date
) {
  const date =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Berlin",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const readPart = (
    type:
      "year"
      | "month"
      | "day"
  ) =>
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ??
        Number.NaN
    );

  const year =
    readPart(
      "year"
    );

  const month =
    readPart(
      "month"
    );

  const day =
    readPart(
      "day"
    );

  if (
    !Number.isFinite(
      year
    ) ||
    !Number.isFinite(
      month
    ) ||
    !Number.isFinite(
      day
    )
  ) {
    return null;
  }

  return Math.floor(
    Date.UTC(
      year,
      month - 1,
      day
    ) /
      86_400_000
  );
}

function formatRelativeFollowUpTime(
  value:
    string,
  language:
    "de"
    | "en"
) {
  const scheduled =
    new Date(
      value
    );

  const deltaMs =
    scheduled.getTime() -
    Date.now();

  if (
    !Number.isFinite(
      deltaMs
    )
  ) {
    return "";
  }

  const absoluteMinutes =
    Math.max(
      1,
      Math.round(
        Math.abs(
          deltaMs
        ) /
          60_000
      )
    );

  if (
    absoluteMinutes <
    60
  ) {
    return deltaMs <
      0
      ? language ===
        "de"
        ? `seit ${absoluteMinutes} Min.`
        : `${absoluteMinutes} min overdue`
      : language ===
          "de"
        ? `in ${absoluteMinutes} Min.`
        : `in ${absoluteMinutes} min`;
  }

  const absoluteHours =
    Math.round(
      absoluteMinutes /
        60
    );

  if (
    absoluteHours <
    24
  ) {
    return deltaMs <
      0
      ? language ===
        "de"
        ? `seit ${absoluteHours} Std.`
        : `${absoluteHours} h overdue`
      : language ===
          "de"
        ? `in ${absoluteHours} Std.`
        : `in ${absoluteHours} h`;
  }

  const absoluteDays =
    Math.max(
      1,
      Math.round(
        absoluteHours /
          24
      )
    );

  return deltaMs <
    0
    ? language ===
      "de"
      ? `seit ${absoluteDays} ${absoluteDays === 1 ? "Tag" : "Tagen"}`
      : `${absoluteDays} ${absoluteDays === 1 ? "day" : "days"} overdue`
    : language ===
        "de"
      ? `in ${absoluteDays} ${absoluteDays === 1 ? "Tag" : "Tagen"}`
      : `in ${absoluteDays} ${absoluteDays === 1 ? "day" : "days"}`;
}

function groupScheduledFollowUps(
  followUps:
    ScheduledFollowUpCandidate[],
  language:
    "de"
    | "en"
): FollowUpGroup[] {
  const today =
    getBerlinDayIndex(
      new Date()
    );

  const groups:
    Record<
      FollowUpGroupId,
      ScheduledFollowUpCandidate[]
    > = {
    overdue: [],
    today: [],
    next3: [],
    next7: [],
    later: [],
  };

  for (
    const followUp of
      followUps
  ) {
    const scheduledDay =
      getBerlinDayIndex(
        followUp.nextFollowUpAt
      );

    if (
      today ===
        null ||
      scheduledDay ===
        null
    ) {
      groups.later.push(
        followUp
      );

      continue;
    }

    const daysAway =
      scheduledDay -
      today;

    if (
      daysAway <
      0
    ) {
      groups.overdue.push(
        followUp
      );
    } else if (
      daysAway ===
      0
    ) {
      groups.today.push(
        followUp
      );
    } else if (
      daysAway <=
      3
    ) {
      groups.next3.push(
        followUp
      );
    } else if (
      daysAway <=
      7
    ) {
      groups.next7.push(
        followUp
      );
    } else {
      groups.later.push(
        followUp
      );
    }
  }

  const copy =
    language ===
    "de"
      ? {
          overdue: [
            "Überfällig",
            "Diese Follow-ups hätten bereits gesendet werden sollen.",
          ],

          today: [
            "Heute",
            "Noch für heute geplant.",
          ],

          next3: [
            "In den nächsten 3 Tagen",
            "Kurzfristig geplante Follow-ups.",
          ],

          next7: [
            "In 4–7 Tagen",
            "Für die kommende Woche geplant.",
          ],

          later: [
            "Später",
            "Follow-ups, die mehr als eine Woche entfernt sind.",
          ],
        }
      : {
          overdue: [
            "Overdue",
            "These follow-ups were already scheduled to be sent.",
          ],

          today: [
            "Today",
            "Still scheduled for today.",
          ],

          next3: [
            "Next 3 days",
            "Follow-ups scheduled soon.",
          ],

          next7: [
            "In 4–7 days",
            "Scheduled for the coming week.",
          ],

          later: [
            "Later",
            "Follow-ups scheduled more than one week from now.",
          ],
        };

  const order:
    FollowUpGroupId[] = [
    "overdue",
    "today",
    "next3",
    "next7",
    "later",
  ];

  return order
    .map(
      (
        id
      ): FollowUpGroup => ({
        id,
        label:
          copy[id][0],
        description:
          copy[id][1],
        defaultOpen:
          id ===
            "overdue" ||
          id ===
            "today" ||
          id ===
            "next3",
        items:
          groups[id],
      })
    )
    .filter(
      (
        group
      ) =>
        group.items.length >
        0
    );
}


/* =========================================================
   PAGE
========================================================= */

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const [
    supabase,
    language,
  ] = await Promise.all([
    createClient(),
    getAppLanguage(),
  ]);

  const text =
    languageCopy[
      language
    ].settings;

  const resetText =
    language ===
    "de"
      ? {
          title:
            "Lead-Suche zurücksetzen",

          description:
            "Löscht deine bisherige Find-Leads-Suchhistorie und alle noch offenen, gespeicherten oder verworfenen Suchkandidaten. Bestehende CRM-Leads bleiben erhalten und weiterhin vor Duplikaten geschützt.",
        }
      : {
          title:
            "Reset lead discovery",

          description:
            "Deletes your Find Leads search history and all discovered, saved or rejected search candidates. Existing CRM leads remain untouched and continue to be protected from duplicates.",
        };

  const followUpText =
    language ===
    "de"
      ? {
          automationTitle:
            "Follow-up-Automation",

          automationDescription:
            "Steuert, ob fällige Outreach-Follow-ups automatisch versendet werden sollen.",

          automatic:
            "Automatische Follow-ups",

          enabled:
            "Aktiv",

          disabled:
            "Aus",

          enable:
            "Automatik einschalten",

          disable:
            "Automatik ausschalten",

          enabling:
            "Wird aktiviert...",

          disabling:
            "Wird deaktiviert...",

          automaticNote:
            "Wenn aktiv, prüft der bestehende Cron regelmäßig fällige Follow-ups. OOO, echte Antworten, Bounce, Do Not Contact und unsichere E-Mail-Adressen bleiben geschützt.",

          dueNow:
            "Geplante Follow-ups jetzt schon senden",

          dueDescription:
            "Zieht geplante Follow-ups manuell vor und sendet sie sofort. Alle Sicherheitschecks bleiben aktiv; Out-of-Office und ausdrücklich später gewünschte Kontakte werden nicht vorgezogen.",

          sendNow:
            "Jetzt schon senden",

          sending:
            "Wird gesendet...",

          due:
            "bereit",

          originallyPlanned:
            "Ursprünglich geplant",

          selectHint:
            "Wähle nur die Follow-ups aus, die du wirklich vorzeitig senden möchtest.",

          sendSelected:
            "Ausgewählte jetzt senden",

          stop:
            "Nicht mehr nachfassen",

          stopSelected:
            "Ausgewählte stoppen",

          noneDue:
            "Aktuell gibt es keine Follow-ups, die manuell vorgezogen werden können.",

          resultSent:
            "Follow-ups wurden verarbeitet.",

          enabledMessage:
            "Automatische Follow-ups sind jetzt aktiv.",

          disabledMessage:
            "Automatische Follow-ups sind jetzt ausgeschaltet.",

          errorMessage:
            "Die Follow-up-Aktion konnte nicht vollständig ausgeführt werden.",
        }
      : {
          automationTitle:
            "Follow-up automation",

          automationDescription:
            "Controls whether due outreach follow-ups should be sent automatically.",

          automatic:
            "Automatic follow-ups",

          enabled:
            "On",

          disabled:
            "Off",

          enable:
            "Turn automation on",

          disable:
            "Turn automation off",

          enabling:
            "Turning on...",

          disabling:
            "Turning off...",

          automaticNote:
            "When enabled, the existing cron regularly processes due follow-ups. OOO, real replies, bounces, Do Not Contact and unsafe email addresses remain protected.",

          dueNow:
            "Send scheduled follow-ups early",

          dueDescription:
            "Manually sends scheduled follow-ups now, even if their planned time is later. All safety checks remain active; out-of-office and customer-requested future dates are not pulled forward.",

          sendNow:
            "Send now",

          sending:
            "Sending...",

          due:
            "ready",

          originallyPlanned:
            "Originally scheduled",

          selectHint:
            "Select only the follow-ups you actually want to send early.",

          sendSelected:
            "Send selected now",

          stop:
            "Stop follow-up",

          stopSelected:
            "Stop selected",

          noneDue:
            "There are currently no follow-ups that can be pulled forward manually.",

          resultSent:
            "Follow-ups were processed.",

          enabledMessage:
            "Automatic follow-ups are now enabled.",

          disabledMessage:
            "Automatic follow-ups are now disabled.",

          errorMessage:
            "The follow-up action could not be completed.",
        };

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  let gmailConnection: {
    email_address: string;
    scopes: string[];
    connected_at: string;
    updated_at: string;
  } | null = null;

  let automaticFollowUps =
    false;

  let manualFollowUps:
    ScheduledFollowUpCandidate[] =
    [];

  let manualFollowUpCount =
    0;

  if (
    user
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "gmail_connections"
        )
        .select(`
          email_address,
          scopes,
          connected_at,
          updated_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Could not load Gmail connection:",
        error
      );
    }

    gmailConnection =
      data;

    const [
      preferenceResult,
      manualCount,
    ] =
      await Promise.all([
        supabase
          .from(
            "outreach_preferences"
          )
          .select(
            "automatic_follow_ups"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),

        listScheduledFollowUpsForUser(
          user.id
        ),
      ]);

    if (
      preferenceResult.error
    ) {
      console.error(
        "Could not load outreach preferences:",
        preferenceResult.error
      );
    }

    automaticFollowUps =
      preferenceResult.data
        ?.automatic_follow_ups ??
      false;

    manualFollowUps =
      manualCount;

    manualFollowUpCount =
      manualFollowUps.length;
  }

  const manualFollowUpGroups =
    groupScheduledFollowUps(
      manualFollowUps,
      language
    );

  const resolvedSearchParams =
    searchParams
      ? await searchParams
      : {};

  const gmailParam =
    Array.isArray(
      resolvedSearchParams.gmail
    )
      ? resolvedSearchParams.gmail[0]
      : resolvedSearchParams.gmail;

  const followUpParam =
    Array.isArray(
      resolvedSearchParams.followups
    )
      ? resolvedSearchParams.followups[0]
      : resolvedSearchParams.followups;

  const sentCount =
    Number(
      Array.isArray(
        resolvedSearchParams.sent
      )
        ? resolvedSearchParams.sent[0]
        : resolvedSearchParams.sent ??
          0
    );

  const skippedCount =
    Number(
      Array.isArray(
        resolvedSearchParams.skipped
      )
        ? resolvedSearchParams.skipped[0]
        : resolvedSearchParams.skipped ??
          0
    );

  const failedCount =
    Number(
      Array.isArray(
        resolvedSearchParams.failed
      )
        ? resolvedSearchParams.failed[0]
        : resolvedSearchParams.failed ??
          0
    );

  const gmailConnected =
    Boolean(
      gmailConnection
    );

  const hasGmailSendScope =
    gmailConnection
      ?.scopes
      ?.includes(
        "https://www.googleapis.com/auth/gmail.send"
      ) ??
    false;

  const hasGmailReadScope =
    gmailConnection
      ?.scopes
      ?.includes(
        "https://www.googleapis.com/auth/gmail.readonly"
      ) ??
    false;

  const openAiConfigured =
    Boolean(
      process.env.OPENAI_API_KEY
    );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="min-w-0">
        <p className="text-sm text-muted-foreground">
          {
            text.eyebrow
          }
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {
            text.title
          }
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            text.description
          }
        </p>
      </header>

      {/* ===================================================
          GMAIL MESSAGE
      =================================================== */}

      {gmailParam ===
      "connected" ? (
        <div className="mt-5 flex min-w-0 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 sm:mt-6 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {
                text.gmailConnectedTitle
              }
            </p>

            <p className="mt-0.5 break-words text-xs leading-5 opacity-80">
              {
                text.gmailConnectedDescription
              }
            </p>
          </div>
        </div>
      ) : null}

      {followUpParam ? (
        <div
          className={`mt-5 flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 sm:mt-6 ${
            followUpParam ===
              "send-error" ||
            followUpParam ===
              "preference-error" ||
            failedCount >
              0
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {followUpParam ===
            "send-error" ||
          followUpParam ===
            "preference-error" ||
          failedCount >
            0 ? (
            <Clock3 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {followUpParam ===
              "enabled"
                ? followUpText.enabledMessage
                : followUpParam ===
                    "disabled"
                  ? followUpText.disabledMessage
                  : followUpParam ===
                      "sent"
                    ? `${followUpText.resultSent} ${sentCount} sent · ${skippedCount} skipped · ${failedCount} failed.`
                    : followUpText.errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          SETTINGS
      =================================================== */}

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
        {/* =================================================
            APPEARANCE
        ================================================= */}

        <SettingsSection
          icon={
            MonitorCog
          }
          title={
            text.appearanceTitle
          }
          description={
            text.appearanceDescription
          }
        >
          <div className="min-w-0">
            <ThemeSelector />
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {
              text.appearanceNote
            }
          </p>
        </SettingsSection>

        {/* =================================================
            GMAIL
        ================================================= */}

        <SettingsSection
          icon={
            Mail
          }
          title={
            text.gmailTitle
          }
          description={
            text.gmailDescription
          }
        >
          <div className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="min-w-0 break-all text-sm font-medium">
                  {gmailConnection
                    ?.email_address ??
                    "hello@joelcimpean.com"}
                </p>

                {gmailConnected ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="mr-1 size-3" />

                    {
                      text.connected
                    }
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="shrink-0"
                  >
                    {
                      text.notConnected
                    }
                  </Badge>
                )}
              </div>

              {gmailConnected ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniStatus
                    label={
                      text.sendAccess
                    }
                    active={
                      hasGmailSendScope
                    }
                  />

                  <MiniStatus
                    label={
                      text.inboxSync
                    }
                    active={
                      hasGmailReadScope
                    }
                  />

                  <MiniStatus
                    label={
                      text.oauth
                    }
                    active
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {
                    text.gmailNotConnectedNote
                  }
                </p>
              )}
            </div>

            <a
              href="/api/google/gmail/connect"
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted sm:h-9 sm:w-auto"
            >
              {gmailConnected ? (
                <>
                  <RefreshCw className="size-3.5" />

                  {
                    text.reconnect
                  }
                </>
              ) : (
                text.connectGmail
              )}
            </a>
          </div>
        </SettingsSection>

        {/* =================================================
            AI
        ================================================= */}

        <SettingsSection
          icon={
            Bot
          }
          title={
            text.aiTitle
          }
          description={
            text.aiDescription
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <SettingBox
              label={
                text.provider
              }
              value="OpenAI"
              note="Responses API"
            />

            <SettingBox
              label={
                text.status
              }
              value={
                openAiConfigured
                  ? text.configured
                  : text.notConfigured
              }
              note={
                openAiConfigured
                  ? text.serverKeyDetected
                  : text.serverKeyRequired
              }
            />
          </div>
        </SettingsSection>

        {/* =================================================
            LEAD DISCOVERY
        ================================================= */}

        <SettingsSection
          icon={
            MapPin
          }
          title={
            text.discoveryTitle
          }
          description={
            text.discoveryDescription
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <SettingBox
              label={
                text.localDiscovery
              }
              value="Google Places"
              note={
                text.businessDiscovery
              }
            />

            <SettingBox
              label={
                text.research
              }
              value="Website + AI"
              note={
                text.structuralVisualAnalysis
              }
            />
          </div>
        </SettingsSection>

        {/* =================================================
            RESET LEAD DISCOVERY
        ================================================= */}

        <SettingsSection
          icon={
            Trash2
          }
          title={
            resetText.title
          }
          description={
            resetText.description
          }
        >
          <LeadSearchReset />
        </SettingsSection>

        {/* =================================================
            LANGUAGE
        ================================================= */}

        <SettingsSection
          icon={
            Globe2
          }
          title={
            text.languageTitle
          }
          description={
            text.languageDescription
          }
        >
          <LanguageSelector />

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {
              text.languageNote
            }
          </p>
        </SettingsSection>

        {/* =================================================
            FOLLOW-UP AUTOMATION
        ================================================= */}

        <div
          id="follow-ups"
          className="scroll-mt-6"
        >
        <SettingsSection
          icon={
            Zap
          }
          title={
            followUpText.automationTitle
          }
          description={
            followUpText.automationDescription
          }
        >
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/[0.16] p-4 transition-colors hover:bg-muted/[0.24]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {
                      followUpText.automatic
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {
                      followUpText.automaticNote
                    }
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={
                    automaticFollowUps
                      ? "shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "shrink-0"
                  }
                >
                  {automaticFollowUps
                    ? followUpText.enabled
                    : followUpText.disabled}
                </Badge>
              </div>

              <form
                action={
                  updateAutomaticFollowUps
                }
                className="mt-4"
              >
                <input
                  type="hidden"
                  name="enabled"
                  value={
                    automaticFollowUps
                      ? "false"
                      : "true"
                  }
                />

                <PendingSubmitButton
                  pendingText={
                    automaticFollowUps
                      ? followUpText.disabling
                      : followUpText.enabling
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {
                    automaticFollowUps
                      ? followUpText.disable
                      : followUpText.enable
                  }
                </PendingSubmitButton>
              </form>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/[0.16] p-4 transition-colors hover:bg-muted/[0.24]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {
                      followUpText.dueNow
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {
                      followUpText.dueDescription
                    }
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={
                    manualFollowUpCount >
                    0
                      ? "shrink-0 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                      : "shrink-0"
                  }
                >
                  {
                    manualFollowUpCount
                  }{" "}
                  {
                    followUpText.due
                  }
                </Badge>
              </div>

              {manualFollowUpCount >
              0 ? (
                <form
                  action={
                    sendScheduledFollowUpsNow
                  }
                  className="mt-4"
                >
                  <div className="space-y-2">
                    {manualFollowUpGroups.map(
                      (
                        group
                      ) => (
                        <details
                          key={
                            group.id
                          }
                          open={
                            group.defaultOpen
                          }
                          className="group overflow-hidden rounded-lg border bg-background"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {
                                    group.label
                                  }
                                </span>

                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 text-[10px] font-medium"
                                >
                                  {
                                    group.items.length
                                  }
                                </Badge>
                              </span>

                              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                {
                                  group.description
                                }
                              </span>
                            </span>

                            <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-180">
                              ↓
                            </span>
                          </summary>

                          <div className="border-t">
                            {group.items.map(
                              (
                                followUp,
                                index
                              ) => (
                                <div
                                  key={
                                    followUp.leadId
                                  }
                                  className={`flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50 ${
                                    index >
                                    0
                                      ? "border-t"
                                      : ""
                                  }`}
                                >
                                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                    <input
                                      type="checkbox"
                                      name="leadIds"
                                      value={
                                        followUp.leadId
                                      }
                                      className="mt-0.5 size-4 shrink-0 accent-[#002BBA]"
                                    />

                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium">
                                        {
                                          followUp.companyName
                                        }
                                      </span>

                                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-5 text-muted-foreground">
                                        <span>
                                          {
                                            followUpText.originallyPlanned
                                          }: {
                                            formatBerlinDateTime(
                                              followUp.nextFollowUpAt,
                                              language
                                            )
                                          }
                                        </span>

                                        <span className="font-medium text-foreground/70">
                                          · {
                                            formatRelativeFollowUpTime(
                                              followUp.nextFollowUpAt,
                                              language
                                            )
                                          }
                                        </span>
                                      </span>
                                    </span>
                                  </label>

                                  <button
                                    type="submit"
                                    formAction={
                                      stopSingleScheduledFollowUp.bind(
                                        null,
                                        followUp.leadId
                                      )
                                    }
                                    className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                  >
                                    {
                                      followUpText.stop
                                    }
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </details>
                      )
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {
                      followUpText.selectHint
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PendingSubmitButton
                      pendingText={
                        followUpText.sending
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                      <Send className="size-3.5" />

                      {
                        followUpText.sendSelected
                      }
                    </PendingSubmitButton>

                    <button
                      type="submit"
                      formAction={
                        stopScheduledFollowUps
                      }
                      className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                      {
                        followUpText.stopSelected
                      }
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  {
                    followUpText.noneDue
                  }
                </p>
              )}
            </div>
          </div>
        </SettingsSection>
        </div>

        {/* =================================================
            OUTREACH
        ================================================= */}

        <SettingsSection
          icon={
            Send
          }
          title={
            text.outreachTitle
          }
          description={
            text.outreachDescription
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="follow-up-days">
                {
                  text.defaultFollowUpDelay
                }
              </Label>

              <Input
                id="follow-up-days"
                type="number"
                defaultValue="5"
                disabled
                className="h-11 sm:h-9"
              />

              <p className="text-xs leading-5 text-muted-foreground">
                {
                  text.followUpDelayNote
                }
              </p>
            </div>

            <div className="min-w-0 space-y-2">
              <Label>
                {
                  text.sendingMode
                }
              </Label>

              <div className="flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm sm:min-h-9 sm:py-0">
                {
                  text.humanApprovalRequired
                }
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                {
                  text.automaticSendingDisabled
                }
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* =================================================
            COMPLIANCE
        ================================================= */}

        <SettingsSection
          icon={
            ShieldCheck
          }
          title={
            text.complianceTitle
          }
          description={
            text.complianceDescription
          }
        >
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <SafetyItem
              text={
                text.humanApprovalBeforeSending
              }
            />

            <SafetyItem
              text={
                text.doNotContactSuppression
              }
            />

            <SafetyItem
              text={
                text.noFabricatedContactInformation
              }
            />

            <SafetyItem
              text={
                text.noTrackingPixels
              }
            />

            <SafetyItem
              text={
                text.noDeceptiveSubjects
              }
            />

            <SafetyItem
              text={
                text.activitySendingHistory
              }
            />
          </div>
        </SettingsSection>

        {/* =================================================
            DELIVERABILITY
        ================================================= */}

        <SettingsSection
          icon={
            SlidersHorizontal
          }
          title={
            text.deliverabilityTitle
          }
          description={
            text.deliverabilityDescription
          }
        >
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <DeliverabilityBox
              label="SPF"
              notChecked={
                text.notChecked
              }
              verificationLater={
                text.verificationLater
              }
            />

            <DeliverabilityBox
              label="DKIM"
              notChecked={
                text.notChecked
              }
              verificationLater={
                text.verificationLater
              }
            />

            <DeliverabilityBox
              label="DMARC"
              notChecked={
                text.notChecked
              }
              verificationLater={
                text.verificationLater
              }
            />
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

/* =========================================================
   SETTINGS SECTION
========================================================= */

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon:
    React.ElementType;

  title: string;

  description: string;

  children:
    React.ReactNode;
}) {
  return (
    <Card className="min-w-0 border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(0,0,0,0.025),0_12px_36px_rgba(0,0,0,0.025)]">
      <CardContent className="p-0">
        <div className="flex min-w-0 gap-3 border-b p-4 sm:gap-4 sm:p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.055] text-primary shadow-sm shadow-primary/5">
            <Icon className="size-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {
                title
              }
            </h2>

            <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
              {
                description
              }
            </p>
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          {
            children
          }
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   SETTING BOX
========================================================= */

function SettingBox({
  label,
  value,
  note,
}: {
  label: string;

  value: string;

  note: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/[0.16] p-4 transition-colors hover:bg-muted/[0.24]">
      <p className="text-xs font-medium text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-2 break-words text-sm font-medium">
        {
          value
        }
      </p>

      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
        {
          note
        }
      </p>
    </div>
  );
}

/* =========================================================
   MINI STATUS
========================================================= */

function MiniStatus({
  label,
  active,
}: {
  label: string;

  active: boolean;
}) {
  return (
    <div className="inline-flex min-h-7 items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground">
      <span
        className={
          active
            ? "size-1.5 shrink-0 rounded-full bg-emerald-500"
            : "size-1.5 shrink-0 rounded-full bg-zinc-400"
        }
      />

      {
        label
      }
    </div>
  );
}

/* =========================================================
   SAFETY
========================================================= */

function SafetyItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border p-3">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

      <span className="break-words text-sm leading-5">
        {
          text
        }
      </span>
    </div>
  );
}

/* =========================================================
   DELIVERABILITY
========================================================= */

function DeliverabilityBox({
  label,
  notChecked,
  verificationLater,
}: {
  label: string;

  notChecked: string;

  verificationLater: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/[0.16] p-4 transition-colors hover:bg-muted/[0.24]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {
            label
          }
        </p>

        <Badge
          variant="outline"
          className="shrink-0"
        >
          {
            notChecked
          }
        </Badge>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {
          verificationLater
        }
      </p>
    </div>
  );
}