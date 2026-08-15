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
} from "lucide-react";

import {
  ThemeSelector,
} from "@/components/theme-selector";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

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
  const supabase =
    await createClient();

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

  if (user) {
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

    if (error) {
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
    <div className="mx-auto w-full max-w-[1200px] px-8 py-8 lg:px-10 lg:py-10">
      {/* HEADER */}

      <header>
        <p className="text-sm text-muted-foreground">
          Workspace
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage integrations, appearance, language, outreach preferences and workspace settings.
        </p>
      </header>

      {/* GMAIL MESSAGE */}

      {gmailParam ===
      "connected" ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />

          <div>
            <p className="text-sm font-medium">
              Gmail connected successfully
            </p>

            <p className="mt-0.5 text-xs opacity-80">
              Your Google Workspace mailbox is ready.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        {/* APPEARANCE */}

        <SettingsSection
          icon={
            MonitorCog
          }
          title="Appearance"
          description="Choose how Joel Leados looks on this device."
        >
          <ThemeSelector />

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            System automatically follows your operating system&apos;s light or dark appearance.
          </p>
        </SettingsSection>

        {/* GMAIL */}

        <SettingsSection
          icon={Mail}
          title="Gmail"
          description="Connect your Google Workspace mailbox for sending and synchronizing lead conversations."
        >
          <div className="flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {gmailConnection
                    ?.email_address ??
                    "hello@joelcimpean.com"}
                </p>

                {gmailConnected ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="mr-1 size-3" />

                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Not connected
                  </Badge>
                )}
              </div>

              {gmailConnected ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniStatus
                    label="Send access"
                    active={
                      hasGmailSendScope
                    }
                  />

                  <MiniStatus
                    label="Inbox sync"
                    active={
                      hasGmailReadScope
                    }
                  />

                  <MiniStatus
                    label="OAuth"
                    active
                  />
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect Google OAuth before sending outreach emails.
                </p>
              )}
            </div>

            <a
              href="/api/google/gmail/connect"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              {gmailConnected ? (
                <>
                  <RefreshCw className="size-3.5" />

                  Reconnect
                </>
              ) : (
                "Connect Gmail"
              )}
            </a>
          </div>
        </SettingsSection>

        {/* AI */}

        <SettingsSection
          icon={Bot}
          title="AI"
          description="AI is used for website analysis, research and personalized email drafts."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingBox
              label="Provider"
              value="OpenAI"
              note="Responses API"
            />

            <SettingBox
              label="Status"
              value={
                openAiConfigured
                  ? "Configured"
                  : "Not configured"
              }
              note={
                openAiConfigured
                  ? "Server-side API key detected"
                  : "Server-side API key required"
              }
            />
          </div>
        </SettingsSection>

        {/* LEAD DISCOVERY */}

        <SettingsSection
          icon={MapPin}
          title="Lead discovery"
          description="Sources used to discover and research businesses."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingBox
              label="Local discovery"
              value="Google Places"
              note="Business discovery"
            />

            <SettingBox
              label="Research"
              value="Website + AI"
              note="Structural and visual analysis"
            />
          </div>
        </SettingsSection>

        {/* LANGUAGE */}

        <SettingsSection
          icon={Globe2}
          title="Language"
          description="Choose the language used by the Joel Leados interface."
        >
          <div className="flex flex-wrap gap-2">
            <Button>
              English
            </Button>

            <Button variant="outline">
              Deutsch
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Language switching will become functional when internationalization is added.
          </p>
        </SettingsSection>

        {/* OUTREACH */}

        <SettingsSection
          icon={Send}
          title="Outreach"
          description="Control how email drafts and follow-ups behave."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="follow-up-days">
                Default follow-up delay
              </Label>

              <Input
                id="follow-up-days"
                type="number"
                defaultValue="5"
                disabled
              />

              <p className="text-xs text-muted-foreground">
                Days after sending before a follow-up is prepared.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Sending mode
              </Label>

              <div className="flex h-9 items-center rounded-lg border px-3 text-sm">
                Human approval required
              </div>

              <p className="text-xs text-muted-foreground">
                Automatic sending is disabled.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* COMPLIANCE */}

        <SettingsSection
          icon={ShieldCheck}
          title="Compliance & safety"
          description="Safeguards applied before outreach can be sent."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SafetyItem text="Human approval before sending" />

            <SafetyItem text="Do Not Contact suppression" />

            <SafetyItem text="No fabricated contact information" />

            <SafetyItem text="No tracking pixels in V1" />

            <SafetyItem text="No deceptive Re: or Fwd: subjects" />

            <SafetyItem text="Activity and sending history" />
          </div>
        </SettingsSection>

        {/* DELIVERABILITY */}

        <SettingsSection
          icon={SlidersHorizontal}
          title="Deliverability"
          description="Monitor the technical health of your sending domain and mailbox."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <DeliverabilityBox label="SPF" />

            <DeliverabilityBox label="DKIM" />

            <DeliverabilityBox label="DMARC" />
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

  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <div className="flex gap-4 border-b p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
            <Icon className="size-4" />
          </div>

          <div>
            <h2 className="text-sm font-semibold">
              {title}
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="p-5">
          {children}
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
  label:
    string;

  value:
    string;

  note:
    string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {note}
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
  label:
    string;

  active:
    boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground">
      <span
        className={
          active
            ? "size-1.5 rounded-full bg-emerald-500"
            : "size-1.5 rounded-full bg-zinc-400"
        }
      />

      {label}
    </div>
  );
}

/* =========================================================
   SAFETY
========================================================= */

function SafetyItem({
  text,
}: {
  text:
    string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

      <span className="text-sm">
        {text}
      </span>
    </div>
  );
}

/* =========================================================
   DELIVERABILITY
========================================================= */

function DeliverabilityBox({
  label,
}: {
  label:
    string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {label}
        </p>

        <Badge variant="outline">
          Not checked
        </Badge>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Verification will be added later.
      </p>
    </div>
  );
}