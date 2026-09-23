"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/language-provider";

/* =========================================================
   FULL-APP LANGUAGE BRIDGE

   Leadbase already has native dictionaries in many screens.
   This bridge catches legacy/hard-coded UI strings and portal
   content (dialogs, menus, popovers) so switching DE/EN behaves
   consistently while the remaining components are migrated to
   native dictionaries.

   It only translates exact UI phrases / known templates. It does
   NOT translate arbitrary company names, lead copy, emails or
   user-entered content.
========================================================= */

const PAIRS = [
  ["Auswahl", "Selection"],
  ["Abbrechen", "Cancel"],
  ["Schließen", "Close"],
  ["Öffnen", "Open"],
  ["Speichern", "Save"],
  ["Gespeichert", "Saved"],
  ["Zurücksetzen", "Reset"],
  ["Löschen", "Delete"],
  ["Bearbeiten", "Edit"],
  ["Weiter", "Continue"],
  ["Zurück", "Back"],
  ["Heute", "Today"],
  ["Morgen", "Tomorrow"],
  ["Später", "Later"],
  ["Überfällig", "Overdue"],
  ["Aktiv", "Active"],
  ["Pausiert", "Paused"],
  ["Archiviert", "Archived"],
  ["Entwurf", "Draft"],
  ["Entwurf bereit", "Draft ready"],
  ["Analysiert", "Analyzed"],
  ["Nicht analysiert", "Not analyzed"],
  ["Kampagne", "Campaign"],
  ["Kampagnen", "Campaigns"],
  ["Neue Kampagne", "New campaign"],
  ["Deine Kampagnen", "Your campaigns"],
  ["Ohne Kampagne", "No campaign"],
  ["ohne Kampagne", "no campaign"],
  ["Lead hinzufügen", "Add lead"],
  ["Lead löschen", "Delete lead"],
  ["Lead löschen?", "Delete lead?"],
  ["Leads löschen", "Delete leads"],
  ["Lead-Suche zurücksetzen", "Reset lead search"],
  ["Suchhistorie wirklich löschen?", "Really delete search history?"],
  ["Jetzt zurücksetzen", "Reset now"],
  ["Wird zurückgesetzt...", "Resetting..."],
  ["Lead-Suche wurde zurückgesetzt.", "Lead search was reset."],
  ["Kandidaten gelöscht", "Candidates deleted"],
  ["Suchläufe gelöscht", "Search runs deleted"],
  ["alte Firmen-Sperren gelöst", "old company blocks cleared"],
  ["Geplante Mails", "Scheduled emails"],
  ["Später senden", "Send later"],
  ["Versand stoppen", "Cancel send"],
  ["Entwürfe erstellen", "Create drafts"],
  ["Designs erstellen", "Generate designs"],
  ["Designs werden erstellt", "Generating designs"],
  ["GIFs erstellen", "Generate GIFs"],
  ["GIFs werden erstellt", "Generating GIFs"],
  ["Design-Erstellung abgeschlossen", "Design generation complete"],
  ["GIF-Erstellung abgeschlossen", "GIF generation complete"],
  ["Vorschau", "Preview"],
  ["Vorschau öffnen", "Open preview"],
  ["Kunden-Vorschau", "Client preview"],
  ["Kunden-Vorschau aktiv", "Client preview active"],
  ["Vorschau-Besuche", "Preview visits"],
  ["Vorschau-Aufrufe", "Preview views"],
  ["Persönlicher Workspace", "Personal workspace"],
  ["Benachrichtigungen", "Notifications"],
  ["Gelesene löschen", "Delete read"],
  ["Noch keine Benachrichtigungen", "No notifications yet"],
  ["Angebote", "Proposals"],
  ["Angebot", "Proposal"],
  ["Angebot annehmen", "Accept proposal"],
  ["Angebot abgelehnt", "Proposal declined"],
  ["Angebot angenommen", "Proposal accepted"],
  ["Zusage bestätigen", "Confirm acceptance"],
  ["Gültig bis", "Valid until"],
  ["Für", "For"],
  ["Bestätigt", "Confirmed"],
  ["Einstellungen", "Settings"],
  ["Profil", "Profile"],
  ["Sprache", "Language"],
  ["Design Studio", "Design Studio"],
  ["Enhance Motion", "Enhance Motion"],
  ["Nichts ausgewählt", "Nothing selected"],
  ["Ausgewählt", "Selected"],
  ["Elternelement auswählen", "Select parent element"],
  ["Text übernehmen", "Apply text"],
  ["Größe & Layout", "Size & layout"],
  ["Zurück zum Lead", "Back to lead"],
  ["Bild verwenden", "Use image"],
  ["Firmenbilder", "Company images"],
  ["Vorherige Seite", "Previous page"],
  ["Nächste Seite", "Next page"],
  ["Seite", "Page"],
  ["Ergebnisse", "results"],
  ["Stärken", "Strengths"],
  ["Schwächen", "Weaknesses"],
  ["Grund für Redesign", "Reason for redesign"],
  ["Antwort öffnen", "Open reply"],
  ["Projekt öffnen", "Open project"],
  ["Entwurf öffnen", "Open draft"],
  ["Inbox öffnen", "Open inbox"],
  ["E-Mail prüfen", "Review email"],
  ["Follow-ups fällig", "Follow-ups due"],
  ["Entwürfe bereit", "Drafts ready"],
  ["Letzte Aktivität", "Last activity"],
  ["Kampagne öffnen", "Open campaign"],
  ["Kampagnenideen", "Campaign ideas"],
  ["Keine aktiven Kampagnen", "No active campaigns"],
  ["Keine pausierten Kampagnen", "No paused campaigns"],
  ["Keine archivierten Kampagnen", "No archived campaigns"],
  ["Nicht gefunden", "Not found"],
  ["Nicht erstellt", "Not created"],
  ["Geplant", "Scheduled"],
  ["Wird bestätigt…", "Confirming…"],
  ["Original öffnen", "Open original"],
  ["E-Mail öffnen", "Open email"],
  ["Termin auswählen", "Choose a time"],
  ["Wie möchten Sie weitermachen?", "How would you like to continue?"],
] as const;

type AppLanguage = "de" | "en";

const deToEn = new Map<string, string>(PAIRS);
const enToDe = new Map<string, string>(
  PAIRS.map(([de, en]) => [en, de])
);

const SKIP_SELECTOR = [
  "script",
  "style",
  "code",
  "pre",
  "textarea",
  "svg",
  "[contenteditable='true']",
  "[data-no-auto-i18n]",
  "[data-leadbase-user-content]",
].join(",");

function translateTemplate(value: string, language: AppLanguage) {
  const rules: Array<{
    de: RegExp;
    en: RegExp;
    toEn: (...parts: string[]) => string;
    toDe: (...parts: string[]) => string;
  }> = [
    {
      de: /^(\d+) Einträge$/,
      en: /^(\d+) items$/i,
      toEn: (count) => `${count} items`,
      toDe: (count) => `${count} Einträge`,
    },
    {
      de: /^(\d+) Bilder$/,
      en: /^(\d+) images$/i,
      toEn: (count) => `${count} images`,
      toDe: (count) => `${count} Bilder`,
    },
    {
      de: /^(\d+) Ergebnisse$/,
      en: /^(\d+) results$/i,
      toEn: (count) => `${count} results`,
      toDe: (count) => `${count} Ergebnisse`,
    },
    {
      de: /^(\d+) ausgewählt$/,
      en: /^(\d+) selected$/i,
      toEn: (count) => `${count} selected`,
      toDe: (count) => `${count} ausgewählt`,
    },
    {
      de: /^(\d+) Vorschau-Aufrufe?$/,
      en: /^(\d+) preview views?$/i,
      toEn: (count) => `${count} preview ${count === "1" ? "view" : "views"}`,
      toDe: (count) => `${count} Vorschau-Aufruf${count === "1" ? "" : "e"}`,
    },
  ];

  for (const rule of rules) {
    const match = value.match(language === "en" ? rule.de : rule.en);
    if (!match) continue;
    const parts = match.slice(1);
    return language === "en" ? rule.toEn(...parts) : rule.toDe(...parts);
  }

  return value;
}

function translateCore(value: string, language: AppLanguage) {
  const dictionary = language === "en" ? deToEn : enToDe;
  return dictionary.get(value) ?? translateTemplate(value, language);
}

function translatePreservingWhitespace(value: string, language: AppLanguage) {
  if (!value.trim()) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  const translated = translateCore(core, language);

  return translated === core
    ? value
    : `${leading}${translated}${trailing}`;
}

function shouldSkip(element: Element | null) {
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function translateTextNodes(root: Node, language: AppLanguage) {
  const doc = root.ownerDocument ?? document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) nodes.push(current);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    if (shouldSkip(node.parentElement)) continue;
    const next = translatePreservingWhitespace(node.nodeValue ?? "", language);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

function translateAttributes(root: ParentNode, language: AppLanguage) {
  const elements: Element[] = [];

  if (root instanceof Element) elements.push(root);
  elements.push(...Array.from(root.querySelectorAll?.("[placeholder],[title],[aria-label]") ?? []));

  for (const element of elements) {
    if (shouldSkip(element)) continue;

    for (const attribute of ["placeholder", "title", "aria-label"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const next = translateCore(value, language);
      if (next !== value) element.setAttribute(attribute, next);
    }
  }
}

function translateSubtree(root: Node, language: AppLanguage) {
  if (root instanceof Element && shouldSkip(root)) return;
  translateTextNodes(root, language);
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    translateAttributes(root, language);
  }
}

export function AppLanguageBridge() {
  const { language } = useLanguage();

  useEffect(() => {
    const resolved = language as AppLanguage;
    document.documentElement.lang = resolved;

    let scheduled = false;
    const run = () => {
      scheduled = false;
      translateSubtree(document.body, resolved);
    };

    run();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const target = mutation.target;
          if (!shouldSkip(target.parentElement)) {
            const current = target.nodeValue ?? "";
            const next = translatePreservingWhitespace(current, resolved);
            if (next !== current) target.nodeValue = next;
          }
          continue;
        }

        for (const node of mutation.addedNodes) {
          translateSubtree(node, resolved);
        }
      }

      if (!scheduled) {
        scheduled = true;
        queueMicrotask(run);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
