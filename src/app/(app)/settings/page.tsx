import {
  Bot,
  CheckCircle2,
  Globe2,
  Mail,
  MapPin,
  MonitorCog,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import {
  LanguageSelector,
} from "@/components/language-selector";

import {
  LeadSearchReset,
} from "./lead-search-reset";

import {
  ThemeSelector,
} from "@/components/theme-selector";

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
  }>;
};

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
  }

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
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-0">
        <div className="flex min-w-0 gap-3 border-b p-4 sm:gap-4 sm:p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
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
    <div className="min-w-0 rounded-xl border p-4">
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
    <div className="min-w-0 rounded-xl border p-4">
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