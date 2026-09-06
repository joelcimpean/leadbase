"use client";

import {
  Archive,
  Check,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import {
  type PointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  archiveLeadConversation,
  markLeadConversationRead,
  moveLeadConversationToTrash,
  permanentlyDeleteLeadConversation,
  restoreLeadConversation,
} from "./actions";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Badge,
} from "@/components/ui/badge";

import {
  getInboxMessageStatusLabel,
  inboxCopy,
} from "@/lib/inbox-i18n";

import type {
  ReplyClassification,
} from "@/lib/reply-intelligence";

/* =========================================================
   TYPES
========================================================= */

export type InboxDensity =
  | "comfortable"
  | "compact"
  | "minimal";

export type InboxConversationListItem = {
  leadId: string;

  href: string;

  company: string;

  contact: string;

  email:
    | string
    | null;

  subject: string;

  preview: string;

  lastTimeLabel: string;

  unread: boolean;

  unreadCount: number;

  status:
    | "Replied"
    | "Sent";

  replyClassification:
    ReplyClassification
    | null;

  initials: string;
};

type ConversationListProps = {
  conversations:
    InboxConversationListItem[];

  selectedLeadId?:
    | string
    | null;

  view:
    | "inbox"
    | "archived"
    | "trash";

  density?: InboxDensity;
};

type SwipeState = {
  leadId:
    | string
    | null;

  offset: number;
};

/* =========================================================
   SWIPE CONFIG
========================================================= */

const SWIPE_ARCHIVE_THRESHOLD =
  88;

const MAX_SWIPE_OFFSET =
  124;

/* =========================================================
   STATUS
========================================================= */

function messageStatusClass(
  status: string
) {
  if (
    status ===
    "Replied"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
}

function replyClassificationMeta(
  value:
    ReplyClassification,
  language:
    string
) {
  const de =
    language ===
    "de";

  switch (
    value
  ) {
    case "INTERESTED":
      return {
        label:
          de
            ? "Interessiert"
            : "Interested",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "QUESTION":
      return {
        label:
          de
            ? "Rückfrage"
            : "Question",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
      };

    case "NOT_INTERESTED":
      return {
        label:
          de
            ? "Absage"
            : "Not interested",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
      };

    case "OUT_OF_OFFICE":
      return {
        label:
          de
            ? "Abwesend"
            : "Out of office",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
      };

    case "FOLLOW_UP_LATER":
      return {
        label:
          de
            ? "Später melden"
            : "Follow up later",
        className:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300",
      };

    case "BOUNCE":
      return {
        label:
          "Bounce",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
      };

    default:
      return {
        label:
          de
            ? "Neutral"
            : "Neutral",
        className:
          "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
      };
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export function ConversationList({
  conversations,
  selectedLeadId = null,
  view,
  density = "compact",
}: ConversationListProps) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const text =
    inboxCopy[
      language
    ].list;

  const [
    selectionMode,
    setSelectionMode,
  ] =
    useState(
      false
    );

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set()
    );

  const [
    hiddenIds,
    setHiddenIds,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set()
    );

  const [
    locallyReadIds,
    setLocallyReadIds,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set()
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    busyLabel,
    setBusyLabel,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    busyAction,
    setBusyAction,
  ] =
    useState<
      | "archive"
      | "trash"
      | "restore"
      | "delete"
      | null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    swipe,
    setSwipe,
  ] =
    useState<SwipeState>({
      leadId:
        null,

      offset:
        0,
    });

  const pointerStartRef =
    useRef<{
      leadId: string;

      x: number;

      y: number;

      horizontal:
        | boolean
        | null;
    } | null>(
      null
    );

  const swipeOffsetRef =
    useRef(
      0
    );

  const suppressClickRef =
    useRef(
      false
    );

  /* =======================================================
     VISIBLE
  ======================================================= */

  const visibleConversations =
    useMemo(
      () =>
        [
          ...conversations,
        ]
          .filter(
            (
              conversation
            ) =>
              !hiddenIds.has(
                conversation.leadId
              )
          )
          .map(
            (
              conversation
            ) =>
              locallyReadIds.has(
                conversation.leadId
              )
                ? {
                    ...conversation,

                    unread:
                      false,

                    unreadCount:
                      0,
                  }
                : conversation
          )
          .sort(
            (
              a,
              b
            ) => {
              /*
               * Gmail-like priority:
               * 1) unread/new replies
               * 2) replied threads
               * 3) preserve incoming newest-first order
               */
              if (
                a.unread !==
                  b.unread
              ) {
                return a.unread
                  ? -1
                  : 1;
              }

              if (
                a.status !==
                  b.status
              ) {
                return a.status ===
                  "Replied"
                  ? -1
                  : 1;
              }

              return 0;
            }
          ),
      [
        conversations,
        hiddenIds,
        locallyReadIds,
      ]
    );

  const allSelected =
    visibleConversations.length >
      0 &&
    visibleConversations.every(
      (
        conversation
      ) =>
        selectedIds.has(
          conversation.leadId
        )
    );

  /* =======================================================
     SELECTION
  ======================================================= */

  function startSelectionMode() {
    setSelectionMode(
      true
    );

    setMessage(
      null
    );
  }

  function closeSelectionMode() {
    setSelectionMode(
      false
    );

    setSelectedIds(
      new Set()
    );

    setMessage(
      null
    );
  }

  function toggleSelected(
    leadId: string
  ) {
    if (
      busy
    ) {
      return;
    }

    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            leadId
          )
        ) {
          next.delete(
            leadId
          );
        } else {
          next.add(
            leadId
          );
        }

        return next;
      }
    );
  }

  function toggleSelectAll() {
    if (
      busy
    ) {
      return;
    }

    if (
      allSelected
    ) {
      setSelectedIds(
        new Set()
      );

      return;
    }

    setSelectedIds(
      new Set(
        visibleConversations.map(
          (
            conversation
          ) =>
            conversation.leadId
        )
      )
    );
  }

  /* =======================================================
     BULK ACTION
  ======================================================= */

  async function runBulkAction(
    action:
      | "archive"
      | "trash"
      | "restore"
      | "delete"
  ) {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    if (
      action ===
      "delete"
    ) {
      const confirmMessage =
        ids.length ===
        1
          ? text.deleteConfirmOne
          : text.deleteConfirmMany.replace(
              "{count}",
              String(
                ids.length
              )
            );

      if (
        !window.confirm(
          confirmMessage
        )
      ) {
        return;
      }
    }

    setBusy(
      true
    );

    setBusyAction(
      action
    );

    setMessage(
      null
    );

    setBusyLabel(
      action ===
      "archive"
        ? text.archiving.replace(
            "{count}",
            String(
              ids.length
            )
          )
        : action ===
            "restore"
          ? text.restoring.replace(
              "{count}",
              String(
                ids.length
              )
            )
          : action ===
              "delete"
            ? text.deleting.replace(
                "{count}",
                String(
                  ids.length
                )
              )
            : text.movingToTrash.replace(
                "{count}",
                String(
                  ids.length
                )
              )
    );

    /*
     * OPTIMISTIC UI:
     * remove the rows immediately instead of waiting for
     * Supabase + revalidation. This makes the inbox feel
     * Gmail-fast even while the server finishes the update.
     */
    setHiddenIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        for (
          const id of
          ids
        ) {
          next.add(
            id
          );
        }

        return next;
      }
    );

    setSelectedIds(
      new Set()
    );

    setSelectionMode(
      false
    );

    try {
      await Promise.all(
        ids.map(
          (
            leadId
          ) => {
            if (
              action ===
              "archive"
            ) {
              return archiveLeadConversation(
                leadId
              );
            }

            if (
              action ===
              "restore"
            ) {
              return restoreLeadConversation(
                leadId
              );
            }

            if (
              action ===
              "delete"
            ) {
              return permanentlyDeleteLeadConversation(
                leadId
              );
            }

            return moveLeadConversationToTrash(
              leadId
            );
          }
        )
      );

      if (
        action ===
        "archive"
      ) {
        setMessage(
          ids.length ===
          1
            ? text.archivedOne
            : text.archivedMany.replace(
                "{count}",
                String(
                  ids.length
                )
              )
        );
      } else if (
        action ===
        "restore"
      ) {
        setMessage(
          ids.length ===
          1
            ? text.restoredOne
            : text.restoredMany.replace(
                "{count}",
                String(
                  ids.length
                )
              )
        );
      } else if (
        action ===
        "delete"
      ) {
        setMessage(
          ids.length ===
          1
            ? text.deletedOne
            : text.deletedMany.replace(
                "{count}",
                String(
                  ids.length
                )
              )
        );
      } else {
        setMessage(
          ids.length ===
          1
            ? text.trashedOne
            : text.trashedMany.replace(
                "{count}",
                String(
                  ids.length
                )
              )
        );
      }

      /*
       * No router.refresh() here.
       * The optimistic state already reflects the action and
       * the next navigation/server render reads fresh data.
       */
    } catch (
      error
    ) {
      console.error(
        "Inbox bulk action failed:",
        error
      );

      /*
       * Roll back the optimistic hide if the server call
       * itself throws.
       */
      setHiddenIds(
        (
          current
        ) => {
          const next =
            new Set(
              current
            );

          for (
            const id of
            ids
          ) {
            next.delete(
              id
            );
          }

          return next;
        }
      );

      setMessage(
        text.updateFailed
      );
    } finally {
      setBusy(
        false
      );

      setBusyAction(
        null
      );

      setBusyLabel(
        null
      );
    }
  }

  /* =======================================================
     SWIPE
  ======================================================= */

  function handlePointerDown(
    event:
      PointerEvent<HTMLDivElement>,

    leadId: string
  ) {
    if (
      selectionMode ||
      busy ||
      event.pointerType !==
        "touch" ||
      view !==
        "inbox"
    ) {
      return;
    }

    pointerStartRef.current =
      {
        leadId,

        x:
          event.clientX,

        y:
          event.clientY,

        horizontal:
          null,
      };

    swipeOffsetRef.current =
      0;

    suppressClickRef.current =
      false;

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    } catch {
      // Pointer capture is optional.
    }

    setSwipe({
      leadId,

      offset:
        0,
    });
  }

  function handlePointerMove(
    event:
      PointerEvent<HTMLDivElement>,

    leadId: string
  ) {
    const start =
      pointerStartRef.current;

    if (
      !start ||
      start.leadId !==
        leadId
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      start.x;

    const deltaY =
      event.clientY -
      start.y;

    if (
      start.horizontal ===
      null
    ) {
      if (
        Math.abs(
          deltaX
        ) <
          7 &&
        Math.abs(
          deltaY
        ) <
          7
      ) {
        return;
      }

      start.horizontal =
        Math.abs(
          deltaX
        ) >
        Math.abs(
          deltaY
        );
    }

    if (
      !start.horizontal
    ) {
      return;
    }

    const offset =
      Math.min(
        MAX_SWIPE_OFFSET,

        Math.max(
          0,
          deltaX
        )
      );

    swipeOffsetRef.current =
      offset;

    setSwipe({
      leadId,

      offset,
    });
  }

  async function finishSwipe(
    leadId:
      string
  ) {
    const finalOffset =
      swipeOffsetRef.current;

    const shouldArchive =
      finalOffset >=
      SWIPE_ARCHIVE_THRESHOLD;

    if (
      finalOffset >
      8
    ) {
      suppressClickRef.current =
        true;

      window.setTimeout(
        () => {
          suppressClickRef.current =
            false;
        },
        300
      );
    }

    pointerStartRef.current =
      null;

    swipeOffsetRef.current =
      0;

    if (
      !shouldArchive
    ) {
      setSwipe({
        leadId:
          null,

        offset:
          0,
      });

      return;
    }

    setBusy(
      true
    );

    setBusyAction(
      "archive"
    );

    setBusyLabel(
      text.archivingSingle
    );

    /*
     * Hide immediately. Server work happens in the background.
     */
    setHiddenIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        next.add(
          leadId
        );

        return next;
      }
    );

    setSwipe({
      leadId,

      offset:
        MAX_SWIPE_OFFSET,
    });

    try {
      await archiveLeadConversation(
        leadId
      );

      setMessage(
        text.threadArchived
      );
    } catch (
      error
    ) {
      console.error(
        "Swipe archive failed:",
        error
      );

      setHiddenIds(
        (
          current
        ) => {
          const next =
            new Set(
              current
            );

          next.delete(
            leadId
          );

          return next;
        }
      );

      setMessage(
        text.archiveFailed
      );
    } finally {
      setSwipe({
        leadId:
          null,

        offset:
          0,
      });

      setBusy(
        false
      );

      setBusyAction(
        null
      );

      setBusyLabel(
        null
      );
    }
  }

  function handlePointerCancel() {
    pointerStartRef.current =
      null;

    swipeOffsetRef.current =
      0;

    setSwipe({
      leadId:
        null,

      offset:
        0,
    });
  }

  /* =======================================================
     OPEN THREAD
  ======================================================= */

  function openConversation(
    conversation:
      InboxConversationListItem
  ) {
    if (
      suppressClickRef.current
    ) {
      return;
    }

    if (
      selectionMode
    ) {
      toggleSelected(
        conversation.leadId
      );

      return;
    }

    if (
      swipe.offset >
      8
    ) {
      return;
    }

    /*
     * Gmail behavior:
     * opening an unread thread marks it read immediately in
     * the UI. The database update runs without blocking the
     * navigation.
     */
    if (
      conversation.unread &&
      !locallyReadIds.has(
        conversation.leadId
      )
    ) {
      setLocallyReadIds(
        (
          current
        ) => {
          const next =
            new Set(
              current
            );

          next.add(
            conversation.leadId
          );

          return next;
        }
      );

      void markLeadConversationRead(
        conversation.leadId
      ).catch(
        (
          error
        ) => {
          console.error(
            "Could not auto-mark conversation as read:",
            error
          );

          setLocallyReadIds(
            (
              current
            ) => {
              const next =
                new Set(
                  current
                );

              next.delete(
                conversation.leadId
              );

              return next;
            }
          );
        }
      );
    }

    router.push(
      conversation.href
    );
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    visibleConversations.length ===
    0
  ) {
    return (
      <>
        {message ? (
          <div className="border-b bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground md:hidden">
            {
              message
            }
          </div>
        ) : null}

        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">
            {
              text.noConversations
            }
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {
              text.folderEmpty
            }
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ===================================================
          MOBILE ACTION BAR
      =================================================== */}

      <div className="sticky top-0 z-20 border-b bg-background md:hidden">
        {!selectionMode ? (
          <div className="flex h-11 items-center justify-between px-4">
            <p className="text-xs text-muted-foreground">
              {view ===
              "inbox"
                ? text.swipeToArchive
                : text.selectForActions}
            </p>

            <button
              type="button"
              onClick={
                startSelectionMode
              }
              className="h-8 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              {
                text.select
              }
            </button>
          </div>
        ) : (
          <div className="flex min-h-12 items-center gap-2 px-3 py-2">
            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                closeSelectionMode
              }
              className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
              aria-label={
                text.cancelSelection
              }
            >
              <X className="size-4" />
            </button>

            <p className="min-w-0 flex-1 text-sm font-medium">
              {
                selectedIds.size
              }{" "}
              {
                text.selected
              }
            </p>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                toggleSelectAll
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Check className="size-3.5" />

              {allSelected
                ? text.clear
                : text.all}
            </button>

            {view ===
            "inbox" ? (
              <button
                type="button"
                disabled={
                  busy ||
                  selectedIds.size ===
                    0
                }
                onClick={() =>
                  void runBulkAction(
                    "archive"
                  )
                }
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-40"
                aria-label={
                  text.archiveSelected
                }
                title={
                  text.archiveSelected
                }
              >
                {busy &&
                busyAction ===
                  "archive" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Archive className="size-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy ||
                  selectedIds.size ===
                    0
                }
                onClick={() =>
                  void runBulkAction(
                    "restore"
                  )
                }
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-40"
                aria-label={
                  text.restoreSelected
                }
                title={
                  text.restoreSelectedToInbox
                }
              >
                {busy &&
                busyAction ===
                  "restore" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
              </button>
            )}

            <button
              type="button"
              disabled={
                busy ||
                selectedIds.size ===
                  0
              }
              onClick={() =>
                void runBulkAction(
                  view ===
                  "trash"
                    ? "delete"
                    : "trash"
                )
              }
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-red-600 disabled:opacity-40"
              aria-label={
                view ===
                "trash"
                  ? text.deleteSelectedPermanently
                  : text.deleteSelected
              }
              title={
                view ===
                "trash"
                  ? text.deleteSelectedPermanently
                  : text.moveSelectedToTrash
              }
            >
              {busy &&
              (busyAction ===
                "trash" ||
                busyAction ===
                  "delete") ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        )}

        {busyLabel ? (
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            {
              busyLabel
            }
          </div>
        ) : message ? (
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            {
              message
            }
          </div>
        ) : null}
      </div>

      {/* ===================================================
          DESKTOP BULK ACTION BAR
      =================================================== */}

      <div className="hidden min-h-11 items-center gap-2 border-b bg-background px-3 py-2 md:flex">
        {!selectionMode ? (
          <>
            <button
              type="button"
              onClick={
                startSelectionMode
              }
              className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <Check className="size-3.5" />

              {
                text.select
              }
            </button>

            <span className="text-[11px] text-muted-foreground">
              {visibleConversations.length}{" "}
              {visibleConversations.length ===
              1
                ? "Konversation"
                : "Konversationen"}
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                closeSelectionMode
              }
              className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
              aria-label={
                text.cancelSelection
              }
            >
              <X className="size-4" />
            </button>

            <p className="min-w-0 text-xs font-medium">
              {
                selectedIds.size
              }{" "}
              {
                text.selected
              }
            </p>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                toggleSelectAll
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Check className="size-3.5" />

              {allSelected
                ? text.clear
                : text.all}
            </button>

            <div className="ml-auto flex items-center gap-1">
              {view ===
              "inbox" ? (
                <button
                  type="button"
                  disabled={
                    busy ||
                    selectedIds.size ===
                      0
                  }
                  onClick={() =>
                    void runBulkAction(
                      "archive"
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {busy &&
                  busyAction ===
                    "archive" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}

                  {
                    text.archive
                  }
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    busy ||
                    selectedIds.size ===
                      0
                  }
                  onClick={() =>
                    void runBulkAction(
                      "restore"
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {busy &&
                  busyAction ===
                    "restore" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}

                  {language ===
                  "de"
                    ? "Wiederherstellen"
                    : "Restore"}
                </button>
              )}

              <button
                type="button"
                disabled={
                  busy ||
                  selectedIds.size ===
                    0
                }
                onClick={() =>
                  void runBulkAction(
                    view ===
                    "trash"
                      ? "delete"
                      : "trash"
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600 disabled:opacity-40"
              >
                {busy &&
                (
                  busyAction ===
                    "trash" ||
                  busyAction ===
                    "delete"
                ) ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}

                {view ===
                "trash"
                  ? text.deleteSelectedPermanently
                  : text.deleteSelected}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ===================================================
          THREADS
      =================================================== */}

      {visibleConversations.map(
        (
          conversation
        ) => {
          const selected =
            selectedIds.has(
              conversation.leadId
            );

          const offset =
            swipe.leadId ===
            conversation.leadId
              ? swipe.offset
              : 0;

          return (
            <div
              key={
                conversation.leadId
              }
              className="relative overflow-hidden border-b"
            >
              {view ===
              "inbox" ? (
                <div className="absolute inset-0 flex items-center bg-emerald-500/15 px-5 text-emerald-600 dark:text-emerald-400 md:hidden">
                  <Archive className="size-5" />

                  <span className="ml-2 text-xs font-semibold">
                    {
                      text.archive
                    }
                  </span>
                </div>
              ) : null}

              <div
                role="button"
                tabIndex={
                  0
                }
                onClick={() =>
                  openConversation(
                    conversation
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key ===
                      " "
                  ) {
                    event.preventDefault();

                    openConversation(
                      conversation
                    );
                  }
                }}
                onPointerDown={(
                  event
                ) =>
                  handlePointerDown(
                    event,
                    conversation.leadId
                  )
                }
                onPointerMove={(
                  event
                ) =>
                  handlePointerMove(
                    event,
                    conversation.leadId
                  )
                }
                onPointerUp={() =>
                  void finishSwipe(
                    conversation.leadId
                  )
                }
                onPointerCancel={
                  handlePointerCancel
                }
                style={{
                  transform:
                    offset >
                    0
                      ? `translateX(${offset}px)`
                      : undefined,

                  touchAction:
                    "pan-y",

                  transition:
                    swipe.leadId ===
                    conversation.leadId
                      ? "none"
                      : undefined,
                }}
                className={`relative flex cursor-pointer bg-background outline-none transition-[background-color,transform] duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring md:translate-x-0 ${
                  density === "comfortable"
                    ? "gap-3 px-4 py-4"
                    : density === "compact"
                      ? "gap-3 px-4 py-3"
                      : "gap-2.5 px-4 py-2.5"
                } ${
                  selected
                    ? "bg-muted/70"
                    : selectedLeadId ===
                        conversation.leadId
                      ? "md:bg-muted/70"
                      : ""
                }`}
              >
                {selectionMode ? (
                  <div className="flex size-9 shrink-0 items-center justify-center">
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background"
                      }`}
                    >
                      {selected ? (
                        <Check className="size-3" />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full border bg-background font-semibold ${
                      density === "minimal"
                        ? "size-7 text-[10px]"
                        : "size-9 text-xs"
                    }`}
                  >
                    {
                      conversation.initials
                    }
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <p
                      className={`truncate text-sm ${
                        conversation.unread
                          ? "font-semibold"
                          : "font-medium"
                      }`}
                    >
                      {
                        conversation.company
                      }
                    </p>

                    <span className="shrink-0 text-[11px] text-muted-foreground sm:text-xs">
                      {
                        conversation.lastTimeLabel
                      }
                    </span>
                  </div>

                  {density !== "minimal" ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {
                        conversation.contact
                      }
                    </p>
                  ) : null}

                  <p
                    className={`${
                      density === "comfortable"
                        ? "mt-2.5"
                        : density === "compact"
                          ? "mt-1.5"
                          : "mt-0.5"
                    } truncate text-sm ${
                      conversation.unread
                        ? "font-semibold"
                        : ""
                    }`}
                  >
                    {
                      conversation.subject
                    }
                  </p>

                  {density === "comfortable" ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {
                        conversation.preview
                      }
                    </p>
                  ) : density === "compact" ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {
                        conversation.preview
                      }
                    </p>
                  ) : null}

                  <div
                    className={`${
                      density === "comfortable"
                        ? "mt-3"
                        : density === "compact"
                          ? "mt-2"
                          : "mt-1.5"
                    } flex flex-wrap items-center gap-2`}
                  >
                    {density !== "minimal" ? (
                      <Badge
                        variant="outline"
                        className={
                          messageStatusClass(
                            conversation.status
                          )
                        }
                      >
                        {getInboxMessageStatusLabel(
                          conversation.status,
                          language
                        )}
                      </Badge>
                    ) : null}

                    {density !== "minimal" && conversation.replyClassification ? (
                      <Badge
                        variant="outline"
                        className={
                          replyClassificationMeta(
                            conversation.replyClassification,
                            language
                          ).className
                        }
                      >
                        {
                          replyClassificationMeta(
                            conversation.replyClassification,
                            language
                          ).label
                        }
                      </Badge>
                    ) : null}

                    {conversation.unread ? (
                      <>
                        <span className="size-2 rounded-full bg-blue-500" />

                        {conversation.unreadCount >
                        1 ? (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            {
                              conversation.unreadCount
                            }{" "}
                            {
                              text.new
                            }
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        }
      )}
    </>
  );
}