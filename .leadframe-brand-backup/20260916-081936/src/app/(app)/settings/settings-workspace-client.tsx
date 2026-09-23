"use client";

import {
  CheckCircle2,
  Database,
  Globe2,
  Laptop,
  Link2,
  LogOut,
  Moon,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/(app)/actions";
import { useLanguage } from "@/components/language-provider";
import { useTheme, type AppTheme } from "@/components/theme-provider";
import type { AppLanguage } from "@/lib/i18n";

import styles from "./settings-precision.module.css";

type SectionId =
  | "general"
  | "integrations"
  | "automation"
  | "safety"
  | "data";

type SettingsWorkspaceProps = {
  language: AppLanguage;
  integrationReadyCount: number;
  integrationTotal: number;
  general: ReactNode;
  integrations: ReactNode;
  automation: ReactNode;
  safety: ReactNode;
  data: ReactNode;
  notice?: ReactNode;
};

const sectionMeta = {
  de: {
    general: {
      group: "Allgemein",
      label: "Darstellung & Sprache",
      title: "Darstellung & Sprache",
      subtitle:
        "Wie Leadbase auf diesem Gerät aussieht und in welcher Sprache es dich anspricht.",
      footer: "Darstellung und Sprache werden pro Gerät gespeichert",
    },
    integrations: {
      group: "Integrationen",
      label: "Verbindungen",
      title: "Verbindungen",
      subtitle:
        "Postfach, KI und die Quellen, aus denen Leadbase Unternehmen findet.",
      footer: "Gmail · OpenAI · Google Places",
    },
    automation: {
      group: "Automation",
      label: "Outreach & Follow-ups",
      title: "Outreach & Follow-ups",
      subtitle:
        "Wie Entwürfe erzeugt, freigegeben und Follow-ups vorbereitet werden.",
      footer: "Gilt für neue Entwürfe und geplante Follow-ups",
    },
    safety: {
      group: "Sicherheit",
      label: "Compliance & Zustellung",
      title: "Compliance & Zustellung",
      subtitle:
        "Feste Schutzmaßnahmen und der technische Zustand deiner Versanddomain.",
      footer: "Schutzmaßnahmen sind Teil des Versandpfads",
    },
    data: {
      group: "Daten",
      label: "Lead-Suche & Reset",
      title: "Lead-Suche & Reset",
      subtitle:
        "Bestand der Suchhistorie und das Zurücksetzen gefundener Unternehmen.",
      footer: "CRM-Leads sind von einem Reset nie betroffen",
    },
    eyebrow: "Workspace",
    title: "Einstellungen",
    description:
      "Integrationen, Darstellung, Sprache, Outreach-Verhalten und Schutzmaßnahmen deines Workspace.",
    automaticallySaved: "Automatisch gespeichert",
    workspaceFooter: "Leadbase · Privater Workspace",
    active: "aktiv",
    integrationsLabel: "Integrationen",
    allConnected: "alle verbunden",
    connected: "verbunden",
  },
  en: {
    general: {
      group: "General",
      label: "Appearance & language",
      title: "Appearance & language",
      subtitle: "How Leadbase looks on this device and which language it uses.",
      footer: "Appearance and language are stored per device",
    },
    integrations: {
      group: "Integrations",
      label: "Connections",
      title: "Connections",
      subtitle: "Mailbox, AI and the sources Leadbase uses to find companies.",
      footer: "Gmail · OpenAI · Google Places",
    },
    automation: {
      group: "Automation",
      label: "Outreach & follow-ups",
      title: "Outreach & follow-ups",
      subtitle: "How drafts are prepared, approved and followed up.",
      footer: "Applies to new drafts and scheduled follow-ups",
    },
    safety: {
      group: "Security",
      label: "Compliance & delivery",
      title: "Compliance & delivery",
      subtitle: "Fixed safeguards and the technical state of your sending domain.",
      footer: "Safeguards are part of the sending path",
    },
    data: {
      group: "Data",
      label: "Lead search & reset",
      title: "Lead search & reset",
      subtitle: "Search-history inventory and resetting discovered companies.",
      footer: "CRM leads are never affected by a reset",
    },
    eyebrow: "Workspace",
    title: "Settings",
    description:
      "Integrations, appearance, language, outreach behavior and safeguards for your workspace.",
    automaticallySaved: "Automatically saved",
    workspaceFooter: "Leadbase · Private workspace",
    active: "active",
    integrationsLabel: "integrations",
    allConnected: "all connected",
    connected: "connected",
  },
} as const;

const icons: Record<SectionId, React.ElementType> = {
  general: SlidersHorizontal,
  integrations: Link2,
  automation: Send,
  safety: ShieldCheck,
  data: Database,
};

export function SettingsWorkspace({
  language,
  integrationReadyCount,
  integrationTotal,
  general,
  integrations,
  automation,
  safety,
  data,
  notice,
}: SettingsWorkspaceProps) {
  const [section, setSection] = useState<SectionId>("general");
  const copy = sectionMeta[language];

  useEffect(() => {
    const syncHash = () => {
      switch (window.location.hash) {
        case "#connections":
        case "#integrations":
          setSection("integrations");
          break;
        case "#follow-ups":
        case "#automation":
          setSection("automation");
          break;
        case "#compliance":
        case "#delivery":
          setSection("safety");
          break;
        case "#lead-search":
        case "#data":
          setSection("data");
          break;
        case "#appearance":
        case "#general":
        case "":
        default:
          setSection("general");
          break;
      }
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const current = copy[section];
  const allReady = integrationReadyCount === integrationTotal;
  const content = {
    general,
    integrations,
    automation,
    safety,
    data,
  }[section];

  const sections: SectionId[] = [
    "general",
    "integrations",
    "automation",
    "safety",
    "data",
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            {copy.eyebrow}
          </div>

          <div className={styles.titleRow}>
            <h1>{copy.title}</h1>
            <span>
              {integrationReadyCount} {copy.integrationsLabel} ·{" "}
              {allReady ? copy.allConnected : `${integrationReadyCount} ${copy.connected}`}
            </span>
          </div>

          <p>{copy.description}</p>
        </div>

        <div className={styles.integrationSummary}>
          <span className={allReady ? styles.statusDotReady : styles.statusDotQuiet} />
          Gmail&nbsp; · &nbsp;KI&nbsp; · &nbsp;Lead-Suche&nbsp; {copy.active}
        </div>
      </header>

      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.workspace}>
        <nav className={styles.innerNav} aria-label={language === "de" ? "Einstellungsbereiche" : "Settings sections"}>
          {sections.map((id) => {
            const Icon = icons[id];
            const item = copy[id];
            const active = section === id;

            return (
              <div className={styles.navGroup} key={id}>
                <div className={styles.navGroupLabel}>{item.group}</div>
                <button
                  type="button"
                  className={active ? styles.navItemActive : styles.navItem}
                  onClick={() => setSection(id)}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {id === "integrations" ? <span className={styles.navReadyDot} /> : null}
                </button>
              </div>
            );
          })}

          <form action={logout} className={styles.settingsSignOut}>
            <button type="submit">
              <LogOut size={14} strokeWidth={1.8} />
              <span>{language === "de" ? "Abmelden" : "Sign out"}</span>
            </button>
          </form>
        </nav>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <h2>{current.title}</h2>
              <p>{current.subtitle}</p>
            </div>
            <div className={styles.savedState}>
              <CheckCircle2 size={12} strokeWidth={1.9} />
              {copy.automaticallySaved}
            </div>
          </div>

          <div className={styles.panelBody}>{content}</div>

          <footer className={styles.panelFooter}>
            <span>{current.footer}</span>
            <span>{copy.workspaceFooter}</span>
          </footer>
        </section>
      </div>
    </div>
  );
}

export function CompactAppearanceLanguage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const themeOptions: Array<{
    id: AppTheme;
    label: string;
    Icon: React.ElementType;
  }> = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
    { id: "system", label: "System", Icon: Laptop },
  ];

  const de = language === "de";

  return (
    <div className={styles.generalRows}>
      <div className={styles.settingsRow}>
        <div className={styles.settingsRowCopy}>
          <strong>{de ? "Darstellung" : "Appearance"}</strong>
          <span>
            {de
              ? "Wähle aus, wie Leadbase auf diesem Gerät aussehen soll. „System“ übernimmt den Hell- oder Dunkelmodus des Betriebssystems."
              : "Choose how Leadbase should look on this device. System follows the operating-system appearance."}
          </span>
        </div>
        <div className={styles.themeOptions}>
          {themeOptions.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={theme === id ? styles.optionActive : styles.option}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsRowCopy}>
          <strong>{de ? "Sprache" : "Language"}</strong>
          <span>
            {de
              ? "Die Auswahl wird auf diesem Gerät gespeichert und bleibt nach dem Neuladen aktiv."
              : "The selection is stored on this device and remains active after reloading."}
          </span>
        </div>
        <div className={styles.segmented}>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={language === "en" ? styles.segmentActive : styles.segment}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("de")}
            className={language === "de" ? styles.segmentActive : styles.segment}
          >
            Deutsch
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceIdentity({
  name,
  email,
  language,
}: {
  name: string;
  email: string;
  language: AppLanguage;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JC";

  return (
    <div className={styles.settingsRowNoBorder}>
      <div className={styles.settingsRowCopy}>
        <strong>Workspace</strong>
        <span>
          {language === "de"
            ? "Privater Workspace · nur du hast Zugriff auf Leads, Postfach und Angebote."
            : "Private workspace · only you have access to leads, mailbox and proposals."}
        </span>
      </div>
      <div className={styles.identityCard}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <strong>{name}</strong>
          <span>{email}</span>
        </div>
      </div>
    </div>
  );
}

export function IntegrationIcon({ children }: { children: ReactNode }) {
  return <div className={styles.integrationIcon}>{children}</div>;
}

export function StatusBadge({
  state,
  children,
}: {
  state: "ready" | "paused" | "quiet" | "warning";
  children: ReactNode;
}) {
  return <span className={styles[`badge_${state}`]}>{children}</span>;
}

export function SettingsSubLabel({ children }: { children: ReactNode }) {
  return <span className={styles.subLabel}>{children}</span>;
}

export function MiniCheck({ children }: { children: ReactNode }) {
  return (
    <span className={styles.miniCheck}>
      <CheckCircle2 size={11} />
      {children}
    </span>
  );
}

export function GlobeLanguageIcon() {
  return <Globe2 size={14} strokeWidth={1.8} />;
}


export function FollowUpDelayControl({
  value,
  language,
  action,
}: {
  value: number;
  language: AppLanguage;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const values = Array.from({ length: 30 }, (_, index) => index + 1);

  return (
    <form ref={formRef} action={action} className={styles.delayForm}>
      <select
        name="followUpDelayDays"
        defaultValue={String(value)}
        className={styles.delaySelect}
        aria-label={language === "de" ? "Standard-Follow-up-Verzögerung" : "Default follow-up delay"}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {values.map((days) => (
          <option key={days} value={days}>
            {days} {language === "de" ? (days === 1 ? "Tag" : "Tage") : (days === 1 ? "day" : "days")}
          </option>
        ))}
      </select>
    </form>
  );
}
