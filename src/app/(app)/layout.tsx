import {
  AppBackgroundTasksProvider,
} from "@/components/app-background-tasks";

import {
  AppNotificationProvider,
} from "@/components/app-notifications";

import {
  AppSidebar,
} from "@/components/app-sidebar";

import {
  InboxAutoSync,
} from "@/components/inbox-auto-sync";

import {
  LanguageProvider,
} from "@/components/language-provider";

import {
  NotificationRealtimeBridge,
} from "@/components/notification-realtime-bridge";

import {
  LeadbaseInteractionMotion,
} from "@/components/leadbase-interaction-motion";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   CONFIG
========================================================= */

const GMAIL_READ_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

/* =========================================================
   LAYOUT
========================================================= */

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [
    supabase,
    language,
  ] = await Promise.all([
    createClient(),
    getAppLanguage(),
  ]);

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  let unreadInboxCount =
    0;

  let unreadNotificationCount =
    0;

  let gmailAutoSyncEnabled =
    false;

  /* =======================================================
     USER DATA
  ======================================================= */

  if (user) {
    const [
      unreadResult,
      notificationResult,
      gmailResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "email_messages"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "direction",
            "INCOMING"
          )
          .is(
            "read_at",
            null
          ),

        supabase
          .from(
            "app_notifications"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .eq(
            "user_id",
            user.id
          )
          .is(
            "read_at",
            null
          ),

        supabase
          .from(
            "gmail_connections"
          )
          .select(
            "scopes"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),
      ]);

    if (
      unreadResult.error
    ) {
      console.error(
        "Could not load unread inbox count:",
        unreadResult.error
      );
    }

    unreadInboxCount =
      unreadResult.count ??
      0;

    if (
      notificationResult.error
    ) {
      console.error(
        "Could not load unread notification count:",
        notificationResult.error
      );
    }

    unreadNotificationCount =
      notificationResult.count ??
      0;

    if (
      gmailResult.error
    ) {
      console.error(
        "Could not load Gmail sync status:",
        gmailResult.error
      );
    }

    const scopes =
      Array.isArray(
        gmailResult.data
          ?.scopes
      )
        ? gmailResult.data
            .scopes
        : [];

    gmailAutoSyncEnabled =
      scopes.includes(
        GMAIL_READ_SCOPE
      );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <LanguageProvider
      initialLanguage={
        language
      }
    >
      <AppNotificationProvider>
        <AppBackgroundTasksProvider>
          <div className="flex h-dvh w-full overflow-hidden bg-background">
            <AppSidebar
              userId={
                user?.id ?? null
              }
              unreadInboxCount={
                unreadInboxCount
              }
              unreadNotificationCount={
                unreadNotificationCount
              }
            />

            {user ? (
              <NotificationRealtimeBridge
                userId={user.id}
              />
            ) : null}

            <InboxAutoSync
              enabled={
                gmailAutoSyncEnabled
              }
            />

            <LeadbaseInteractionMotion />

            <main className="min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0">
              {children}
            </main>
          </div>
        </AppBackgroundTasksProvider>
      </AppNotificationProvider>
    </LanguageProvider>
  );
}
