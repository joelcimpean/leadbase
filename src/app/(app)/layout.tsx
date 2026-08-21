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

  let gmailAutoSyncEnabled =
    false;

  /* =======================================================
     USER DATA
  ======================================================= */

  if (user) {
    const [
      unreadResult,
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

    /* =====================================================
       UNREAD COUNT
    ===================================================== */

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

    /* =====================================================
       GMAIL AUTO SYNC
    ===================================================== */

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
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        {/* =================================================
            NAVIGATION
        ================================================= */}

        <AppSidebar
          unreadInboxCount={
            unreadInboxCount
          }
        />

        {/* =================================================
            GMAIL SYNC
        ================================================= */}

        <InboxAutoSync
          enabled={
            gmailAutoSyncEnabled
          }
        />

        {/* =================================================
            CONTENT

            Mobile:
            pt-14 creates room for the fixed mobile header.

            Desktop:
            md:pt-0 removes that space because the sidebar
            navigation is used instead.
        ================================================= */}

        <main className="min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}