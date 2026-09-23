"use client";

import { formatAccountMoney } from "@/lib/account-currency";

import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MoreVertical,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import {
  deleteDraftProposal,
  resendProposalFromList,
} from "./actions";
import styles from "./proposals-precision.module.css";
import type {
  ProposalLeadCandidate,
  ProposalListStatus,
  ProposalPageItem,
} from "./page";
import type { AppLanguage } from "@/lib/i18n";

type Filter = "all" | ProposalListStatus;
type Sort = "newest" | "oldest" | "highest" | "lowest" | "updated";

const STATUS_COLOR: Record<ProposalListStatus, string> = {
  draft: "#6B7078",
  sent: "#002BBA",
  accepted: "#2F6B3A",
  declined: "#B42318",
  expired: "#9A5106",
};

const COPY = {
  de: {
    eyebrow: "Abschluss",
    title: "Angebote",
    waiting: "warten auf Antwort",
    overdue: "überfällig",
    description: "Erstellte, gesendete und beantwortete Angebote an einem Ort.",
    export: "Export",
    newProposal: "Neues Angebot",
    proposal: "Angebot",
    proposals: "Angebote",
    drafts: "Entwürfe",
    outstanding: "ausstehend",
    accepted: "angenommen",
    declined: "abgelehnt",
    expired: "abgelaufen",
    acceptance: "Annahmequote",
    average: "Ø",
    search: "Kunde, Angebot oder Kontakt",
    filters: {
      all: "Alle",
      draft: "Entwurf",
      sent: "Gesendet",
      accepted: "Angenommen",
      declined: "Abgelehnt",
      expired: "Abgelaufen",
    },
    sorts: {
      newest: "Neueste zuerst",
      oldest: "Älteste zuerst",
      highest: "Höchster Wert",
      lowest: "Niedrigster Wert",
      updated: "Zuletzt aktualisiert",
    },
    columns: {
      offer: "Kunde / Angebot",
      status: "Status",
      value: "Wert",
      created: "Erstellt",
      sent: "Gesendet",
      valid: "Gültig bis",
      next: "Nächster Schritt",
    },
    noResults: "Keine passenden Angebote gefunden.",
    noResultsHint: "Andere Suche oder anderer Status – oder Filter zurücksetzen.",
    reset: "Filter zurücksetzen",
    noData: "Noch keine Angebote",
    noDataHint: "Erstelle dein erstes Angebot und sende es direkt aus Leadbase.",
    create: "Angebot erstellen",
    footer: "Klick öffnet den Entwurf im Proposal Builder · gesendete Angebote in der Angebotsansicht",
    chooseLead: "Lead für neues Angebot auswählen",
    chooseLeadHint: "Leadbase erstellt Angebote aus einem bestehenden Lead.",
    searchLead: "Lead suchen",
    noCandidates: "Für alle aktuellen Leads existiert bereits ein Angebot.",
    openLeads: "Leads öffnen",
    next: {
      finish: "Entwurf fertigstellen",
      missingPrice: "Projektpreis fehlt",
      waiting: "Wartet auf Antwort",
      followup: "Nachfassen fällig",
      quiet: "T still",
      day: "T",
      project: "Projekt anlegen",
      running: "Projekt läuft",
      declined: "Keine Aktion",
      extend: "Gültigkeit verlängern",
      deliveryFailed: "Versand fehlgeschlagen",
    },
    menu: {
      edit: "Bearbeiten",
      preview: "Vorschau",
      view: "Angebot ansehen",
      copy: "Link kopieren",
      copied: "Link kopiert",
      resend: "Erneut senden",
      pdf: "PDF herunterladen",
      project: "Projekt anlegen",
      openProject: "Projekt öffnen",
      extend: "Gültigkeit verlängern",
      duplicate: "Duplizieren",
      delete: "Löschen",
      unavailable: "Aktuell nicht verfügbar",
    },
    deleteTitle: "Entwurf löschen?",
    deleteHint: "Der ungesendete Angebotsentwurf wird dauerhaft entfernt.",
    cancel: "Abbrechen",
    delete: "Löschen",
    error: "Aktion konnte nicht ausgeführt werden.",
  },
  en: {
    eyebrow: "Closing",
    title: "Proposals",
    waiting: "awaiting reply",
    overdue: "overdue",
    description: "Created, sent and answered proposals in one place.",
    export: "Export",
    newProposal: "New proposal",
    proposal: "proposal",
    proposals: "proposals",
    drafts: "drafts",
    outstanding: "outstanding",
    accepted: "accepted",
    declined: "declined",
    expired: "expired",
    acceptance: "Acceptance rate",
    average: "Avg",
    search: "Client, proposal or contact",
    filters: {
      all: "All",
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      declined: "Declined",
      expired: "Expired",
    },
    sorts: {
      newest: "Newest first",
      oldest: "Oldest first",
      highest: "Highest value",
      lowest: "Lowest value",
      updated: "Recently updated",
    },
    columns: {
      offer: "Client / proposal",
      status: "Status",
      value: "Value",
      created: "Created",
      sent: "Sent",
      valid: "Valid until",
      next: "Next step",
    },
    noResults: "No matching proposals found.",
    noResultsHint: "Try another search or status, or reset the filters.",
    reset: "Reset filters",
    noData: "No proposals yet",
    noDataHint: "Create your first proposal and send it directly from Leadbase.",
    create: "Create proposal",
    footer: "Click opens drafts in Proposal Builder · sent proposals in the proposal view",
    chooseLead: "Choose a lead for the new proposal",
    chooseLeadHint: "Leadbase creates proposals from an existing lead.",
    searchLead: "Search leads",
    noCandidates: "Every current lead already has a proposal.",
    openLeads: "Open leads",
    next: {
      finish: "Finish draft",
      missingPrice: "Project price missing",
      waiting: "Awaiting reply",
      followup: "Follow-up due",
      quiet: "d quiet",
      day: "d",
      project: "Create project",
      running: "Project active",
      declined: "No action",
      extend: "Extend validity",
      deliveryFailed: "Delivery failed",
    },
    menu: {
      edit: "Edit",
      preview: "Preview",
      view: "View proposal",
      copy: "Copy link",
      copied: "Link copied",
      resend: "Send again",
      pdf: "Download PDF",
      project: "Create project",
      openProject: "Open project",
      extend: "Extend validity",
      duplicate: "Duplicate",
      delete: "Delete",
      unavailable: "Currently unavailable",
    },
    deleteTitle: "Delete draft?",
    deleteHint: "The unsent proposal draft will be permanently removed.",
    cancel: "Cancel",
    delete: "Delete",
    error: "The action could not be completed.",
  },
} as const;

function daysSince(value: string | null) {
  if (!value) return 0;
  const start = new Date(value).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function nextStep(item: ProposalPageItem, language: AppLanguage) {
  const t = COPY[language].next;
  if (item.deliveryError && item.status === "draft") {
    return { text: t.deliveryFailed, warn: true };
  }
  if (item.status === "draft") {
    return item.value <= 0
      ? { text: t.missingPrice, warn: true }
      : { text: t.finish, warn: false };
  }
  if (item.status === "sent") {
    const days = daysSince(item.sentAt);
    if (days >= 7) {
      return { text: `${t.followup} · ${days} ${t.quiet}`, warn: true };
    }
    return { text: `${t.waiting} · ${days} ${t.day}`, warn: false };
  }
  if (item.status === "accepted") {
    return { text: item.projectId ? t.running : t.project, warn: false };
  }
  if (item.status === "declined") {
    return { text: t.declined, warn: false };
  }
  return { text: t.extend, warn: true };
}

function formatMoney(value: number, currency: string, language: AppLanguage) {
  return formatAccountMoney(value || 0, currency || "EUR", language);
}

function formatDate(value: string | null, language: AppLanguage) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
  })
    .format(date)
    .replace(/\//g, ".");
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function ProposalsPrecisionClient({
  initialItems,
  candidates,
  language,
  accountCurrency,
}: {
  initialItems: ProposalPageItem[];
  candidates: ProposalLeadCandidate[];
  language: AppLanguage;
  accountCurrency: string;
}) {
  const router = useRouter();
  const text = COPY[language];
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(initialItems), [initialItems]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setSortOpen(false);
      setMenuId(null);
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSortOpen(false);
      setMenuId(null);
      setCreateOpen(false);
      setDeleteId(null);
    }
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  const counts = useMemo(() => {
    const next: Record<Filter, number> = {
      all: items.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
    };
    for (const item of items) next[item.status] += 1;
    return next;
  }, [items]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === "de" ? "de-DE" : "en-US");
    const filtered = items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!normalized) return true;
      return `${item.company} ${item.contact || ""} ${item.title}`
        .toLocaleLowerCase(language === "de" ? "de-DE" : "en-US")
        .includes(normalized);
    });

    return filtered.slice().sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "highest") return b.value - a.value;
      if (sort === "lowest") return a.value - b.value;
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, items, language, query, sort]);

  const candidateVisible = useMemo(() => {
    const q = candidateQuery.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((lead) =>
      `${lead.company} ${lead.contact || ""}`.toLowerCase().includes(q)
    );
  }, [candidateQuery, candidates]);

  const sentValue = items.filter((item) => item.status === "sent").reduce((sum, item) => sum + item.value, 0);
  const acceptedValue = items.filter((item) => item.status === "accepted").reduce((sum, item) => sum + item.value, 0);
  const decided = counts.accepted + counts.declined;
  const acceptanceRate = decided > 0 ? Math.round((counts.accepted / decided) * 100) : 0;
  const nonDraft = items.filter((item) => item.status !== "draft");
  const averageValue = nonDraft.length > 0
    ? nonDraft.reduce((sum, item) => sum + item.value, 0) / nonDraft.length
    : 0;

  function openItem(item: ProposalPageItem) {
    if (item.status === "draft" || item.status === "declined" || item.status === "expired") {
      router.push(`/leads/${encodeURIComponent(item.leadId)}/proposal`);
      return;
    }
    router.push(`/proposal/${encodeURIComponent(item.publicToken)}`);
  }

  function copyLink(item: ProposalPageItem) {
    const url = `${window.location.origin}/proposal/${encodeURIComponent(item.publicToken)}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1600);
    });
  }

  function exportCsv() {
    const headers = [
      text.columns.offer,
      text.columns.status,
      text.columns.value,
      text.columns.created,
      text.columns.sent,
      text.columns.valid,
      text.columns.next,
    ];
    const rows = visible.map((item) => {
      const next = nextStep(item, language).text;
      return [
        `${item.company} — ${item.title}`,
        text.filters[item.status],
        item.value,
        item.createdAt,
        item.sentAt || "",
        item.validUntil || "",
        next,
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Leadbase-proposals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function confirmDelete() {
    if (!deleteId || pending) return;
    const id = deleteId;
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    setDeleteId(null);
    setMenuId(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteDraftProposal(id);
      if (!result.ok) {
        setItems(previous);
        setErrorMessage(result.error || text.error);
      }
      router.refresh();
    });
  }



  const filters: Filter[] = ["all", "draft", "sent", "accepted", "declined", "expired"];
  const sorts: Sort[] = ["newest", "oldest", "highest", "lowest", "updated"];

  return (
    <div className={styles.page} ref={rootRef}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}><span className={styles.eyebrowDot} />{text.eyebrow}</div>
          <div className={styles.titleRow}>
            <h1>{text.title}</h1>
            <span>{counts.sent} {text.waiting} · {counts.expired} {text.overdue}</span>
          </div>
          <p>{text.description}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryHeaderButton} onClick={exportCsv} disabled={items.length === 0}>
            <Download />{text.export}
          </button>
          <button type="button" className={styles.primaryHeaderButton} onClick={() => setCreateOpen(true)}>
            <Plus />{text.newProposal}
          </button>
        </div>
      </header>

      {items.length > 0 ? (
        <div className={styles.summary}>
          <strong>{items.length} {text.proposals}</strong><i />
          <span>{counts.draft} {text.drafts}</span><i />
          <span>{counts.sent} {text.outstanding} · <b className={styles.blue}>{formatMoney(sentValue, accountCurrency, language)}</b></span><i />
          <span>{counts.accepted} {text.accepted} · <b className={styles.green}>{formatMoney(acceptedValue, accountCurrency, language)}</b></span><i />
          <span>{counts.declined} {text.declined}</span><i />
          <span className={styles.warm}>{counts.expired} {text.expired}</span>
          <span className={styles.summaryMeta}>{text.acceptance} {acceptanceRate} % · {text.average} {formatMoney(averageValue, accountCurrency, language)}</span>
        </div>
      ) : null}

      {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}

      <section className={styles.surface}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear"><X /></button> : null}
          </label>

          <div className={styles.segmented}>
            {filters.map((key) => (
              <button
                key={key}
                type="button"
                className={filter === key ? styles.segmentActive : styles.segment}
                onClick={() => { setFilter(key); setMenuId(null); }}
              >
                {text.filters[key]} <span>{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className={styles.sortWrap}>
            <button type="button" className={styles.sortButton} onClick={(event) => { event.stopPropagation(); setSortOpen((open) => !open); setMenuId(null); }}>
              <SlidersHorizontal />{text.sorts[sort]}<ChevronDown />
            </button>
            {sortOpen ? (
              <div className={styles.sortMenu}>
                {sorts.map((key) => (
                  <button key={key} type="button" className={sort === key ? styles.menuActive : styles.menuItem} onClick={() => { setSort(key); setSortOpen(false); }}>
                    {text.sorts[key]}{sort === key ? <Check /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.tableHeader}>
          <span>{text.columns.offer}</span><span>{text.columns.status}</span><span>{text.columns.value}</span>
          <span className={styles.desktopDate}>{text.columns.created}</span><span>{text.columns.sent}</span>
          <span className={styles.desktopDate}>{text.columns.valid}</span><span>{text.columns.next}</span><span />
        </div>

        <div className={styles.list}>
          {visible.map((item, index) => {
            const step = nextStep(item, language);
            const statusLabel = text.filters[item.status];
            const menuAbove = visible.length > 4 && index >= visible.length - 3;
            return (
              <div
                key={item.id}
                className={styles.row}
                tabIndex={0}
                role="button"
                onClick={() => openItem(item)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openItem(item); } }}
              >
                <div className={styles.identity}>
                  <div><strong>{item.company}</strong>{item.contact ? <span>{item.contact}</span> : null}</div>
                  <small>{item.title}</small>
                </div>
                <div className={styles.statusCell} style={{ color: STATUS_COLOR[item.status] }}>
                  <i style={{ background: STATUS_COLOR[item.status] }} />{statusLabel}
                  <small className={styles.tabletMeta}>{formatDate(item.createdAt, language)} · {formatDate(item.validUntil, language)}</small>
                </div>
                <div className={`${styles.valueCell} ${item.status === "draft" || item.status === "declined" || item.status === "expired" ? styles.mutedValue : ""}`}>
                  {formatMoney(item.value, item.currency, language)}
                </div>
                <div className={`${styles.dateCell} ${styles.desktopDate}`}>{formatDate(item.createdAt, language)}</div>
                <div className={styles.dateCell}>{formatDate(item.sentAt, language)}</div>
                <div className={`${styles.dateCell} ${styles.desktopDate} ${item.status === "expired" ? styles.warm : ""}`}>{formatDate(item.validUntil, language)}</div>
                <div className={`${styles.nextCell} ${step.warn ? styles.warm : ""}`}>{step.text}</div>
                <div className={styles.menuWrap} onClick={(event) => event.stopPropagation()}>
                  <button type="button" className={styles.moreButton} onClick={() => { setMenuId((current) => current === item.id ? null : item.id); setSortOpen(false); }} aria-label="Actions"><MoreVertical /></button>
                  {menuId === item.id ? (
                    <div className={`${styles.rowMenu} ${menuAbove ? styles.rowMenuAbove : ""}`}>
                      {item.status === "draft" ? (
                        <>
                          <button type="button" onClick={() => router.push(`/leads/${encodeURIComponent(item.leadId)}/proposal`)}><FileText />{text.menu.edit}</button>
                          <a href={`/proposal/${encodeURIComponent(item.publicToken)}`} target="_blank" rel="noreferrer"><ExternalLink />{text.menu.preview}</a>
                          <button type="button" className={styles.disabledAction} disabled title={text.menu.unavailable}><Copy />{text.menu.duplicate}</button>
                          <button type="button" className={styles.dangerAction} onClick={() => setDeleteId(item.id)}><Trash2 />{text.menu.delete}</button>
                        </>
                      ) : (
                        <>
                          <a href={`/proposal/${encodeURIComponent(item.publicToken)}`} target="_blank" rel="noreferrer"><ExternalLink />{text.menu.view}</a>
                          <button type="button" onClick={() => copyLink(item)}><Copy />{copiedId === item.id ? text.menu.copied : text.menu.copy}</button>
                          <a href={`/proposal/${encodeURIComponent(item.publicToken)}/pdf`} target="_blank" rel="noreferrer"><Download />{text.menu.pdf}</a>
                          {item.status === "sent" ? (
                            <form action={resendProposalFromList}>
                              <input type="hidden" name="leadId" value={item.leadId} />
                              <button type="submit" disabled={pending}><Send />{text.menu.resend}</button>
                            </form>
                          ) : null}
                          {item.status === "accepted" && item.projectId ? (
                            <button type="button" onClick={() => router.push(`/projects/${encodeURIComponent(item.projectId as string)}`)}><ExternalLink />{text.menu.openProject}</button>
                          ) : null}
                          {item.status === "declined" ? (
                            <button type="button" onClick={() => router.push(`/leads/${encodeURIComponent(item.leadId)}/proposal`)}><FileText />{text.menu.edit}</button>
                          ) : null}
                          {item.status === "expired" ? (
                            <button type="button" onClick={() => router.push(`/leads/${encodeURIComponent(item.leadId)}/proposal`)}><FileText />{text.menu.extend}</button>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {items.length > 0 && visible.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{text.noResults}</strong><p>{text.noResultsHint}</p>
              <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>{text.reset}</button>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{text.noData}</strong><p>{text.noDataHint}</p>
              <button type="button" className={styles.emptyPrimary} onClick={() => setCreateOpen(true)}><Plus />{text.create}</button>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <span>{items.length === 0 ? `0 ${text.proposals}` : `${visible.length} / ${items.length} ${text.proposals}`}</span>
          <p>{text.footer}</p>
        </footer>
      </section>

      {createOpen && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.modalBackdrop} onMouseDown={() => setCreateOpen(false)}>
              <div className={styles.createModal} onMouseDown={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div><strong>{text.chooseLead}</strong><p>{text.chooseLeadHint}</p></div>
                  <button type="button" onClick={() => setCreateOpen(false)}><X /></button>
                </div>
                {candidates.length > 0 ? (
                  <>
                    <label className={`${styles.searchBox} ${styles.modalSearch}`}><Search /><input autoFocus value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder={text.searchLead} /></label>
                    <div className={styles.candidateList}>
                      {candidateVisible.map((lead) => (
                        <button key={lead.id} type="button" onClick={() => router.push(`/leads/${encodeURIComponent(lead.id)}/proposal`)}>
                          <div><strong>{lead.company}</strong>{lead.contact ? <span>{lead.contact}</span> : null}</div>
                          <small>{lead.estimatedValue > 0 ? formatMoney(lead.estimatedValue, lead.currency, language) : "—"}</small>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.noCandidates}><p>{text.noCandidates}</p><button type="button" onClick={() => router.push("/leads")}>{text.openLeads}</button></div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {deleteId && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.modalBackdrop} onMouseDown={() => setDeleteId(null)}>
              <div className={styles.confirmModal} onMouseDown={(event) => event.stopPropagation()}>
                <strong>{text.deleteTitle}</strong><p>{text.deleteHint}</p>
                <div><button type="button" className={styles.cancelButton} onClick={() => setDeleteId(null)}>{text.cancel}</button><button type="button" className={styles.deleteButton} onClick={confirmDelete} disabled={pending}>{text.delete}</button></div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
