import {
    AppSidebar,
  } from "@/components/app-sidebar";
  
  import {
    InboxAutoSync,
  } from "@/components/inbox-auto-sync";
  
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
    const supabase =
      await createClient();
  
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
  
    if (
      user
    ) {
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
  
      if (
        unreadResult.error
      ) {
        console.error(
          "Could not load unread inbox count:",
          unreadResult.error
        );
      }
  
      if (
        gmailResult.error
      ) {
        console.error(
          "Could not load Gmail sync status:",
          gmailResult.error
        );
      }
  
      unreadInboxCount =
        unreadResult.count ??
        0;
  
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
  
    return (
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <AppSidebar
          unreadInboxCount={
            unreadInboxCount
          }
        />
  
        <InboxAutoSync
          enabled={
            gmailAutoSyncEnabled
          }
        />
  
        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }