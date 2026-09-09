"use client";

import {
  Check,
  Rows3,
  Search,
} from "lucide-react";
import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ConversationList,
  type InboxConversationListItem,
  type InboxDensity,
} from "./conversation-list";
import styles from "./inbox-precision.module.css";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

type InboxListPaneProps = {
  conversations: InboxConversationListItem[];
  selectedLeadId?: string | null;
  view: "inbox" | "archived" | "trash";
  counts: {
    inbox: number;
    archived: number;
    trash: number;
  };
  initialQuery?: string;
  searchPlaceholder: string;
};

/* =========================================================
   STORAGE
========================================================= */

const DENSITY_STORAGE_KEY =
  "leadbase:inbox-density";

function isInboxDensity(
  value: string | null
): value is InboxDensity {
  return (
    value === "comfortable" ||
    value === "compact" ||
    value === "minimal"
  );
}

function updateHrefQuery(
  href: string,
  query: string
) {
  try {
    const url = new URL(
      href,
      window.location.origin
    );

    if (query) {
      url.searchParams.set(
        "q",
        query
      );
    } else {
      url.searchParams.delete(
        "q"
      );
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export function InboxListPane({
  conversations,
  selectedLeadId = null,
  view,
  counts,
  initialQuery = "",
  searchPlaceholder,
}: InboxListPaneProps) {
  const { language } =
    useLanguage();

  const de =
    language === "de";

  const [query, setQuery] =
    useState(initialQuery);

  const [density, setDensity] =
    useState<InboxDensity>("compact");

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        DENSITY_STORAGE_KEY
      );

    if (isInboxDensity(stored)) {
      setDensity(stored);
    }
  }, []);

  function selectDensity(
    next: InboxDensity
  ) {
    setDensity(next);
    window.localStorage.setItem(
      DENSITY_STORAGE_KEY,
      next
    );
  }

  function cycleDensity() {
    selectDensity(
      density === "compact"
        ? "minimal"
        : density === "minimal"
          ? "comfortable"
          : "compact"
    );
  }

  function changeQuery(
    value: string
  ) {
    setQuery(value);

    const url = new URL(
      window.location.href
    );

    if (value.trim()) {
      url.searchParams.set(
        "q",
        value.trim()
      );
    } else {
      url.searchParams.delete(
        "q"
      );
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}`
    );
  }

  const normalizedQuery =
    query.trim().toLowerCase();

  const filtered = useMemo(
    () => {
      const source =
        normalizedQuery
          ? conversations.filter(
              (conversation) =>
                [
                  conversation.company,
                  conversation.contact,
                  conversation.email,
                  conversation.subject,
                  conversation.preview,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
                  .includes(normalizedQuery)
            )
          : conversations;

      return source.map(
        (conversation) => ({
          ...conversation,
          href:
            typeof window === "undefined"
              ? conversation.href
              : updateHrefQuery(
                  conversation.href,
                  query.trim()
                ),
        })
      );
    },
    [
      conversations,
      normalizedQuery,
      query,
    ]
  );

  const unread =
    filtered.filter(
      (conversation) => conversation.unread
    ).length;

  const densityLabel =
    density === "compact"
      ? de
        ? "Kompakt"
        : "Compact"
      : density === "comfortable"
        ? de
          ? "Komfortabel"
          : "Comfortable"
        : "Minimal";

  return (
    <>
      <nav
        className={styles.folderTabs}
        aria-label={de ? "Postfach" : "Mailbox"}
      >
        <div className={styles.folderTabsInner}>
          <MailboxTab
            href="/inbox"
            active={view === "inbox"}
            label={de ? "Posteingang" : "Inbox"}
            count={counts.inbox}
          />
          <MailboxTab
            href="/inbox?view=archived"
            active={view === "archived"}
            label={de ? "Archiviert" : "Archived"}
            count={counts.archived}
          />
          <MailboxTab
            href="/inbox?view=trash"
            active={view === "trash"}
            label={de ? "Papierkorb" : "Trash"}
            count={counts.trash}
          />
        </div>
      </nav>

      <div className={styles.listHeader}>
        <div className={styles.searchRow}>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--lb-text-muted)]" />
            <input
              value={query}
              onChange={(event) =>
                changeQuery(event.target.value)
              }
              placeholder={searchPlaceholder}
              className="h-[30px] 2xl:h-[34px] w-full rounded-[9px] border border-[var(--lb-border)] bg-[var(--lb-surface-subtle)] pl-8 2xl:pl-8.5 pr-2.5 text-[12px] 2xl:text-[13px] text-[var(--lb-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--lb-text-muted)] focus:border-[#002BBA]/35 focus:bg-[var(--lb-surface)] focus:shadow-[0_0_0_3px_rgba(0,43,186,0.07)]"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new Event("leadbase:inbox-select")
              )
            }
            className="inline-flex h-[30px] 2xl:h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] border border-[var(--lb-border)] bg-[var(--lb-surface)] px-2.5 2xl:px-3 text-[11.5px] 2xl:text-[12.5px] font-medium text-[var(--lb-text-secondary)] transition-colors hover:border-[var(--lb-border-strong)] hover:bg-[var(--lb-surface-subtle)]"
          >
            <Check className="size-3" />
            {de ? "Auswählen" : "Select"}
          </button>

          {normalizedQuery ? (
            <button
              type="button"
              onClick={() => changeQuery("")}
              className="h-[30px] 2xl:h-[34px] shrink-0 rounded-[9px] border border-[var(--lb-border)] bg-[var(--lb-surface)] px-2.5 2xl:px-3 text-[11.5px] 2xl:text-[12.5px] font-medium text-[var(--lb-text-secondary)] hover:border-[var(--lb-border-strong)]"
            >
              {de ? "Leeren" : "Clear"}
            </button>
          ) : null}
        </div>

        <div className={styles.listMetaRow}>
          <span>
            {filtered.length} {de ? "Konversationen" : "conversations"}
            {unread > 0 ? ` · ${unread} ${de ? "ungelesen" : "unread"}` : ""}
          </span>

          <button
            type="button"
            onClick={cycleDensity}
            className={styles.densityButton}
            title={
              de
                ? "Darstellungsdichte wechseln"
                : "Change display density"
            }
          >
            <Rows3 className="size-3" />
            {densityLabel}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-left">
            <p className="text-[13px] font-medium text-[var(--lb-text)]">
              {de ? "Keine Treffer" : "No results"}
            </p>
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--lb-text-muted)]">
              {de
                ? "Suche nach Firma, Kontakt, Betreff oder Inhalt."
                : "Search company, contact, subject or message content."}
            </p>
          </div>
        ) : (
          <ConversationList
            conversations={filtered}
            selectedLeadId={selectedLeadId}
            view={view}
            density={density}
          />
        )}
      </div>
    </>
  );
}

function MailboxTab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`${styles.folderTab} ${
        active ? styles.folderTabActive : ""
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 font-mono text-[9.5px] 2xl:text-[10.5px]">{count}</span>
    </Link>
  );
}
