"use client";

import {
  AlignJustify,
  List,
  Search,
  Rows3,
} from "lucide-react";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ConversationList,
  type InboxConversationListItem,
  type InboxDensity,
} from "./conversation-list";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Input,
} from "@/components/ui/input";

/* =========================================================
   TYPES
========================================================= */

type InboxListPaneProps = {
  conversations: InboxConversationListItem[];
  selectedLeadId?: string | null;
  view: "inbox" | "archived" | "trash";
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
  initialQuery = "",
  searchPlaceholder,
}: InboxListPaneProps) {
  const {
    language,
  } =
    useLanguage();

  const de =
    language ===
    "de";

  const [
    query,
    setQuery,
  ] = useState(
    initialQuery
  );

  const [
    density,
    setDensity,
  ] = useState<InboxDensity>(
    "compact"
  );

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        DENSITY_STORAGE_KEY
      );

    if (
      isInboxDensity(
        stored
      )
    ) {
      setDensity(
        stored
      );
    }
  }, []);

  function selectDensity(
    next: InboxDensity
  ) {
    setDensity(
      next
    );

    window.localStorage.setItem(
      DENSITY_STORAGE_KEY,
      next
    );
  }

  function changeQuery(
    value: string
  ) {
    setQuery(
      value
    );

    /*
     * Keep the URL useful without triggering a Next.js
     * navigation/server render for every keystroke.
     */
    const url = new URL(
      window.location.href
    );

    if (
      value.trim()
    ) {
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
    query
      .trim()
      .toLowerCase();

  const filtered =
    useMemo(
      () => {
        const source =
          normalizedQuery
            ? conversations.filter(
                (
                  conversation
                ) =>
                  [
                    conversation.company,
                    conversation.contact,
                    conversation.email,
                    conversation.subject,
                    conversation.preview,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")
                    .toLowerCase()
                    .includes(
                      normalizedQuery
                    )
              )
            : conversations;

        return source.map(
          (
            conversation
          ) => ({
            ...conversation,
            href:
              typeof window ===
              "undefined"
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

  return (
    <>
      <div className="border-b p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) =>
                changeQuery(
                  event.target.value
                )
              }
              placeholder={
                searchPlaceholder
              }
              className="pl-9"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="hidden shrink-0 items-center rounded-xl border bg-background/80 p-1 shadow-sm sm:flex">
            <DensityButton
              active={
                density ===
                "comfortable"
              }
              label={de ? "Komfortabel" : "Comfortable"}
              onClick={() =>
                selectDensity(
                  "comfortable"
                )
              }
            >
              <Rows3 className="size-4" />
            </DensityButton>

            <DensityButton
              active={
                density ===
                "compact"
              }
              label={de ? "Kompakt" : "Compact"}
              onClick={() =>
                selectDensity(
                  "compact"
                )
              }
            >
              <List className="size-4" />
            </DensityButton>

            <DensityButton
              active={
                density ===
                "minimal"
              }
              label="Minimal"
              onClick={() =>
                selectDensity(
                  "minimal"
                )
              }
            >
              <AlignJustify className="size-4" />
            </DensityButton>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>
            {filtered.length}{" "}
            {filtered.length === 1
              ? de
                ? "Konversation"
                : "conversation"
              : de
                ? "Konversationen"
                : "conversations"}
          </span>

          {normalizedQuery ? (
            <button
              type="button"
              onClick={() =>
                changeQuery("")
              }
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {de
                ? "Suche löschen"
                : "Clear search"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              {de
                ? "Keine Treffer"
                : "No results"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {de
                ? "Suche nach Firma, Kontakt, Betreff oder Inhalt."
                : "Search company, contact, subject or message content."}
            </p>
          </div>
        ) : (
          <ConversationList
            conversations={
              filtered
            }
            selectedLeadId={
              selectedLeadId
            }
            view={view}
            density={density}
          />
        )}
      </div>
    </>
  );
}

function DensityButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
