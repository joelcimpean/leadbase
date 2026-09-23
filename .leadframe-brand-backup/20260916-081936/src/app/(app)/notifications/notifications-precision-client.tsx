"use client";

import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CircleCheckBig,
  CircleX,
  Clock3,
  FileWarning,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import type { AppLanguage } from "@/lib/i18n";

import {
  clearReadNotifications,
  markAllNotificationsRead,
  markNotificationReadById,
} from "./actions";
import styles from "./notifications-precision.module.css";
import type { NotificationPageItem } from "./page";

type Filter = "all" | "unread";

type NotificationGroup = {
  key: string;
  label: string;
  items: NotificationPageItem[];
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const notificationCopy = {
  de: {
    eyebrow: "Aktivität",
    title: "Benachrichtigungen",
    description: "Zusagen, Absagen und wichtige Angebots-Ereignisse aus Leadbase – auch wenn du gerade nicht angemeldet bist.",
    noEntries: "Keine Einträge",
    unread: "ungelesen",
    total: "gesamt",
    allRead: "Alles gelesen",
    noNotifications: "Keine Benachrichtigungen",
    notifications: "Benachrichtigungen",
    deleteRead: "Gelesene löschen",
    deleteDialogLabel: "Gelesene Benachrichtigungen löschen",
    deleteQuestion: (count: number) => `${count} gelesene löschen?`,
    deleteHint: "Ungelesene Benachrichtigungen bleiben erhalten. Der Vorgang lässt sich nicht rückgängig machen.",
    delete: "Löschen",
    cancel: "Abbrechen",
    all: "Alle",
    filterLabel: "Benachrichtigungen filtern",
    markAll: "Alle als gelesen markieren",
    newest: "Neueste zuerst · Aufbewahrung unbegrenzt",
    markRead: "Als gelesen markieren",
    open: "Öffnen",
    emptyTitle: "Keine Benachrichtigungen",
    emptyBody: "Wichtige Aktivitäten wie angenommene oder abgelehnte Angebote erscheinen hier.",
    doneTitle: "Alles erledigt",
    doneBody: "Du hast keine ungelesenen Benachrichtigungen.",
    showAll: "Alle anzeigen",
    footer: "Zusage und Absage kommen aus dem öffentlichen Angebot · Öffnen führt zum jeweiligen Angebot",
    today: "Heute",
    yesterday: "Gestern",
    thisWeek: "Diese Woche",
    older: "Älter",
    updateOneError: "Benachrichtigung konnte nicht aktualisiert werden.",
    updateAllError: "Benachrichtigungen konnten nicht aktualisiert werden.",
    deleteError: "Gelesene Benachrichtigungen konnten nicht gelöscht werden.",
    titles: {
      PROPOSAL_ACCEPTED: "Angebot angenommen",
      PROPOSAL_DECLINED: "Angebot abgelehnt",
      PROPOSAL_PDF_FAILED: "PDF-Mail fehlgeschlagen",
      PROPOSAL_SENT: "Angebot gesendet",
      PROPOSAL_EXPIRING: "Angebot läuft bald ab",
      PROPOSAL_EXPIRED: "Angebot abgelaufen",
    },
  },
  en: {
    eyebrow: "Activity",
    title: "Notifications",
    description: "Acceptances, declines and important proposal events from Leadbase – even when you are not signed in.",
    noEntries: "No entries",
    unread: "unread",
    total: "total",
    allRead: "All read",
    noNotifications: "No notifications",
    notifications: "notifications",
    deleteRead: "Delete read",
    deleteDialogLabel: "Delete read notifications",
    deleteQuestion: (count: number) => `Delete ${count} read ${count === 1 ? "notification" : "notifications"}?`,
    deleteHint: "Unread notifications stay untouched. This action cannot be undone.",
    delete: "Delete",
    cancel: "Cancel",
    all: "All",
    filterLabel: "Filter notifications",
    markAll: "Mark all as read",
    newest: "Newest first · Retained indefinitely",
    markRead: "Mark as read",
    open: "Open",
    emptyTitle: "No notifications",
    emptyBody: "Important activity such as accepted or declined proposals will appear here.",
    doneTitle: "All caught up",
    doneBody: "You have no unread notifications.",
    showAll: "Show all",
    footer: "Acceptances and declines come from the public proposal · Open takes you to the related proposal",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This week",
    older: "Older",
    updateOneError: "The notification could not be updated.",
    updateAllError: "Notifications could not be updated.",
    deleteError: "Read notifications could not be deleted.",
    titles: {
      PROPOSAL_ACCEPTED: "Proposal accepted",
      PROPOSAL_DECLINED: "Proposal declined",
      PROPOSAL_PDF_FAILED: "PDF email failed",
      PROPOSAL_SENT: "Proposal sent",
      PROPOSAL_EXPIRING: "Proposal expires soon",
      PROPOSAL_EXPIRED: "Proposal expired",
    },
  },
} as const;

function dateKey(value: Date) {
  return dateKeyFormatter.format(value);
}

function keyToUtcDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function mondayKey(key: string) {
  const date = keyToUtcDate(key);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function yesterdayKey(todayKey: string) {
  const date = keyToUtcDate(todayKey);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function groupFor(createdAt: string, now: Date, language: AppLanguage) {
  const itemKey = dateKey(new Date(createdAt));
  const today = dateKey(now);
  const copy = notificationCopy[language];

  if (itemKey === today) return { key: "today", label: copy.today };
  if (itemKey === yesterdayKey(today)) return { key: "yesterday", label: copy.yesterday };
  if (itemKey >= mondayKey(today)) return { key: "week", label: copy.thisWeek };
  return { key: "older", label: copy.older };
}

function notificationTime(createdAt: string, now: Date, language: AppLanguage) {
  const date = new Date(createdAt);
  const locale = language === "de" ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (dateKey(date) === dateKey(now)) {
    return `${notificationCopy[language].today}, ${timeFormatter.format(date)}`;
  }

  return `${dateFormatter.format(date).replace(/\.$/, "")}, ${timeFormatter.format(date)}`;
}

function displayTitle(item: NotificationPageItem, language: AppLanguage) {
  const titles = notificationCopy[language].titles as Partial<Record<string, string>>;
  const mapped = titles[item.kind];
  return mapped ?? item.title.split(" · ")[0] ?? item.title;
}

function notificationVisual(kind: string) {
  switch (kind) {
    case "PROPOSAL_ACCEPTED":
      return { Icon: CircleCheckBig, tone: styles.toneAccepted };
    case "PROPOSAL_DECLINED":
      return { Icon: CircleX, tone: styles.toneDeclined };
    case "PROPOSAL_SENT":
      return { Icon: Send, tone: styles.toneSent };
    case "PROPOSAL_EXPIRING":
    case "PROPOSAL_EXPIRED":
      return { Icon: Clock3, tone: styles.toneExpiring };
    case "PROPOSAL_PDF_FAILED":
      return { Icon: FileWarning, tone: styles.toneExpiring };
    default:
      return { Icon: Bell, tone: styles.toneInfo };
  }
}

function notifySidebarCountChanged() {
  window.dispatchEvent(new Event("leadbase:persistent-notifications-changed"));
}

export function NotificationsPrecisionClient({
  initialNotifications,
}: {
  initialNotifications: NotificationPageItem[];
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = notificationCopy[language];
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState(initialNotifications);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setItems(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const unreadCount = useMemo(
    () => items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0),
    [items]
  );
  const readCount = items.length - unreadCount;
  const visibleItems = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.readAt) : items),
    [filter, items]
  );

  const groups = useMemo<NotificationGroup[]>(() => {
    const order = ["today", "yesterday", "week", "older"];
    const bucket = new Map<string, NotificationGroup>();

    for (const item of visibleItems) {
      const group = groupFor(item.createdAt, now, language);
      const current = bucket.get(group.key) ?? {
        key: group.key,
        label: group.label,
        items: [],
      };
      current.items.push(item);
      bucket.set(group.key, current);
    }

    return order
      .map((key) => bucket.get(key))
      .filter((group): group is NotificationGroup => Boolean(group));
  }, [language, now, visibleItems]);

  const headCount =
    items.length === 0
      ? copy.noEntries
      : unreadCount > 0
        ? `${unreadCount} ${copy.unread} · ${items.length} ${copy.total}`
        : `${copy.allRead} · ${items.length} ${copy.total}`;

  const countLine =
    items.length === 0
      ? copy.noNotifications
      : filter === "unread"
        ? `${unreadCount} ${copy.unread}`
        : `${items.length} ${copy.notifications} · ${unreadCount} ${copy.unread}`;

  function openNotification(item: NotificationPageItem) {
    if (!item.href) {
      return;
    }

    router.push(`/notifications/open?id=${encodeURIComponent(item.id)}`);
  }

  function markOneRead(item: NotificationPageItem) {
    if (item.readAt || pending) {
      return;
    }

    const previous = items;
    const stamp = new Date().toISOString();
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, readAt: stamp } : candidate
      )
    );
    setErrorMessage(null);
    notifySidebarCountChanged();

    startTransition(async () => {
      const result = await markNotificationReadById(item.id);
      if (!result.ok) {
        setItems(previous);
        setErrorMessage(result.error ?? copy.updateOneError);
      }
      notifySidebarCountChanged();
      router.refresh();
    });
  }

  function markAllRead() {
    if (unreadCount === 0 || pending) {
      return;
    }

    const previous = items;
    const stamp = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? stamp })));
    setErrorMessage(null);
    notifySidebarCountChanged();

    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        setItems(previous);
        setErrorMessage(result.error ?? copy.updateAllError);
      }
      notifySidebarCountChanged();
      router.refresh();
    });
  }

  function deleteRead() {
    if (readCount === 0 || pending) {
      return;
    }

    const previous = items;
    setItems((current) => current.filter((item) => !item.readAt));
    setConfirmingDelete(false);
    setErrorMessage(null);
    notifySidebarCountChanged();

    startTransition(async () => {
      const result = await clearReadNotifications();
      if (!result.ok) {
        setItems(previous);
        setErrorMessage(result.error ?? copy.deleteError);
      }
      notifySidebarCountChanged();
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header} data-workspace-reveal>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            {copy.eyebrow}
          </div>
          <div className={styles.titleRow}>
            <h1>{copy.title}</h1>
            <span>{headCount}</span>
          </div>
          <p>
            {copy.description}
          </p>
        </div>

        <div className={styles.deleteWrap}>
          <button
            type="button"
            className={styles.deleteReadButton}
            disabled={readCount === 0 || pending}
            onClick={() => setConfirmingDelete((value) => !value)}
          >
            <Trash2 aria-hidden="true" />
            {copy.deleteRead}
          </button>

          {confirmingDelete && readCount > 0 ? (
            <div className={styles.deleteConfirm} role="dialog" aria-label={copy.deleteDialogLabel}>
              <strong>{copy.deleteQuestion(readCount)}</strong>
              <p>{copy.deleteHint}</p>
              <div>
                <button type="button" className={styles.dangerButton} onClick={deleteRead} disabled={pending}>
                  {copy.delete}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmingDelete(false)}>
                  {copy.cancel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className={styles.errorBanner} role="status">
          {errorMessage}
        </div>
      ) : null}

      <section className={styles.surface} data-workspace-reveal>
        <div className={styles.toolbar}>
          <div className={styles.segmented} aria-label={copy.filterLabel}>
            <button
              type="button"
              className={filter === "all" ? styles.segmentActive : styles.segment}
              onClick={() => setFilter("all")}
            >
              {copy.all} <span>{items.length}</span>
            </button>
            <button
              type="button"
              className={filter === "unread" ? styles.segmentActive : styles.segment}
              onClick={() => setFilter("unread")}
            >
              {language === "de" ? "Ungelesen" : "Unread"} <span>{unreadCount}</span>
            </button>
          </div>

          {unreadCount > 0 ? (
            <button type="button" className={styles.markAllButton} onClick={markAllRead} disabled={pending}>
              <CheckCheck aria-hidden="true" />
              {copy.markAll}
            </button>
          ) : null}

          <span className={styles.toolbarMeta}>{copy.newest}</span>
        </div>

        <div className={styles.list}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <div className={styles.groupHeader}>
                <span>{group.label}</span>
                <span>{group.items.length}</span>
              </div>

              {group.items.map((item) => {
                const unread = !item.readAt;
                const visual = notificationVisual(item.kind);
                const Icon = visual.Icon;
                const canOpen = Boolean(item.href);

                return (
                  <article
                    key={item.id}
                    className={`${styles.row} ${unread ? styles.rowUnread : ""} ${canOpen ? styles.rowClickable : ""}`}
                    tabIndex={canOpen ? 0 : undefined}
                    role={canOpen ? "link" : undefined}
                    onClick={canOpen ? () => openNotification(item) : undefined}
                    onKeyDown={
                      canOpen
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openNotification(item);
                            }
                          }
                        : undefined
                    }
                  >
                    {unread ? <span className={styles.unreadRail} /> : null}

                    <Icon className={`${styles.rowIcon} ${visual.tone}`} aria-hidden="true" />

                    <div className={styles.mainCell}>
                      <div className={styles.itemTitleRow}>
                        <h2 className={unread ? styles.itemTitleUnread : styles.itemTitle}>{displayTitle(item, language)}</h2>
                        {unread ? <span className={styles.unreadDot} /> : null}
                      </div>
                      {item.description ? <p>{item.description}</p> : null}
                      {item.entity ? (
                        <div className={styles.mobileContext}>
                          <span>{item.entity}</span>
                          {item.entityMeta ? <span>{item.entityMeta}</span> : null}
                        </div>
                      ) : null}
                      <span className={styles.mobileTime}>{notificationTime(item.createdAt, now, language)}</span>
                    </div>

                    <div className={styles.entityCell}>
                      {item.entity ? <span>{item.entity}</span> : <span className={styles.emptyCell}>—</span>}
                      {item.entityMeta ? <small>{item.entityMeta}</small> : null}
                    </div>

                    <div className={styles.timeCell}>{notificationTime(item.createdAt, now, language)}</div>

                    <div className={styles.actionCell}>
                      {unread ? (
                        <button
                          type="button"
                          className={styles.readButton}
                          title={copy.markRead}
                          aria-label={copy.markRead}
                          disabled={pending}
                          onClick={(event) => {
                            event.stopPropagation();
                            markOneRead(item);
                          }}
                        >
                          <Check aria-hidden="true" />
                        </button>
                      ) : null}

                      {canOpen ? (
                        <button
                          type="button"
                          className={styles.openButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openNotification(item);
                          }}
                        >
                          {copy.open}
                          <ArrowRight aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{copy.emptyTitle}</strong>
              <p>{copy.emptyBody}</p>
            </div>
          ) : null}

          {items.length > 0 && filter === "unread" && unreadCount === 0 ? (
            <div className={styles.emptyState}>
              <strong>{copy.doneTitle}</strong>
              <p>{copy.doneBody}</p>
              <button type="button" className={styles.secondaryButton} onClick={() => setFilter("all")}>
                {copy.showAll}
              </button>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <span>{countLine}</span>
          <p>{copy.footer}</p>
        </footer>
      </section>
    </div>
  );
}
