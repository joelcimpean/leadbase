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
  updateFollowUpDelay,
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
  listAllScheduledFollowUpsForUser,
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

import {
  CompactAppearanceLanguage,
  FollowUpDelayControl,
  IntegrationIcon,
  SettingsSubLabel,
  SettingsWorkspace,
  StatusBadge,
  WorkspaceIdentity,
} from "./settings-workspace-client";

import styles from "./settings-precision.module.css";

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

  let followUpDelayDays =
    5;

  let manualFollowUps:
    ScheduledFollowUpCandidate[] =
    [];

  let allScheduledFollowUps:
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
      allScheduled,
    ] =
      await Promise.all([
        supabase
          .from(
            "outreach_preferences"
          )
          .select(
            "automatic_follow_ups, follow_up_delay_days"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),

        listScheduledFollowUpsForUser(
          user.id
        ),

        listAllScheduledFollowUpsForUser(
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

    const storedFollowUpDelayDays =
      Number(
        preferenceResult.data
          ?.follow_up_delay_days
      );

    followUpDelayDays =
      Number.isInteger(
        storedFollowUpDelayDays
      ) &&
      storedFollowUpDelayDays >= 1 &&
      storedFollowUpDelayDays <= 30
        ? storedFollowUpDelayDays
        : 5;

    manualFollowUps =
      manualCount;

    allScheduledFollowUps =
      allScheduled;

    manualFollowUpCount =
      manualFollowUps.length;
  }

  const manualFollowUpGroups =
    groupScheduledFollowUps(
      manualFollowUps,
      language
    );

  const allScheduledFollowUpGroups =
    groupScheduledFollowUps(
      allScheduledFollowUps,
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

  const googlePlacesConfigured =
    Boolean(
      process.env.GOOGLE_PLACES_API_KEY
    );

  let crmLeadCount = 0;
  let discoveredCompanyCount = 0;
  let openCandidateCount = 0;

  if (user) {
    const [
      leadCountResult,
      candidateCountResult,
      openCandidateCountResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("lead_candidates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("lead_candidates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "DISCOVERED"),
    ]);

    if (leadCountResult.error) {
      console.error("Could not count CRM leads:", leadCountResult.error);
    }
    if (candidateCountResult.error) {
      console.error("Could not count discovered companies:", candidateCountResult.error);
    }
    if (openCandidateCountResult.error) {
      console.error("Could not count open lead candidates:", openCandidateCountResult.error);
    }

    crmLeadCount = leadCountResult.count ?? 0;
    discoveredCompanyCount = candidateCountResult.count ?? 0;
    openCandidateCount = openCandidateCountResult.count ?? 0;
  }

  const integrationReadyCount =
    Number(gmailConnected) +
    Number(openAiConfigured) +
    Number(googlePlacesConfigured);

  const metadataName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name;

  const workspaceName =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : "Joel Cimpean";

  const workspaceEmail =
    user?.email ??
    gmailConnection?.email_address ??
    "hello@joelcimpean.com";

  const notice =
    gmailParam === "connected" ? (
      <span>
        {language === "de"
          ? "Gmail wurde verbunden. Postfach und Versandberechtigungen sind aktualisiert."
          : "Gmail was connected. Mailbox and sending permissions are up to date."}
      </span>
    ) : followUpParam ? (
      <span>
        {followUpParam === "enabled"
          ? followUpText.enabledMessage
          : followUpParam === "disabled"
            ? followUpText.disabledMessage
            : followUpParam === "sent"
              ? `${followUpText.resultSent} ${sentCount} sent · ${skippedCount} skipped · ${failedCount} failed.`
              : followUpText.errorMessage}
      </span>
    ) : undefined;

  return (
    <SettingsWorkspace
      language={language}
      integrationReadyCount={integrationReadyCount}
      integrationTotal={3}
      notice={notice}
      general={
        <GeneralSettingsPanel
          language={language}
          workspaceName={workspaceName}
          workspaceEmail={workspaceEmail}
        />
      }
      integrations={
        <IntegrationsPanel
          language={language}
          gmailConnected={gmailConnected}
          gmailEmail={gmailConnection?.email_address ?? workspaceEmail}
          hasGmailSendScope={hasGmailSendScope}
          hasGmailReadScope={hasGmailReadScope}
          openAiConfigured={openAiConfigured}
          googlePlacesConfigured={googlePlacesConfigured}
        />
      }
      automation={
        <AutomationPanel
          language={language}
          text={text}
          followUpText={followUpText}
          automaticFollowUps={automaticFollowUps}
          followUpDelayDays={followUpDelayDays}
          manualFollowUpCount={manualFollowUpCount}
          manualFollowUpGroups={manualFollowUpGroups}
          allScheduledFollowUpCount={allScheduledFollowUps.length}
          allScheduledFollowUpGroups={allScheduledFollowUpGroups}
        />
      }
      safety={
        <SafetyPanel
          language={language}
          text={text}
        />
      }
      data={
        <DataPanel
          language={language}
          discoveredCompanyCount={discoveredCompanyCount}
          openCandidateCount={openCandidateCount}
          crmLeadCount={crmLeadCount}
        />
      }
    />
  );
}

function GeneralSettingsPanel({
  language,
  workspaceName,
  workspaceEmail,
}: {
  language: "de" | "en";
  workspaceName: string;
  workspaceEmail: string;
}) {
  return (
    <>
      <CompactAppearanceLanguage />
      <div className={styles.generalRows} style={{ paddingTop: 0 }}>
        <WorkspaceIdentity
          name={workspaceName}
          email={workspaceEmail}
          language={language}
        />
      </div>
    </>
  );
}

function IntegrationsPanel({
  language,
  gmailConnected,
  gmailEmail,
  hasGmailSendScope,
  hasGmailReadScope,
  openAiConfigured,
  googlePlacesConfigured,
}: {
  language: "de" | "en";
  gmailConnected: boolean;
  gmailEmail: string;
  hasGmailSendScope: boolean;
  hasGmailReadScope: boolean;
  openAiConfigured: boolean;
  googlePlacesConfigured: boolean;
}) {
  const de = language === "de";

  const gmailCapabilities = [
    hasGmailSendScope ? (de ? "Senden" : "Send") : null,
    hasGmailReadScope ? (de ? "Posteingang-Sync" : "Inbox sync") : null,
    gmailConnected ? "OAuth" : null,
  ].filter(Boolean).join(", ");

  return (
    <div className={styles.panelPad}>
      <div className={styles.integrationRow}>
        <div className={styles.integrationRowTop}>
          <IntegrationIcon>
            <Mail size={16} strokeWidth={1.8} />
          </IntegrationIcon>
          <div className={styles.integrationMain}>
            <div className={styles.integrationTitleLine}>
              <span className={styles.integrationTitle}>Gmail</span>
              <StatusBadge state={gmailConnected ? "ready" : "quiet"}>
                {gmailConnected ? (de ? "Verbunden" : "Connected") : (de ? "Nicht verbunden" : "Not connected")}
              </StatusBadge>
            </div>
            <div className={styles.integrationMeta}>
              {gmailEmail}
              {gmailConnected && gmailCapabilities ? ` · ${gmailCapabilities}` : ""}
            </div>
          </div>
          <a href="/api/google/gmail/connect" className={styles.actionButton}>
            <RefreshCw size={13} strokeWidth={1.8} />
            {gmailConnected ? (de ? "Neu verbinden" : "Reconnect") : (de ? "Verbinden" : "Connect")}
          </a>
        </div>
      </div>

      <div className={styles.integrationRow}>
        <div className={styles.integrationRowTop}>
          <IntegrationIcon>
            <Bot size={16} strokeWidth={1.8} />
          </IntegrationIcon>
          <div className={styles.integrationMain}>
            <div className={styles.integrationTitleLine}>
              <span className={styles.integrationTitle}>{de ? "KI · OpenAI" : "AI · OpenAI"}</span>
              <StatusBadge state={openAiConfigured ? "ready" : "warning"}>
                {openAiConfigured ? (de ? "Konfiguriert" : "Configured") : (de ? "Nicht konfiguriert" : "Not configured")}
              </StatusBadge>
            </div>
            <div className={styles.integrationMeta}>
              {openAiConfigured
                ? (de ? "Responses API · serverseitiger API-Key erkannt" : "Responses API · server-side API key detected")
                : (de ? "Serverseitiger API-Key fehlt" : "Server-side API key missing")}
            </div>
          </div>
          <SettingsSubLabel>{de ? "Kein Key im Browser" : "No key in browser"}</SettingsSubLabel>
        </div>
        <div className={styles.chipRow}>
          <span className={styles.chipLabel}>{de ? "Verwendet für" : "Used for"}</span>
          <span className={styles.chip}>{de ? "Website-Analyse" : "Website analysis"}</span>
          <span className={styles.chip}>{de ? "Unternehmens-Recherche" : "Company research"}</span>
          <span className={styles.chip}>{de ? "Outreach-Entwürfe" : "Outreach drafts"}</span>
          <span className={styles.chip}>{de ? "Angebots-Autofill" : "Proposal autofill"}</span>
        </div>
      </div>

      <div className={styles.integrationRow}>
        <div className={styles.integrationRowTop}>
          <IntegrationIcon>
            <MapPin size={16} strokeWidth={1.8} />
          </IntegrationIcon>
          <div className={styles.integrationMain}>
            <div className={styles.integrationTitleLine}>
              <span className={styles.integrationTitle}>{de ? "Lead-Suche" : "Lead discovery"}</span>
            </div>
            <div className={styles.integrationMeta}>
              {de
                ? "Quellen, die zum Finden und Recherchieren von Unternehmen verwendet werden."
                : "Sources used to find and research companies."}
            </div>
          </div>
        </div>

        <div className={styles.sourceList}>
          <div className={styles.sourceItem}>
            <MapPin size={14} strokeWidth={1.8} />
            <div className={styles.sourceCopy}>
              <strong>Google Places</strong>
              <span>{de ? "Lokale Unternehmenssuche" : "Local company discovery"}</span>
            </div>
            <StatusBadge state={googlePlacesConfigured ? "ready" : "warning"}>
              {googlePlacesConfigured ? (de ? "Aktiv" : "Active") : (de ? "Fehlt" : "Missing")}
            </StatusBadge>
          </div>
          <div className={styles.sourceItem}>
            <SlidersHorizontal size={14} strokeWidth={1.8} />
            <div className={styles.sourceCopy}>
              <strong>{de ? "Website + KI" : "Website + AI"}</strong>
              <span>{de ? "Strukturelle und visuelle Analyse" : "Structural and visual analysis"}</span>
            </div>
            <StatusBadge state={openAiConfigured ? "ready" : "warning"}>
              {openAiConfigured ? (de ? "Aktiv" : "Active") : (de ? "Fehlt" : "Missing")}
            </StatusBadge>
          </div>
          <div className={styles.sourceItem}>
            <MonitorCog size={14} strokeWidth={1.8} />
            <div className={styles.sourceCopy}>
              <strong>{de ? "Website-Preview / Screenshots" : "Website preview / screenshots"}</strong>
              <span>{de ? "Erfassung real gerenderter Seiten" : "Capture of real rendered pages"}</span>
            </div>
            <StatusBadge state="paused">{de ? "Pausiert" : "Paused"}</StatusBadge>
          </div>
        </div>
      </div>
    </div>
  );
}

type SettingsCopy =
  | typeof languageCopy["de"]["settings"]
  | typeof languageCopy["en"]["settings"];

type FollowUpCopy = {
  automationTitle: string;
  automationDescription: string;
  automatic: string;
  enabled: string;
  disabled: string;
  enable: string;
  disable: string;
  enabling: string;
  disabling: string;
  automaticNote: string;
  dueNow: string;
  dueDescription: string;
  sendNow: string;
  sending: string;
  due: string;
  originallyPlanned: string;
  selectHint: string;
  sendSelected: string;
  stop: string;
  stopSelected: string;
  noneDue: string;
  resultSent: string;
  enabledMessage: string;
  disabledMessage: string;
  errorMessage: string;
};

function AutomationPanel({
  language,
  text,
  followUpText,
  automaticFollowUps,
  followUpDelayDays,
  manualFollowUpCount,
  manualFollowUpGroups,
  allScheduledFollowUpCount,
  allScheduledFollowUpGroups,
}: {
  language: "de" | "en";
  text: SettingsCopy;
  followUpText: FollowUpCopy;
  automaticFollowUps: boolean;
  followUpDelayDays: number;
  manualFollowUpCount: number;
  manualFollowUpGroups: FollowUpGroup[];
  allScheduledFollowUpCount: number;
  allScheduledFollowUpGroups: FollowUpGroup[];
}) {
  const de = language === "de";

  return (
    <div id="follow-ups" className={styles.panelPad}>
      <div className={styles.automationRow}>
        <div className={styles.automationCopy}>
          <strong>{followUpText.automatic}</strong>
          <span>{followUpText.automaticNote}</span>
        </div>
        <form action={updateAutomaticFollowUps}>
          <input type="hidden" name="enabled" value={automaticFollowUps ? "false" : "true"} />
          <PendingSubmitButton
            pendingText={automaticFollowUps ? followUpText.disabling : followUpText.enabling}
            className={styles.actionButton}
          >
            <Zap size={13} strokeWidth={1.8} />
            {automaticFollowUps ? followUpText.disable : followUpText.enable}
          </PendingSubmitButton>
        </form>
      </div>

      <div className={styles.automationRow}>
        <div className={styles.automationCopy}>
          <strong>{text.defaultFollowUpDelay}</strong>
          <span>
            {de
              ? "Tage nach einer neu gesendeten Outreach-Mail, bevor das Standard-Follow-up geplant wird. Bereits geplante Follow-ups werden nicht nachträglich verschoben."
              : "Days after a newly sent outreach email before the default follow-up is scheduled. Existing scheduled follow-ups are not moved retroactively."}
          </span>
        </div>
        <FollowUpDelayControl
          value={followUpDelayDays}
          language={language}
          action={updateFollowUpDelay}
        />
      </div>

      <div className={styles.followUpBox}>
        <div className={styles.followUpBoxHeader}>
          <strong>{followUpText.dueNow}</strong>
          <span>{manualFollowUpCount} {followUpText.due}</span>
        </div>

        {manualFollowUpCount > 0 ? (
          <form action={sendScheduledFollowUpsNow}>
            {manualFollowUpGroups.map((group) => (
              <details key={group.id} className={styles.followUpGroup} open={group.defaultOpen}>
                <summary>
                  <Clock3 size={13} strokeWidth={1.8} />
                  <span>{group.label}</span>
                  <span>{group.items.length}</span>
                </summary>
                {group.items.map((followUp) => (
                  <div key={followUp.leadId} className={styles.followUpItem}>
                    <label>
                      <input type="checkbox" name="leadIds" value={followUp.leadId} />
                      <span className={styles.followUpItemCopy}>
                        <strong>{followUp.companyName}</strong>
                        <span>
                          {followUpText.originallyPlanned}: {formatBerlinDateTime(followUp.nextFollowUpAt, language)} · {formatRelativeFollowUpTime(followUp.nextFollowUpAt, language)}
                        </span>
                      </span>
                    </label>
                    <button
                      type="submit"
                      formAction={stopSingleScheduledFollowUp.bind(null, followUp.leadId)}
                      className={styles.actionButtonWarn}
                    >
                      {followUpText.stop}
                    </button>
                  </div>
                ))}
              </details>
            ))}

            <div className={styles.followUpActions}>
              <PendingSubmitButton pendingText={followUpText.sending} className={styles.actionButtonPrimary}>
                <Send size={13} strokeWidth={1.8} />
                {followUpText.sendSelected}
              </PendingSubmitButton>
              <button type="submit" formAction={stopScheduledFollowUps} className={styles.actionButtonQuiet}>
                {followUpText.stopSelected}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.followUpItem}>
            <span className={styles.integrationMeta}>{followUpText.noneDue}</span>
          </div>
        )}
      </div>

      <details className={styles.allFollowUps}>
        <summary>
          <span>
            <Clock3 size={13} strokeWidth={1.8} />
            {de ? "Alle geplanten Follow-ups ansehen" : "View all scheduled follow-ups"}
          </span>
          <span>{allScheduledFollowUpCount}</span>
        </summary>

        {allScheduledFollowUpCount > 0 ? (
          <div className={styles.allFollowUpsBody}>
            {allScheduledFollowUpGroups.map((group) => (
              <div key={group.id} className={styles.allFollowUpGroup}>
                <div className={styles.allFollowUpGroupHeader}>
                  <strong>{group.label}</strong>
                  <span>{group.items.length}</span>
                </div>

                {group.items.map((followUp) => (
                  <a
                    key={followUp.leadId}
                    href={`/leads/${followUp.leadId}`}
                    className={styles.allFollowUpItem}
                  >
                    <span className={styles.followUpItemCopy}>
                      <strong>{followUp.companyName}</strong>
                      <span>
                        {formatBerlinDateTime(followUp.nextFollowUpAt, language)} · {formatRelativeFollowUpTime(followUp.nextFollowUpAt, language)}
                      </span>
                    </span>
                    {followUp.smartFollowUpMode ? (
                      <span className={styles.followUpModeBadge}>{followUp.smartFollowUpMode}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.allFollowUpsEmpty}>
            {de ? "Aktuell sind keine Follow-ups geplant." : "There are currently no scheduled follow-ups."}
          </div>
        )}
      </details>
    </div>
  );
}

function SafetyPanel({
  language,
  text,
}: {
  language: "de" | "en";
  text: SettingsCopy;
}) {
  const de = language === "de";
  const safetyItems = [
    text.humanApprovalBeforeSending,
    text.doNotContactSuppression,
    text.noFabricatedContactInformation,
    text.noTrackingPixels,
    text.noDeceptiveSubjects,
    text.activitySendingHistory,
  ];

  return (
    <div className={styles.panelPadData}>
      <div className={styles.safetyGrid}>
        {safetyItems.map((item) => (
          <div key={item} className={styles.safetyItem}>
            <span className={styles.safetyCheck}>
              <CheckCircle2 size={12} strokeWidth={2} />
            </span>
            {item}
          </div>
        ))}
      </div>

      <div className={styles.deliverability}>
        <div className={styles.sectionKicker}>{text.deliverabilityTitle}</div>
        <div className={styles.deliveryList}>
          {["SPF", "DKIM", "DMARC"].map((label) => (
            <div key={label} className={styles.deliveryItem}>
              <strong>{label}</strong>
              <span>{text.notChecked}</span>
            </div>
          ))}
        </div>
        <p className={styles.deliveryNote}>
          {de
            ? "Die automatische DNS-Prüfung ist noch nicht implementiert – die Werte bleiben bis dahin unverifiziert."
            : "Automatic DNS verification is not implemented yet, so these values remain unverified for now."}
        </p>
      </div>
    </div>
  );
}

function DataPanel({
  language,
  discoveredCompanyCount,
  openCandidateCount,
  crmLeadCount,
}: {
  language: "de" | "en";
  discoveredCompanyCount: number;
  openCandidateCount: number;
  crmLeadCount: number;
}) {
  const de = language === "de";

  const rows = [
    {
      label: de ? "Gefundene Unternehmen" : "Discovered companies",
      note: de ? "Suchhistorie, die Duplikate in neuen Suchen verhindert." : "Search history that prevents duplicates in new searches.",
      value: discoveredCompanyCount,
    },
    {
      label: de ? "Offene Suchkandidaten" : "Open search candidates",
      note: de ? "Ergebnisse, die noch auf Prüfung warten." : "Results still waiting for review.",
      value: openCandidateCount,
    },
    {
      label: de ? "CRM-Leads" : "CRM leads",
      note: de ? "Bleiben bei einem Reset vollständig erhalten." : "Remain fully intact during a reset.",
      value: crmLeadCount,
    },
  ];

  return (
    <div className={styles.panelPadData}>
      <div className={styles.dataList}>
        {rows.map((row) => (
          <div key={row.label} className={styles.dataItem}>
            <div className={styles.dataItemCopy}>
              <strong>{row.label}</strong>
              <span>{row.note}</span>
            </div>
            <span className={styles.dataValue}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.criticalArea}>
        <div className={styles.criticalLabel}>
          <Clock3 size={14} strokeWidth={1.8} />
          <span>{de ? "Kritischer Bereich" : "Critical area"}</span>
        </div>
        <LeadSearchReset />
      </div>
    </div>
  );
}
