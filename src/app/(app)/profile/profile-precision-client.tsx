"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { logout } from "@/app/(app)/actions";
import {
  changeAccountEmail,
  changePassword,
  type LeadbaseProfileData,
  type ProposalBrandingDefaults,
  saveAvatar,
  saveProfile,
  saveProposalBranding,
} from "./actions";
import { useLanguage } from "@/components/language-provider";
import { COUNTRY_DIAL_CODES, countryFlag } from "@/lib/country-dial-codes";
import { cn } from "@/lib/utils";
import styles from "./profile-precision.module.css";

type ProfileState = LeadbaseProfileData;

type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  secondary: string;
};

type UsageResponse = {
  configured?: boolean;
  requiresAdminKey?: boolean;
  error?: string;
  scope?: string;
  period?: { start: string; end: string };
  plan?: {
    id?: string;
    monthlyTokenLimit?: number | null;
    purchasedTokenBalance?: number;
    effectiveLimit?: number | null;
    remainingTokens?: number | null;
  };
  totals?: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    embeddingTokens: number;
    totalTokens: number;
    modelRequests: number;
    imageRequests: number;
    imagesProcessed: number;
    webSearchCalls: number;
    fileSearchCalls: number;
    costUsd: number;
  };
  byModel?: Array<{ model: string; inputTokens: number; outputTokens: number; requests: number }>;
  trend?: Array<{ date: string; tokens: number; requests: number; costUsd: number }>;
};

const copy = {
  de: {
    eyebrow: "Konto",
    title: "Profil",
    description:
      "Wer du innerhalb von Leadbase bist: persönliche, geschäftliche und Absender-Identität – wiederverwendet für Outreach, Follow-ups und Proposals.",
    edit: "Profil bearbeiten",
    cancel: "Abbrechen",
    save: "Änderungen speichern",
    saving: "Speichert…",
    saved: "Gespeichert",
    profileSetupRequired: "Profil muss eingerichtet werden",
    emptyIdentity: "Profil noch nicht eingerichtet",
    completeProfile: "Profil vervollständigen",
    ready: "Bereit für Outreach",
    missingPhone: "Für Proposals fehlt: Telefon",
    avatar: "Avatar ändern",
    editHint: "Bearbeitungsmodus – Änderungen werden erst mit Speichern übernommen.",
    senderIdentity: "Absender-Identität",
    senderHint: "Diese Identität nutzt Leadbase für Outreach, Follow-ups und Antworten.",
    senderHintStrong: "Settings regelt die Verbindung – hier steht, wer sendet.",
    gmailSettings: "Gmail-Verbindung → Einstellungen",
    senderName: "Absendername",
    role: "Rolle im Outreach",
    replyAddress: "Antwort-Adresse",
    website: "Website",
    signature: "Standard-Signatur",
    signatureNote: "An generierte E-Mails angehängt",
    business: "Geschäftliche Identität",
    businessNote: "Fließt in Proposals & Angebote",
    company: "Firma / Marke",
    focus: "Leistungsschwerpunkt",
    shortDescription: "Kurzbeschreibung",
    aiContext: "Kontext für KI-Textgenerierung",
    personal: "Persönliche Angaben",
    fullName: "Vollständiger Name",
    phone: "Telefon",
    phoneMissing: "Wird im Proposal-Footer erwartet",
    location: "Standort",
    locationPlaceholder: "Stadt suchen…",
    googleAttribution: "Powered by Google",
    proposalPreview: "So erscheinst du im Proposal",
    proposalInfoTitle: "Proposal Branding",
    proposalInfo:
      "Logo und Akzentfarbe werden als dein Standard gespeichert und bei neuen Lead-Proposals automatisch vorausgewählt.",
    openBuilder: "Branding bearbeiten",
    aiUsage: "OpenAI-Nutzung",
    thisMonth: "Dieser Monat",
    tokens: "Tokens",
    requests: "Requests",
    cost: "Kosten",
    input: "Input",
    output: "Output",
    cached: "Cached Input",
    otherAi: "Weitere OpenAI-Nutzung",
    webSearch: "Web Search",
    fileSearch: "File Search",
    images: "Bilder",
    models: "Modelle",
    noUsage: "Noch keine Nutzung in diesem Zeitraum.",
    usageScope: "Leadbase-interne KI-Nutzung dieses Accounts. Neue KI-Aufrufe werden direkt nach Abschluss verbucht.",
    usageSetupTitle: "KI-Nutzung wird eingerichtet",
    usageSetup:
      "Für die offiziellen Organisations-Usage-Daten braucht Leadbase einen OpenAI Admin API Key. Hinterlege OPENAI_ADMIN_KEY in .env.local; danach erscheinen hier echte Werte statt Testdaten.",
    reload: "Neu laden",
    workspace: "Workspace",
    owner: "Inhaber",
    privateWorkspace: "Privater Workspace",
    workspaceNote: "Leadbase läuft aktuell als Einzel-Workspace.",
    security: "Konto & Sicherheit",
    accountEmail: "Konto-E-Mail",
    login: "Anmeldung",
    emailPassword: "E-Mail & Passwort",
    password: "Passwort",
    passwordNote: "Kann direkt über Supabase Auth geändert werden",
    change: "Ändern",
    signOut: "Abmelden",
    securityNote: "2FA, Passkeys und Geräte-Sessions können später ergänzt werden.",
    copied: "Kopiert",
    cropTitle: "Profilbild anpassen",
    cropHint: "Bild ziehen, um den Ausschnitt zu verschieben. Mit dem Regler kannst du zoomen.",
    chooseImage: "Anderes Bild",
    zoom: "Zoom",
    saveAvatar: "Profilbild speichern",
    avatarSaving: "Wird gespeichert…",
    imageLoadError: "Das Bild konnte nicht geladen werden. Bitte JPG, PNG oder WebP verwenden.",
    brandingTitle: "Standard-Branding für Proposals",
    brandingHint: "Diese Werte werden pro Benutzer gespeichert und automatisch in neuen Proposal-Buildern vorausgewählt.",
    accent: "Akzentfarbe",
    logo: "Logo",
    removeLogo: "Logo entfernen",
    saveBranding: "Branding speichern",
    emailTitle: "Konto-E-Mail ändern",
    emailHint: "Je nach Supabase-Konfiguration musst du die neue Adresse per E-Mail bestätigen.",
    newEmail: "Neue E-Mail-Adresse",
    passwordTitle: "Passwort ändern",
    passwordHint: "Mindestens 8 Zeichen. Das neue Passwort gilt sofort.",
    newPassword: "Neues Passwort",
    repeatPassword: "Passwort wiederholen",
    passwordsDiffer: "Die Passwörter stimmen nicht überein.",
  },
  en: {
    eyebrow: "Account",
    title: "Profile",
    description:
      "Who you are inside Leadbase: personal, business and sender identity – reused for outreach, follow-ups and proposals.",
    edit: "Edit profile",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    saved: "Saved",
    profileSetupRequired: "Profile setup required",
    emptyIdentity: "Profile not set up yet",
    completeProfile: "Complete profile",
    ready: "Ready for outreach",
    missingPhone: "Missing for proposals: phone",
    avatar: "Change avatar",
    editHint: "Edit mode – changes are only applied after saving.",
    senderIdentity: "Sender identity",
    senderHint: "Leadbase uses this identity for outreach, follow-ups and replies.",
    senderHintStrong: "Settings controls the connection – this page defines who sends.",
    gmailSettings: "Gmail connection → Settings",
    senderName: "Sender name",
    role: "Outreach role",
    replyAddress: "Reply address",
    website: "Website",
    signature: "Default signature",
    signatureNote: "Attached to generated emails",
    business: "Business identity",
    businessNote: "Used in proposals & offers",
    company: "Company / brand",
    focus: "Service focus",
    shortDescription: "Short description",
    aiContext: "Context for AI text generation",
    personal: "Personal details",
    fullName: "Full name",
    phone: "Phone",
    phoneMissing: "Expected in the proposal footer",
    location: "Location",
    locationPlaceholder: "Search city…",
    googleAttribution: "Powered by Google",
    proposalPreview: "How you appear in proposals",
    proposalInfoTitle: "Proposal branding",
    proposalInfo:
      "Logo and accent color are stored as your default and automatically selected for new lead proposals.",
    openBuilder: "Edit branding",
    aiUsage: "OpenAI usage",
    thisMonth: "This month",
    tokens: "Tokens",
    requests: "Requests",
    cost: "Cost",
    input: "Input",
    output: "Output",
    cached: "Cached input",
    otherAi: "Other OpenAI usage",
    webSearch: "Web Search",
    fileSearch: "File Search",
    images: "Images",
    models: "Models",
    noUsage: "No usage in this period yet.",
    usageScope: "Leadbase-internal AI usage for this account. New AI requests are booked immediately after completion.",
    usageSetupTitle: "AI usage is being set up",
    usageSetup:
      "Run the Phase 11B.4 SQL migration. Usage for this Leadbase account will then be tracked automatically.",
    reload: "Reload",
    workspace: "Workspace",
    owner: "Owner",
    privateWorkspace: "Private workspace",
    workspaceNote: "Leadbase currently runs as a single-user workspace.",
    security: "Account & security",
    accountEmail: "Account email",
    login: "Login",
    emailPassword: "Email & password",
    password: "Password",
    passwordNote: "Can be changed directly through Supabase Auth",
    change: "Change",
    signOut: "Sign out",
    securityNote: "2FA, passkeys and device sessions can be added later.",
    copied: "Copied",
    cropTitle: "Adjust profile picture",
    cropHint: "Drag the image to reposition the crop. Use the slider to zoom.",
    chooseImage: "Choose another image",
    zoom: "Zoom",
    saveAvatar: "Save profile picture",
    avatarSaving: "Saving…",
    imageLoadError: "The image could not be loaded. Please use JPG, PNG or WebP.",
    brandingTitle: "Default proposal branding",
    brandingHint: "These values are stored per user and automatically selected in new Proposal Builders.",
    accent: "Accent color",
    logo: "Logo",
    removeLogo: "Remove logo",
    saveBranding: "Save branding",
    emailTitle: "Change account email",
    emailHint: "Depending on your Supabase setup, the new address may need email confirmation.",
    newEmail: "New email address",
    passwordTitle: "Change password",
    passwordHint: "At least 8 characters. The new password takes effect immediately.",
    newPassword: "New password",
    repeatPassword: "Repeat password",
    passwordsDiffer: "Passwords do not match.",
  },
} as const;

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LB";
}

function Modal({ title, subtitle, children, onClose, wide = false }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={cn(styles.modal, wide && styles.modalWide)} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHeader}>
          <div><strong>{title}</strong>{subtitle ? <p>{subtitle}</p> : null}</div>
          <button type="button" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileField({ label, value, editing, multiline = false, wide = false, onChange, children }: {
  label: string;
  value: string;
  editing: boolean;
  multiline?: boolean;
  wide?: boolean;
  onChange?: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className={cn(styles.field, wide && styles.fieldWide)}>
      <div className={styles.fieldLabelRow}><span className={styles.fieldLabel}>{label}</span></div>
      {editing && onChange ? (
        multiline ? (
          <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={styles.textarea} />
        ) : (
          <input value={value} onChange={(event) => onChange(event.target.value)} className={styles.input} />
        )
      ) : children ? children : <div className={styles.fieldValue}>{value || "—"}</div>}
    </div>
  );
}

function PhoneEditor({ countryCode, phone, onCountryCodeChange, onPhoneChange }: {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  const selected = COUNTRY_DIAL_CODES.find((country) => country.dialCode === countryCode) ?? COUNTRY_DIAL_CODES.find((country) => country.iso2 === "DE");
  return (
    <div className={styles.phoneEditor}>
      <label className={styles.countrySelectWrap}>
        <span>{selected ? countryFlag(selected.iso2) : "🌐"} {countryCode}</span>
        <ChevronDown />
        <select value={countryCode} onChange={(event) => onCountryCodeChange(event.target.value)} aria-label="Country calling code">
          {COUNTRY_DIAL_CODES.map((country) => (
            <option key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
              {countryFlag(country.iso2)} {country.name} ({country.dialCode})
            </option>
          ))}
        </select>
      </label>
      <input value={phone} onChange={(event) => onPhoneChange(event.target.value.replace(/[^0-9 ()\-./]/g, ""))} className={styles.input} placeholder="151 23456789" inputMode="tel" />
    </div>
  );
}

function LocationEditor({ value, language, placeholder, attribution, onChange }: {
  value: string;
  language: "de" | "en";
  placeholder: string;
  attribution: string;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/profile/cities?q=${encodeURIComponent(value)}&lang=${language}`, { signal: controller.signal });
        const data = await response.json() as { suggestions?: CitySuggestion[] };
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions?.length ?? 0) > 0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value, language]);

  return (
    <div className={styles.locationEditor}>
      <div className={styles.locationInputWrap}>
        <input value={value} onFocus={() => suggestions.length && setOpen(true)} onChange={(event) => onChange(event.target.value)} className={styles.input} placeholder={placeholder} autoComplete="off" />
        {loading ? <Loader2 className={styles.inputSpinner} /> : null}
      </div>
      {open ? (
        <div className={styles.cityMenu}>
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { skipNextSearch.current = true; onChange(suggestion.label); setSuggestions([]); setOpen(false); }}>
              <strong>{suggestion.city}</strong><span>{suggestion.secondary}</span>
            </button>
          ))}
          <div className={styles.googleAttribution}>{attribution}</div>
        </div>
      ) : null}
    </div>
  );
}

function AvatarCropDialog({ file, labels, onClose, onSaved }: {
  file: File;
  labels: typeof copy.de | typeof copy.en;
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const [src, setSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const viewport = 286;
  const baseScale = Math.max(viewport / imageSize.width, viewport / imageSize.height);
  const scale = baseScale * zoom;
  const displayW = imageSize.width * scale;
  const displayH = imageSize.height * scale;
  const maxX = Math.max(0, (displayW - viewport) / 2);
  const maxY = Math.max(0, (displayH - viewport) / 2);

  useEffect(() => {
    // Create the object URL inside the effect. Next.js/React Strict Mode intentionally
    // mounts, cleans up and re-runs effects in development. Creating the URL in
    // useMemo and revoking it in an effect cleanup revoked the *same* URL before
    // the second mount, leaving the <img> in a broken state.
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    setImageSize({ width: 1, height: 1 });
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setError("");
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  useEffect(() => setOffset((current) => ({ x: Math.max(-maxX, Math.min(maxX, current.x)), y: Math.max(-maxY, Math.min(maxY, current.y)) })), [maxX, maxY]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const x = drag.current.ox + event.clientX - drag.current.x;
    const y = drag.current.oy + event.clientY - drag.current.y;
    setOffset({ x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) });
  }

  async function persist() {
    const image = imgRef.current;
    if (!image) return;
    setSaving(true); setError("");
    try {
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        try { await image.decode(); } catch { /* handled by the guard below */ }
      }
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        throw new Error(labels.imageLoadError);
      }
      const topLeftX = (viewport - displayW) / 2 + offset.x;
      const topLeftY = (viewport - displayH) / 2 + offset.y;
      const sx = Math.max(0, -topLeftX / scale);
      const sy = Math.max(0, -topLeftY / scale);
      const sourceSize = viewport / scale;
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, 512, 512);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
      if (!blob) throw new Error("Image export failed");
      const formData = new FormData();
      formData.append("avatar", new File([blob], "avatar.webp", { type: "image/webp" }));
      const result = await saveAvatar(formData);
      if (!result.ok || !result.data) throw new Error(result.ok ? "Upload failed" : result.error);
      onSaved(result.data.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal title={labels.cropTitle} subtitle={labels.cropHint} onClose={onClose}>
      <div className={styles.cropBody}>
        <div className={styles.cropViewport} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          {src ? <img ref={imgRef} src={src} alt="" draggable={false} onLoad={(event) => { setError(""); setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); }} onError={() => setError(labels.imageLoadError)} style={{ width: displayW, height: displayH, transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)` }} /> : null}
          <div className={styles.cropRing} />
        </div>
        <label className={styles.zoomRow}><span>{labels.zoom}</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        {error ? <div className={styles.modalError}>{error}</div> : null}
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{labels.cancel}</button>
        <button type="button" className={styles.primaryButton} onClick={persist} disabled={saving}>{saving ? <Loader2 className={styles.spin} /> : <Upload />}{saving ? labels.avatarSaving : labels.saveAvatar}</button>
      </div>
    </Modal>
  );
}

function ProposalBrandingDialog({ labels, initial, onClose, onSaved }: {
  labels: typeof copy.de | typeof copy.en;
  initial: ProposalBrandingDefaults;
  onClose: () => void;
  onSaved: (value: ProposalBrandingDefaults) => void;
}) {
  const [accentColor, setAccentColor] = useState(initial.accentColor || "#002BBA");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (logoFile && preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [logoFile, preview]);

  function chooseLogo(file: File | null) {
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setLogoFile(file); setPreview(URL.createObjectURL(file)); setRemoveLogo(false);
  }

  async function persist() {
    setSaving(true); setError("");
    const formData = new FormData();
    formData.set("accentColor", accentColor);
    if (logoFile) formData.set("logo", logoFile);
    if (removeLogo) formData.set("removeLogo", "1");
    const result = await saveProposalBranding(formData);
    if (!result.ok || !result.data) setError(result.ok ? "Could not save branding." : result.error);
    else onSaved(result.data);
    setSaving(false);
  }

  return (
    <Modal title={labels.brandingTitle} subtitle={labels.brandingHint} onClose={onClose} wide>
      <div className={styles.brandingBody}>
        <div className={styles.brandingColorRow}>
          <div><span className={styles.fieldLabel}>{labels.accent}</span><p>#002BBA remains the Leadbase default if you reset it.</p></div>
          <div className={styles.colorControl}><input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value.toUpperCase())} /><input value={accentColor} onChange={(event) => setAccentColor(event.target.value.toUpperCase())} maxLength={7} /></div>
        </div>
        <div className={styles.brandingLogoRow}>
          <div><span className={styles.fieldLabel}>{labels.logo}</span><p>PNG, JPG or WebP · max. 2 MB</p></div>
          <label className={styles.logoDrop}>
            {preview && !removeLogo ? <img src={preview} alt="Proposal logo" /> : <><Upload /><span>{labels.logo}</span></>}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseLogo(event.target.files?.[0] ?? null)} />
          </label>
          {preview ? <label className={styles.removeLogo}><input type="checkbox" checked={removeLogo} onChange={(event) => setRemoveLogo(event.target.checked)} />{labels.removeLogo}</label> : null}
        </div>
        <div className={styles.brandingPreview} style={{ "--proposal-accent": accentColor } as CSSProperties}>
          <div><span>{labels.proposalPreview}</span><i /></div>
          <strong>Leadbase Proposal</strong>
          <button type="button">Primary action</button>
        </div>
        {error ? <div className={styles.modalError}>{error}</div> : null}
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{labels.cancel}</button>
        <button type="button" className={styles.primaryButton} onClick={persist} disabled={saving}>{saving ? <Loader2 className={styles.spin} /> : <Check />}{labels.saveBranding}</button>
      </div>
    </Modal>
  );
}

function UsageTrend({ values }: { values: Array<{ date: string; tokens: number }> }) {
  const width = 290; const height = 60;
  if (!values.length) return <div className={styles.emptyTrend} />;
  const max = Math.max(1, ...values.map((item) => item.tokens));
  const points = values.map((item, index) => [values.length === 1 ? width : (index / (values.length - 1)) * width, 52 - (item.tokens / max) * 42] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,60 ${line} 290,60`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={styles.usageChart} aria-hidden="true">
      <defs><linearGradient id="lbRealUsageFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#002BBA" stopOpacity="0.16" /><stop offset="100%" stopColor="#002BBA" stopOpacity="0" /></linearGradient></defs>
      <polygon points={area} fill="url(#lbRealUsageFade)" /><polyline points={line} fill="none" stroke="#002BBA" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function OpenAIUsageCard({ labels }: { labels: typeof copy.de | typeof copy.en }) {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/profile/openai-usage", { cache: "no-store" });
      const payload = await response.json() as UsageResponse;
      setData(payload);
    } catch {
      setData({ error: "Leadbase AI usage could not be loaded." });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const handleUsageUpdate = () => void load(true);
    window.addEventListener("leadbase:ai-usage-updated", handleUsageUpdate);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 15_000);
    return () => {
      window.removeEventListener("leadbase:ai-usage-updated", handleUsageUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const totals = data?.totals;
  const modelTotal = (data?.byModel ?? []).reduce((sum, model) => sum + model.inputTokens + model.outputTokens, 0);
  const limit = typeof data?.plan?.effectiveLimit === "number" ? data.plan.effectiveLimit : null;
  const remaining = typeof data?.plan?.remainingTokens === "number" ? data.plan.remainingTokens : null;
  const usagePercent = totals && limit && limit > 0 ? Math.min(100, Math.round((totals.totalTokens / limit) * 100)) : null;

  return (
    <section id="ai-usage" className={styles.sideCard}>
      <div className={styles.cardHeader}>
        <span>{labels.aiUsage}</span>
        {totals ? <b><i />{labels.thisMonth}</b> : null}
      </div>
      {loading ? (
        <div className={styles.usageLoading}><Loader2 className={styles.spin} /><span>AI Usage…</span></div>
      ) : totals ? (
        <>
          <div className={styles.realUsageHero}>
            <div>
              <span>{labels.tokens}</span>
              <strong>{limit !== null ? `${formatCompact(totals.totalTokens)} / ${formatCompact(limit)}` : formatCompact(totals.totalTokens)}</strong>
            </div>
            <div><span>{labels.requests}</span><strong>{formatCompact(totals.modelRequests)}</strong></div>
            <div>
              <span>{limit !== null ? (labels === copy.de ? "Verbleibend" : "Remaining") : labels.cost}</span>
              <strong>{limit !== null ? formatCompact(remaining ?? 0) : "—"}</strong>
            </div>
          </div>
          {usagePercent !== null ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 6, overflow: "hidden", borderRadius: 999, background: "rgba(11,12,14,.06)" }}>
                <div style={{ width: `${usagePercent}%`, height: "100%", borderRadius: 999, background: "#002BBA", transition: "width .25s ease" }} />
              </div>
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontFamily: '"Geist Mono", monospace', fontSize: 9, color: "#6B7078" }}>
                <span>{usagePercent}%</span><span>{data.plan?.id ?? "development"}</span>
              </div>
            </div>
          ) : null}
          <div className={styles.tokenSplit}>
            <div><span>{labels.input}</span><b>{formatCompact(totals.inputTokens)}</b></div>
            <div><span>{labels.output}</span><b>{formatCompact(totals.outputTokens)}</b></div>
            <div><span>{labels.cached}</span><b>{formatCompact(totals.cachedInputTokens)}</b></div>
          </div>
          <div className={styles.modelList}>
            <div className={styles.usageSectionTitle}>{labels.models}</div>
            {(data.byModel ?? []).slice(0, 4).map((model) => {
              const total = model.inputTokens + model.outputTokens;
              const percent = modelTotal ? Math.max(2, Math.round((total / modelTotal) * 100)) : 0;
              return <div key={model.model} className={styles.modelRow}><span>{model.model}</span><div><i style={{ width: `${percent}%` }} /></div><b>{formatCompact(total)}</b></div>;
            })}
            {(data.byModel ?? []).length === 0 ? <div className={styles.usageDisclaimer}>{labels.noUsage}</div> : null}
          </div>
          <div className={styles.trendBlock}>
            <div><span>{labels.thisMonth}</span><span>{formatCompact(totals.totalTokens)} tokens</span></div>
            <UsageTrend values={(data.trend ?? []).map((item) => ({ date: item.date, tokens: item.tokens }))} />
            <div className={styles.trendAxis}><span>{data.trend?.[0]?.date.slice(5) ?? ""}</span><span>{data.trend?.at(-1)?.date.slice(5) ?? ""}</span></div>
          </div>
          <div className={styles.usageDisclaimer}>{labels.usageScope}</div>
        </>
      ) : (
        <div className={styles.usageSetup}>
          <Sparkles /><strong>{labels.usageSetupTitle}</strong><p>{labels.usageSetup}</p>
          {data?.error ? <code>{data.error}</code> : null}
          <button type="button" className={styles.secondaryButton} onClick={() => void load()}>{labels.reload}</button>
        </div>
      )}
    </section>
  );
}

function AccountDialog({ kind, currentEmail, labels, onClose, onMessage }: {
  kind: "email" | "password";
  currentEmail: string;
  labels: typeof copy.de | typeof copy.en;
  onClose: () => void;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function persist() {
    setError("");
    if (kind === "password" && password !== repeat) { setError(labels.passwordsDiffer); return; }
    setSaving(true);
    const result = kind === "email" ? await changeAccountEmail(email) : await changePassword(password);
    if (!result.ok) setError(result.error);
    else { onMessage(result.message ?? (kind === "email" ? labels.saved : labels.saved)); onClose(); }
    setSaving(false);
  }
  return (
    <Modal title={kind === "email" ? labels.emailTitle : labels.passwordTitle} subtitle={kind === "email" ? labels.emailHint : labels.passwordHint} onClose={onClose}>
      <div className={styles.accountDialogBody}>
        {kind === "email" ? <label><span>{labels.newEmail}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus /></label> : <><label><span>{labels.newPassword}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></label><label><span>{labels.repeatPassword}</span><input type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label></>}
        {error ? <div className={styles.modalError}>{error}</div> : null}
      </div>
      <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={onClose}>{labels.cancel}</button><button type="button" className={styles.primaryButton} onClick={persist} disabled={saving}>{saving ? <Loader2 className={styles.spin} /> : <Check />}{labels.save}</button></div>
    </Modal>
  );
}

export function ProfilePrecisionClient({ initialProfile, accountEmail, initialAvatarUrl, initialBranding }: {
  initialProfile: ProfileState;
  accountEmail: string;
  initialAvatarUrl: string | null;
  initialBranding: ProposalBrandingDefaults;
}) {
  const { language } = useLanguage();
  const t = copy[language];
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [draft, setDraft] = useState<ProfileState>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [branding, setBranding] = useState(initialBranding);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [accountDialog, setAccountDialog] = useState<"email" | "password" | null>(null);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);

  function update<K extends keyof ProfileState>(key: K, value: ProfileState[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function startEdit() { setDraft(profile); setEditing(true); setSaved(false); }
  function cancelEdit() { setDraft(profile); setEditing(false); }
  async function persistProfile() {
    setSaving(true); setNotice(null);
    const result = await saveProfile(draft);
    if (!result.ok || !result.data) setNotice({ message: result.ok ? "Save failed." : result.error, error: true });
    else {
      setProfile(result.data.profile); setDraft(result.data.profile); setEditing(false); setSaved(true);
      window.dispatchEvent(new CustomEvent("leadbase:profile-updated", { detail: { name: result.data.profile.fullName, avatarUrl } }));
      window.setTimeout(() => setSaved(false), 2200);
    }
    setSaving(false);
  }
  async function copyReplyMail() {
    try { await navigator.clipboard.writeText(profile.replyEmail); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }
  function onAvatarSaved(url: string) {
    setAvatarUrl(url); setCropFile(null);
    window.dispatchEvent(new CustomEvent("leadbase:profile-updated", { detail: { name: profile.fullName, avatarUrl: url } }));
  }

  const phoneDisplay = profile.phone ? `${profile.phoneCountryCode} ${profile.phone}` : "";
  const profileConfigured = [
    profile.fullName,
    profile.senderName,
    profile.outreachRole,
    profile.replyEmail,
    profile.website,
    profile.company,
  ].every((value) => value.trim().length > 0);
  const counter = !profileConfigured
    ? t.profileSetupRequired
    : phoneDisplay
      ? (language === "de" ? "Absender-Identität vollständig · Proposal-Profil vollständig" : "Sender identity complete · Proposal profile complete")
      : (language === "de" ? "Absender-Identität vollständig · 1 Angabe fehlt für Proposals" : "Sender identity complete · 1 detail missing for proposals");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}><span />{t.eyebrow}</div>
          <div className={styles.titleRow}><h1>{t.title}</h1><span>{counter}</span></div>
          <p>{t.description}</p>
        </div>
        <div className={styles.headerActions}>
          {saved ? <span className={styles.savedBadge}><Check />{t.saved}</span> : null}
          {!editing ? <button type="button" className={styles.primaryButton} onClick={startEdit}><Pencil />{t.edit}</button> : <><button type="button" className={styles.secondaryButton} onClick={cancelEdit}>{t.cancel}</button><button type="button" className={styles.primaryButton} onClick={persistProfile} disabled={saving}>{saving ? <Loader2 className={styles.spin} /> : null}{saving ? t.saving : t.save}</button></>}
        </div>
      </header>

      {notice ? <div className={cn(styles.noticeBar, notice.error && styles.noticeBarError)}>{notice.message}<button type="button" onClick={() => setNotice(null)}><X /></button></div> : null}

      <div className={styles.workspace}>
        <section className={styles.mainColumn}>
          <div className={styles.identityBand}>
            <button type="button" className={styles.avatar} onClick={() => fileRef.current?.click()} aria-label={t.avatar}>{avatarUrl ? <img src={avatarUrl} alt="" /> : initialsFor(profile.fullName)}</button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCropFile(file); event.currentTarget.value = ""; }} />
            <div className={styles.identityCopy}><div className={styles.identityName}>{profile.fullName || t.emptyIdentity}</div><div className={styles.identityRole}>{profile.outreachRole || "—"}</div><div className={styles.identityMeta}><span>{t.privateWorkspace}</span><i /><span>{profile.website || "—"}</span><i /><span>{profile.location || "—"}</span></div></div>
            <div className={styles.identityActions}><div className={styles.identityBadges}>{profileConfigured ? <span className={styles.readyBadge}><span />{t.ready}</span> : <span className={styles.missingBadge}>{t.completeProfile}</span>}{profileConfigured && !phoneDisplay ? <span className={styles.missingBadge}>{t.missingPhone}</span> : null}</div><button type="button" className={styles.avatarButton} onClick={() => fileRef.current?.click()}>{t.avatar}</button></div>
          </div>

          <div className={styles.profileSurface}>
            {editing ? <div className={styles.editHint}><Pencil />{t.editHint}</div> : null}
            <section className={styles.section}>
              <div className={styles.sectionHeading}><span>{t.senderIdentity}</span><i /><Link href="/settings">{t.gmailSettings}</Link></div>
              <p className={styles.sectionIntro}>{t.senderHint} <strong>{t.senderHintStrong}</strong></p>
              <div className={styles.twoColGrid}>
                <ProfileField label={t.senderName} value={editing ? draft.senderName : profile.senderName} editing={editing} onChange={(value) => update("senderName", value)} />
                <ProfileField label={t.role} value={editing ? draft.outreachRole : profile.outreachRole} editing={editing} onChange={(value) => update("outreachRole", value)} />
                <ProfileField label={t.replyAddress} value={editing ? draft.replyEmail : profile.replyEmail} editing={editing} onChange={(value) => update("replyEmail", value)}>{!editing ? <div className={styles.inlineValue}><span>{profile.replyEmail}</span><button type="button" onClick={copyReplyMail}><Copy /></button>{copied ? <em>{t.copied}</em> : null}</div> : null}</ProfileField>
                <ProfileField label={t.website} value={editing ? draft.website : profile.website} editing={editing} onChange={(value) => update("website", value)}>{!editing ? (profile.website ? <div className={styles.inlineValue}><a href={`https://${profile.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer">{profile.website}</a><ExternalLink /></div> : <div className={styles.fieldValue}>—</div>) : null}</ProfileField>
              </div>
              <div className={styles.insetBox}><div className={styles.insetHeader}><span>{t.signature}</span><em>{t.signatureNote}</em></div>{editing ? <textarea value={draft.signature} onChange={(event) => update("signature", event.target.value)} rows={3} className={styles.signatureTextarea} /> : <div className={styles.signature}>{profile.signature.split("\n").map((line, index) => <span key={`${index}-${line}`}>{line}<br /></span>)}</div>}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><span>{t.business}</span><i /><em>{t.businessNote}</em></div>
              <div className={styles.twoColGrid}>
                <ProfileField label={t.company} value={editing ? draft.company : profile.company} editing={editing} onChange={(value) => update("company", value)} />
                <ProfileField label={t.focus} value={editing ? draft.focus : profile.focus} editing={editing} onChange={(value) => update("focus", value)} />
                <ProfileField label={t.shortDescription} value={editing ? draft.description : profile.description} editing={editing} multiline wide onChange={(value) => update("description", value)} />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><span>{t.personal}</span><i /></div>
              <div className={styles.threeColGrid}>
                <ProfileField label={t.fullName} value={editing ? draft.fullName : profile.fullName} editing={editing} onChange={(value) => update("fullName", value)} />
                <div className={styles.field}><div className={styles.fieldLabelRow}><span className={styles.fieldLabel}>{t.phone}</span></div>{editing ? <PhoneEditor countryCode={draft.phoneCountryCode} phone={draft.phone} onCountryCodeChange={(value) => update("phoneCountryCode", value)} onPhoneChange={(value) => update("phone", value)} /> : phoneDisplay ? <div className={styles.fieldValue}>{phoneDisplay}</div> : <div className={styles.phoneMissing}><b>—</b><span>{t.phoneMissing}</span></div>}</div>
                <div className={styles.field}><div className={styles.fieldLabelRow}><span className={styles.fieldLabel}>{t.location}</span></div>{editing ? <LocationEditor value={draft.location} language={language} placeholder={t.locationPlaceholder} attribution={t.googleAttribution} onChange={(value) => update("location", value)} /> : <div className={styles.fieldValue}>{profile.location || "—"}</div>}</div>
              </div>
            </section>

            <section className={styles.proposalStrip}>
              <div className={styles.proposalPreview}><span>{t.proposalPreview}</span><strong>{profile.fullName || "—"}</strong><p>{profile.outreachRole || "—"}</p><div><span>{profile.website || "—"}</span><i /><span>{profile.replyEmail || "—"}</span></div></div>
              <div className={styles.proposalInfo}><div><FileText /><strong>{t.proposalInfoTitle}</strong></div><p>{t.proposalInfo}</p><button type="button" className={styles.linkButton} onClick={() => setBrandingOpen(true)}>{t.openBuilder}</button></div>
            </section>
          </div>
        </section>

        <aside className={styles.sideColumn}>
          <OpenAIUsageCard labels={t} />
          <section className={styles.sideCard}><div className={styles.cardHeader}><span>{t.workspace}</span><b>{t.owner}</b></div><div className={styles.workspaceIdentity}><div><Building2 /></div><div><strong>{t.privateWorkspace}</strong><span>{profile.fullName || "—"}</span></div></div><p className={styles.sideNote}>{t.workspaceNote}</p></section>
          <section className={cn(styles.sideCard, styles.securityCard)}>
            <div className={styles.cardHeader}><span>{t.security}</span></div>
            <div className={styles.securityRows}>
              <div><div><span>{t.accountEmail}</span><strong>{accountEmail}</strong></div><div className={styles.securityActionPair}><button type="button" onClick={() => navigator.clipboard?.writeText(accountEmail)}><Copy /></button><button type="button" className={styles.textButton} onClick={() => setAccountDialog("email")}>{t.change}</button></div></div>
              <div><div><span>{t.login}</span><strong>{t.emailPassword}</strong></div><Mail className={styles.securityRowIcon} /></div>
              <div><div><span>{t.password}</span><p>{t.passwordNote}</p></div><button type="button" className={styles.textButton} onClick={() => setAccountDialog("password")}><KeyRound />{t.change}</button></div>
            </div>
            <div className={styles.securityFooter}><form action={logout}><button type="submit" className={styles.destructiveButton}><LogOut />{t.signOut}</button></form><span>{t.securityNote}</span></div>
          </section>
        </aside>
      </div>

      {cropFile ? <AvatarCropDialog file={cropFile} labels={t} onClose={() => setCropFile(null)} onSaved={onAvatarSaved} /> : null}
      {brandingOpen ? <ProposalBrandingDialog labels={t} initial={branding} onClose={() => setBrandingOpen(false)} onSaved={(value) => { setBranding(value); setBrandingOpen(false); setNotice({ message: t.saved }); }} /> : null}
      {accountDialog ? <AccountDialog kind={accountDialog} currentEmail={accountEmail} labels={t} onClose={() => setAccountDialog(null)} onMessage={(message, error) => setNotice({ message, error })} /> : null}
    </div>
  );
}
