"use client";

import React, { useMemo, useState } from "react";

import {
  PROPOSAL_TEMPLATE_AST,
  type ProposalTemplateAstNode,
} from "@/lib/proposal-template-ast";
import {
  normalizeProposalDesignTemplate,
  type ProposalDesignTemplate,
} from "@/lib/proposal-design-templates";

export type ProposalTemplateCustomSection = {
  id: string;
  title: string;
  content: string;
};

export type ProposalTemplateDocumentProps = {
  template: ProposalDesignTemplate;
  title: string;
  clientName: string;
  contactName: string;
  contactEmail?: string;
  website?: string;
  introText: string;
  scope: string[];
  timelineText?: string;
  priceLabel: string;
  validUntil?: string;
  notes?: string;
  customSections?: ProposalTemplateCustomSection[];
  firstTimeClient?: boolean;
  accentColor?: string;
  logoUrl?: string | null;
  isGerman: boolean;
  isAccepted?: boolean;
  isDeclined?: boolean;
  acceptedAt?: string | null;
  acceptedByName?: string | null;
  proposalNumber?: string;
  revision?: number;
  issuedDate?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerEmail?: string;
  ownerSite?: string;
  pdfUrl?: string;
  expectedAcceptanceName?: string;
  interactive?: boolean;
  onAccept?: (acceptedByName: string) => void | Promise<void>;
  onDecline?: () => void | Promise<void>;
};

type RenderContext = Record<string, unknown>;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const STATIC_EN: Record<string, string> = {
  "Projektangebot": "Project proposal",
  "Angebot": "Proposal",
  "Von": "From",
  "Für": "For",
  "Zeitrahmen": "Timeline",
  "Gültig bis": "Valid until",
  "Aktueller Auftritt": "Current website",
  "Ausgestellt": "Issued",
  "Das Projekt": "The project",
  "Leistungsumfang": "Scope of work",
  "Investition": "Investment",
  "Investition & Rahmen": "Investment & terms",
  "Projektpreis": "Project price",
  "Rahmen": "Terms",
  "Rahmenbedingungen": "Terms",
  "Eckdaten": "Key facts",
  "Status": "Status",
  "Offen": "Open",
  "Angenommen": "Accepted",
  "Abgelehnt": "Declined",
  "Angebot annehmen": "Accept proposal",
  "Annehmen": "Accept",
  "Ablehnen": "Decline",
  "Kontakt": "Contact",
  "Kontakt aufnehmen": "Get in touch",
  "Bereit, das Projekt zu starten?": "Ready to start the project?",
  "Fragen? Schreib mir.": "Questions? Message me.",
  "Gesamt": "Total",
  "Angebotsempfänger": "Proposal recipient",
  "Angebotsnummer": "Proposal number",
  "Dokument": "Document",
  "Zusage bestätigen": "Confirm acceptance",
  "Ihr Name": "Your name",
  "Verbindlich annehmen": "Accept proposal",
  "Abbrechen": "Cancel",
  "Schließen": "Close",
  "Anbieter": "Provider",
  "Auftraggeber": "Client",
};

function translateStaticText(value: string, isGerman: boolean) {
  if (isGerman) return value;
  const trimmed = value.trim();
  const replacement = STATIC_EN[trimmed];
  if (!replacement) return value;
  return value.replace(trimmed, replacement);
}

function getPath(ctx: RenderContext, path: string): unknown {
  const expr = path.trim();
  if (!expr) return undefined;
  if (expr === "true") return true;
  if (expr === "false") return false;
  if (expr === "null") return null;
  if (expr.startsWith("!")) return !getPath(ctx, expr.slice(1));

  const parts = expr.split(".").map((part) => part.trim()).filter(Boolean);
  let current: unknown = ctx;
  for (const part of parts) {
    if (current == null || (typeof current !== "object" && typeof current !== "function")) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function interpolateString(value: string, ctx: RenderContext) {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expr: string) => {
    const resolved = getPath(ctx, expr);
    if (resolved == null || typeof resolved === "function") return "";
    return String(resolved);
  });
}

function wholeBinding(value: string) {
  const match = value.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
  return match?.[1] ?? null;
}

function splitCssDeclarations(css: string) {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === ";" && depth === 0) {
      parts.push(css.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(css.slice(start));
  return parts;
}

function cssPropertyToReact(property: string) {
  const clean = property.trim();
  if (clean.startsWith("--")) return clean;
  return clean.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function parseStyle(value: string): React.CSSProperties {
  const result: Record<string, string> = {};
  for (const declaration of splitCssDeclarations(value)) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim();
    const cssValue = declaration.slice(colon + 1).trim();
    if (!property || !cssValue) continue;
    result[cssPropertyToReact(property)] = cssValue;
  }
  return result as React.CSSProperties;
}

function nodeText(node: ProposalTemplateAstNode): string {
  if (node.t === "text") return node.v;
  return node.c.map(nodeText).join("");
}

function renderText(value: string, ctx: RenderContext, key: React.Key, isGerman: boolean) {
  const translated = translateStaticText(value, isGerman);
  if (!translated.includes("{{")) return translated;
  const parts = translated.split(/\{\{\s*([^}]+?)\s*\}\}/g);
  return (
    <React.Fragment key={key}>
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;
        const resolved = getPath(ctx, part);
        if (resolved == null || typeof resolved === "boolean" || typeof resolved === "function") return null;
        return <React.Fragment key={index}>{String(resolved)}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

function renderNode(
  node: ProposalTemplateAstNode,
  ctx: RenderContext,
  key: React.Key,
  isGerman: boolean,
): React.ReactNode {
  if (node.t === "text") return renderText(node.v, ctx, key, isGerman);

  if (node.tag === "sc-if") {
    const expr = wholeBinding(node.a.value ?? "") ?? node.a.value ?? "";
    if (!getPath(ctx, expr)) return null;
    return (
      <React.Fragment key={key}>
        {node.c.map((child, index) => renderNode(child, ctx, `${String(key)}-if-${index}`, isGerman))}
      </React.Fragment>
    );
  }

  if (node.tag === "sc-for") {
    const expr = wholeBinding(node.a.list ?? "") ?? node.a.list ?? "";
    const list = getPath(ctx, expr);
    const asName = node.a.as || "item";
    if (!Array.isArray(list)) return null;
    return (
      <React.Fragment key={key}>
        {list.map((item, itemIndex) => {
          const childCtx: RenderContext = { ...ctx, [asName]: item, $index: itemIndex };
          return (
            <React.Fragment key={`${String(key)}-${itemIndex}`}>
              {node.c.map((child, childIndex) => renderNode(child, childCtx, `${String(key)}-${itemIndex}-${childIndex}`, isGerman))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  }

  const props: Record<string, unknown> = { key };

  for (const [rawName, rawValue] of Object.entries(node.a)) {
    if (rawName === "style-hover" || rawName === "style-focus" || rawName === "hint-placeholder-val" || rawName === "hint-placeholder-count") continue;
    let name = rawName;
    if (name === "class") name = "className";
    if (name === "for") name = "htmlFor";
    if (name === "onclick") name = "onClick";
    if (name === "onchange") name = "onChange";
    if (name === "oninput") name = "onInput";
    if (name === "defaultvalue") name = "defaultValue";
    if (name === "tabindex") name = "tabIndex";

    const bound = wholeBinding(rawValue);
    let value: unknown;
    if (bound) value = getPath(ctx, bound);
    else value = interpolateString(rawValue, ctx);

    if (name === "style") {
      if (typeof value === "string") props.style = parseStyle(value);
      continue;
    }

    if (name === "disabled") {
      props.disabled = Boolean(value === true || value === "true" || value === "disabled");
      continue;
    }

    props[name] = value;
  }

  if (node.tag === "input" && node.a.id === "lb-accept-name") {
    props.defaultValue = "";
    props.placeholder = ctx.expectedAcceptanceName
      ? `${isGerman ? "Wie im Angebot" : "As shown in proposal"}: ${String(ctx.expectedAcceptanceName)}`
      : isGerman ? "Vor- und Nachname" : "Full name";
    props.autoComplete = "name";
    props.required = true;
    props.onInput = ctx.onAcceptanceNameInput;
    if (ctx.acceptanceName && ctx.acceptanceNameMatches === false) {
      props.style = {
        ...(props.style as React.CSSProperties),
        borderColor: "rgba(154,81,6,.55)",
        boxShadow: "0 0 0 3px rgba(154,81,6,.08)",
      };
      props["aria-invalid"] = true;
      props.title = isGerman
        ? `Der Name muss mit „${String(ctx.expectedAcceptanceName ?? "")}“ übereinstimmen.`
        : `The name must match “${String(ctx.expectedAcceptanceName ?? "")}”.`;
    }
  }

  if (node.tag === "button" && !props.onClick) {
    const label = nodeText(node).trim();
    if (label === "PDF") props.onClick = ctx.printProposal;
    if (label === "Kontakt" || label === "Kontakt aufnehmen") props.onClick = ctx.contactProposal;
  }

  const children = node.c.map((child, index) => renderNode(child, ctx, `${String(key)}-${index}`, isGerman));

  if (node.tag === "input" && node.a.id === "lb-accept-name") {
    const entered = String(ctx.acceptanceName ?? "").trim();
    const mismatch = entered.length > 0 && ctx.acceptanceNameMatches === false;
    return (
      <React.Fragment key={key}>
        {React.createElement(node.tag, { ...props, key: `${String(key)}-input` }, ...children)}
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontSize: 10.5,
            lineHeight: 1.5,
            color: mismatch ? "#9A5106" : "#6B7078",
          }}
        >
          {mismatch
            ? isGerman
              ? `Der Name muss mit „${String(ctx.expectedAcceptanceName ?? "")}“ übereinstimmen.`
              : `The name must match “${String(ctx.expectedAcceptanceName ?? "")}”.`
            : isGerman
              ? `Bitte den Namen wie im Angebot eingeben: ${String(ctx.expectedAcceptanceName ?? "")}.`
              : `Enter the name as shown in the proposal: ${String(ctx.expectedAcceptanceName ?? "")}.`}
        </span>
      </React.Fragment>
    );
  }

  return React.createElement(node.tag, props, ...children);
}

function normalizeAccent(value?: string) {
  const raw = (value || "").trim();
  return /^#[0-9A-F]{6}$/i.test(raw) ? raw.toUpperCase() : "#002BBA";
}

function lift(hex: string, amount: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

function cleanLines(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeAcceptanceName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-DE");
}

export function ProposalTemplateDocument(props: ProposalTemplateDocumentProps) {
  const template = normalizeProposalDesignTemplate(props.template);
  const accent = normalizeAccent(props.accentColor);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [acceptanceName, setAcceptanceName] = useState("");
  const [localStatus, setLocalStatus] = useState<"open" | "accepted" | "declined">(
    props.isAccepted ? "accepted" : props.isDeclined ? "declined" : "open",
  );

  const data = useMemo<RenderContext>(() => {
    const isGerman = props.isGerman;
    const ownerName = props.ownerName || "Joel Cimpean";
    const ownerRole = props.ownerRole || (isGerman ? "Webdesign & Entwicklung" : "Web design & development");
    const ownerEmail = props.ownerEmail || "hello@joelcimpean.com";
    const ownerSite = props.ownerSite || "joelcimpean.com";
    const introLines = cleanLines(props.introText);
    const status = localStatus;
    const accepted = status === "accepted";
    const declined = status === "declined";
    const expectedAcceptanceName = props.expectedAcceptanceName || props.contactName || props.clientName;
    const acceptanceNameMatches =
      normalizeAcceptanceName(acceptanceName) ===
      normalizeAcceptanceName(expectedAcceptanceName);

    const p = {
      number: props.proposalNumber || (isGerman ? "ANGEBOT" : "PROPOSAL"),
      issued: props.issuedDate || "—",
      title: props.title || (isGerman ? "Angebot" : "Proposal"),
      client: props.clientName || "—",
      contact: props.contactName || props.clientName || "—",
      contactEmail: props.contactEmail || "",
      website: props.website || "—",
      timeline: props.timelineText || "—",
      timelineNote: isGerman ? "ab Projektstart" : "from project start",
      validUntil: props.validUntil || "—",
      validDays: "",
      paymentTerms: "",
      priceNote: "",
      salutation: isGerman
        ? `Guten Tag ${props.contactName || props.clientName},`
        : `Hello ${props.contactName || props.clientName},`,
      headline: props.title,
      summary: introLines[0] || props.introText,
      intro: introLines.length ? introLines : [props.introText].filter(Boolean),
      notes: props.notes || "",
      sender: {
        name: ownerName,
        role: ownerRole,
        email: ownerEmail,
        site: ownerSite,
        initials: ownerName.split(/\s+/).map((part) => part[0] || "").join("").slice(0, 2).toUpperCase() || "JC",
        initial: ownerName.trim()[0]?.toUpperCase() || "J",
      },
    };

    const services = props.scope.map((label, index) => ({
      num: String(index + 1).padStart(2, "0"),
      roman: ROMAN[index] || String(index + 1),
      label,
      detail: "",
      amount: "",
    }));

    const baseSections = (props.customSections || []).map((section, index) => {
      const contentLines = cleanLines(section.content);
      const looksLikeList = contentLines.length > 1 && contentLines.every((line) => /^[-•]/.test(line));
      return {
        num: String(index + 3).padStart(2, "0"),
        roman: ROMAN[index + 1] || String(index + 2),
        title: section.title,
        isText: !looksLikeList,
        isList: looksLikeList,
        isSteps: false,
        body: section.content,
        items: looksLikeList
          ? contentLines.map((line) => ({ label: line.replace(/^[-•]\s*/, ""), marker: "—" }))
          : [],
      };
    });

    if (props.firstTimeClient && !baseSections.some((section) => /garantie|guarantee/i.test(section.title))) {
      baseSections.push({
        num: String(baseSections.length + 3).padStart(2, "0"),
        roman: ROMAN[baseSections.length + 1] || String(baseSections.length + 2),
        title: isGerman ? "Erstkunden-Garantie" : "First-client guarantee",
        isText: true,
        isList: false,
        isSteps: false,
        body: isGerman
          ? "Sollte die erste vorgestellte Designrichtung nicht zu den Erwartungen passen, kann das Projekt vor Beginn der Umsetzung beendet werden."
          : "If the first presented design direction does not meet expectations, the project can be ended before implementation begins.",
        items: [],
      });
    }

    const meta = [
      { label: isGerman ? "Für" : "For", value: p.client, note: p.contact },
      { label: isGerman ? "Zeitrahmen" : "Timeline", value: p.timeline, note: p.timelineNote },
      { label: isGerman ? "Gültig bis" : "Valid until", value: p.validUntil, note: p.validDays },
      { label: "Website", value: p.website, note: isGerman ? "Aktueller Auftritt" : "Current website" },
      { label: isGerman ? "Angebot" : "Proposal", value: p.number, note: `${isGerman ? "Ausgestellt" : "Issued"} ${p.issued}` },
    ];

    const terms = [
      { label: isGerman ? "Zeitrahmen" : "Timeline", value: p.timeline },
      { label: isGerman ? "Gültig bis" : "Valid until", value: p.validUntil },
      { label: isGerman ? "Angebot" : "Proposal", value: p.number },
    ];

    const closed = accepted
      ? {
          kicker: isGerman ? "Angebot angenommen" : "Proposal accepted",
          title: isGerman ? "Danke — wir starten das Projekt." : "Thank you — we can start the project.",
          body: props.acceptedByName
            ? `${isGerman ? "Bestätigt von" : "Confirmed by"} ${props.acceptedByName}${props.acceptedAt ? ` · ${props.acceptedAt}` : ""}.`
            : isGerman ? "Das Angebot wurde verbindlich angenommen." : "The proposal has been accepted.",
          ink: "#2F6B3A",
          onDark: "#8FE3A5",
        }
      : {
          kicker: isGerman ? "Angebot abgelehnt" : "Proposal declined",
          title: isGerman ? "Danke für die Rückmeldung." : "Thank you for your response.",
          body: isGerman ? "Das Angebot wurde abgelehnt." : "The proposal has been declined.",
          ink: "#B42318",
          onDark: "#F0A9A2",
        };

    const doAccept = () => {
      const acceptedByName = acceptanceName.trim();
      if (!confirmed || acceptedByName.length < 2 || !acceptanceNameMatches) return;
      if (props.onAccept) {
        void props.onAccept(acceptedByName);
      } else {
        setLocalStatus("accepted");
        setModalOpen(false);
        setConfirmed(false);
        setAcceptanceName("");
      }
    };

    const doDecline = () => {
      if (props.onDecline) void props.onDecline();
      else setLocalStatus("declined");
    };

    return {
      p,
      price: props.priceLabel,
      services,
      sections: baseSections,
      meta,
      terms,
      sender: p.sender,
      intro: p.intro.map((text) => ({ text })),
      serviceCount: `${props.scope.length} ${isGerman ? "Positionen" : "items"}`,
      hasNotes: Boolean(props.notes),
      investNum: String(baseSections.length + 3).padStart(2, "0"),
      accent,
      accentOnDark: lift(accent, 0.58),
      isSignature: template === "signature",
      isMinimal: template === "minimal",
      isKontur: template === "kontur",
      isKanzlei: template === "kanzlei",
      isPrisma: template === "prisma",
      isAtelier: template === "atelier",
      isKompakt: template === "kompakt",
      statusLabel: accepted ? (isGerman ? "Angenommen" : "Accepted") : declined ? (isGerman ? "Abgelehnt" : "Declined") : (isGerman ? "Offen" : "Open"),
      statusChip: `padding:2px 8px;border-radius:6px;font-family:'Geist Mono', monospace;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;${accepted ? "background:#E9F0EA;color:#2F6B3A" : declined ? "background:#FCEEEC;color:#B42318" : "background:rgba(20,22,26,.06);color:#6B6660"}`,
      konturDot: `width:8px;height:8px;flex:none;border-radius:999px;background:${accepted ? "#2F6B3A" : declined ? "#B42318" : accent}`,
      isOpen: !accepted && !declined,
      isClosed: accepted || declined,
      closedKicker: closed.kicker,
      closedTitle: closed.title,
      closedBody: closed.body,
      closedInk: closed.ink,
      closedAccent: closed.onDark,
      closedOnDark: closed.onDark,
      acceptCopy: isGerman
        ? `Mit der Zusage bestätigen Sie den beschriebenen Leistungsumfang, den Projektpreis von ${props.priceLabel} und die aufgeführten Rahmenbedingungen. Anschließend erhalten Sie automatisch eine PDF-Kopie per E-Mail.`
        : `By accepting, you confirm the described scope, the project price of ${props.priceLabel}, and the stated terms. You will then automatically receive a PDF copy by email.`,
      footerLeft: `${isGerman ? "Erstellt von" : "Created by"} ${p.sender.name} · ${p.sender.site}`,
      footerRight: `${p.number} · REV ${props.revision ?? 1}`,
      railFacts: [
        { label: isGerman ? "Zeitrahmen" : "Timeline", value: p.timeline },
        { label: isGerman ? "Gültig bis" : "Valid until", value: p.validUntil },
        { label: isGerman ? "Positionen" : "Items", value: String(props.scope.length) },
      ],
      coverGlow: `position:absolute;top:-180px;right:-120px;width:560px;height:560px;border-radius:999px;pointer-events:none;background:radial-gradient(circle, ${accent}55, rgba(0,0,0,0) 68%)`,
      markStyle: `width:36px;height:36px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif', Georgia, serif;font-size:19px;color:#FFFFFF;background:${accent}`,
      prismaMark: `width:30px;height:30px;flex:none;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'Geist Mono', monospace;font-size:11px;font-weight:500;color:#FFFFFF;background:${accent}`,
      prismaBand: `display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:24px 32px;padding:26px 28px;background:${accent};color:#FFFFFF`,
      accentDotStyle: `width:5px;height:5px;border-radius:999px;background:${accent}`,
      dotStyle: `width:5px;height:5px;flex:none;margin-top:8px;border-radius:999px;background:${accent}`,
      ctaPill: `height:46px;padding:0 22px;border:none;border-radius:999px;display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;color:#FFFFFF;cursor:pointer;background:${accent};box-shadow:0 8px 20px -10px ${accent}99`,
      ctaSquare: `height:42px;padding:0 20px;border:none;border-radius:8px;display:flex;align-items:center;font-size:13.5px;font-weight:500;color:#FFFFFF;cursor:pointer;background:${accent}`,
      modalOpen,
      notConfirmed: !confirmed || acceptanceName.trim().length < 2 || !acceptanceNameMatches,
      expectedAcceptanceName,
      acceptanceName,
      acceptanceNameMatches,
      onAcceptanceNameInput: (event: React.FormEvent<HTMLInputElement>) => {
        setAcceptanceName(event.currentTarget.value);
      },
      openModal: () => {
        setAcceptanceName("");
        setConfirmed(false);
        setModalOpen(true);
      },
      closeModal: () => {
        setModalOpen(false);
        setConfirmed(false);
        setAcceptanceName("");
      },
      toggleConfirm: () => setConfirmed((current) => !current),
      accept: doAccept,
      decline: doDecline,
      printProposal: async () => {
        if (typeof window === "undefined") return;
        if (props.pdfUrl) {
          window.location.href = props.pdfUrl;
          return;
        }
        try {
          await document.fonts.ready;
          await Promise.all([
            document.fonts.load('16px "Instrument Serif"'),
            document.fonts.load('16px "Libre Baskerville"'),
            document.fonts.load('16px Geist'),
            document.fonts.load('16px "Geist Mono"'),
          ]);
        } catch {
          // Builder previews can still use the browser print fallback.
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => window.print());
        });
      },
      contactProposal: () => {
        if (typeof window !== "undefined") window.location.href = `mailto:${ownerEmail}`;
      },
      boxStyle: `width:18px;height:18px;flex:none;margin-top:1px;border-radius:5px;display:flex;align-items:center;justify-content:center;transition:all .15s ease;${confirmed ? `background:${accent};border:1px solid ${accent}` : "background:#FFFFFF;border:1px solid rgba(20,22,26,.22)"}`,
      boxCheckStyle: `width:11px;height:11px;background:#FFFFFF;mask:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23000%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M20%206%209%2017l-5-5%27/%3E%3C/svg%3E) center/contain no-repeat;opacity:${confirmed ? "1" : "0"}`,
      confirmBtnStyle: `height:42px;padding:0 18px;border:none;border-radius:10px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#FFFFFF;background:${accent};${confirmed && acceptanceNameMatches ? "cursor:pointer;opacity:1" : "cursor:not-allowed;opacity:.38"}`,
      railCta: `margin-top:16px;width:100%;height:40px;border:none;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#FFFFFF;cursor:pointer;background:${accent}`,
    };
  }, [
    accent,
    acceptanceName,
    confirmed,
    localStatus,
    modalOpen,
    props,
    template,
  ]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
      />
      <div style={{ fontFamily: "Geist, Helvetica, Arial, sans-serif", color: "#0B0C0E" }}>
        <style>{`
          @keyframes lbUp { from { transform: translateY(10px); } to { transform: none; } }
          @media (prefers-reduced-motion: reduce) { .lb-template-root *, .lb-template-root *::before, .lb-template-root *::after { animation: none !important; transition: none !important; } }
          @media print {
            @page { size: A4; margin: 0; }
            html, body { margin: 0 !important; padding: 0 !important; background: #FFFFFF !important; }
            body, .lb-template-root, .lb-template-root *, .lb-template-root *::before, .lb-template-root *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            [data-picker], [data-noprint] { display: none !important; }
            [data-doc] { box-shadow: none !important; }
            section { break-inside: avoid; }
          }
        `}</style>
        <div className="lb-template-root" data-template={template}>
          {PROPOSAL_TEMPLATE_AST.map((node, index) => renderNode(node, data, `root-${index}`, props.isGerman))}
        </div>
      </div>
    </>
  );
}
