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
  AppShell,
} from "@/components/app-shell";

import {
  InboxAutoSync,
} from "@/components/inbox-auto-sync";

import {
  LanguageProvider,
} from "@/components/language-provider";

import {
  AppLanguageBridge,
} from "@/components/app-language-bridge";

import {
  NotificationRealtimeBridge,
} from "@/components/notification-realtime-bridge";

import {
  LeadbaseInteractionMotion,
} from "@/components/leadbase-interaction-motion";

import {
  ActivityHeartbeat,
} from "@/components/activity-heartbeat";

import {
  BackgroundTaskDock,
} from "@/components/background-task-dock";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

const GMAIL_READ_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

type ActiveSidebarCampaign = {
  id: string;
  name: string;
  status: string | null;
  target_industry: string | null;
  target_geography: string | null;
  leadCount: number;
};

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

  let leadCount =
    0;

  let activeCampaign: ActiveSidebarCampaign | null =
    null;

  if (user) {
    const [
      unreadResult,
      notificationResult,
      gmailResult,
      leadCountResult,
      campaignsResult,
      campaignLeadsResult,
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

        supabase
          .from(
            "leads"
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
          ),

        supabase
          .from(
            "campaigns"
          )
          .select(`
            id,
            name,
            status,
            target_industry,
            target_geography,
            created_at
          `)
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(12),

        supabase
          .from(
            "leads"
          )
          .select(
            "campaign_id"
          )
          .eq(
            "user_id",
            user.id
          )
          .not(
            "campaign_id",
            "is",
            null
          ),
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

    if (
      leadCountResult.error
    ) {
      console.error(
        "Could not load sidebar lead count:",
        leadCountResult.error
      );
    }

    leadCount =
      leadCountResult.count ??
      0;

    if (
      campaignsResult.error
    ) {
      console.error(
        "Could not load sidebar campaigns:",
        campaignsResult.error
      );
    }

    if (
      campaignLeadsResult.error
    ) {
      console.error(
        "Could not load sidebar campaign lead counts:",
        campaignLeadsResult.error
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

    const campaignLeadCounts =
      new Map<string, number>();

    for (
      const lead of
      campaignLeadsResult.data ?? []
    ) {
      if (
        !lead.campaign_id
      ) {
        continue;
      }

      campaignLeadCounts.set(
        lead.campaign_id,
        (
          campaignLeadCounts.get(
            lead.campaign_id
          ) ?? 0
        ) + 1
      );
    }

    const campaignRows =
      campaignsResult.data ?? [];

    const featuredCampaign =
      campaignRows.find(
        (
          campaign
        ) =>
          campaign.status ===
          "ACTIVE"
      ) ??
      campaignRows.find(
        (
          campaign
        ) =>
          campaign.status ===
          "PAUSED"
      ) ??
      campaignRows[0] ??
      null;

    if (
      featuredCampaign
    ) {
      activeCampaign = {
        id:
          featuredCampaign.id,
        name:
          featuredCampaign.name,
        status:
          featuredCampaign.status,
        target_industry:
          featuredCampaign.target_industry,
        target_geography:
          featuredCampaign.target_geography,
        leadCount:
          campaignLeadCounts.get(
            featuredCampaign.id
          ) ?? 0,
      };
    }
  }

  return (
    <LanguageProvider
      initialLanguage={
        language
      }
    >
      <AppNotificationProvider>
        <AppBackgroundTasksProvider>
          <AppShell
            sidebar={
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
                leadCount={
                  leadCount
                }
                activeCampaign={
                  activeCampaign
                }
              />
            }
          >
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

            <AppLanguageBridge />

            <ActivityHeartbeat />

            <BackgroundTaskDock />

            {children}
          </AppShell>
        </AppBackgroundTasksProvider>
      </AppNotificationProvider>
    </LanguageProvider>
  );
}
