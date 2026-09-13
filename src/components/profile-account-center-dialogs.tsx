"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  saveAvatar,
  saveProfile,
  type AccountPlanSelection,
  type LeadbaseProfileData,
} from "@/app/(app)/profile/actions";
import { COUNTRY_DIAL_CODES, countryFlag, dialCodeFromLocale } from "@/lib/country-dial-codes";
import {
  LEADBASE_CURRENCIES,
  inferCurrencyFromLocation,
  inferCurrencyFromLocale,
  normalizeLeadbaseCurrency,
} from "@/lib/account-currency";
import {
  LEADBASE_CREDIT_TOPUPS,
  LEADBASE_CUSTOM_CREDITS_MAX,
  LEADBASE_CUSTOM_CREDITS_MIN,
  LEADBASE_CUSTOM_CREDITS_STEP,
  LEADBASE_PUBLIC_PLANS,
  LEADBASE_YEARLY_DISCOUNT_PERCENT,
  customCreditPriceEur,
  priceForTier,
  type LeadbaseBillingInterval,
  type LeadbasePublicPlanId,
} from "@/lib/public-plans";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";

type Language = "de" | "en";

type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  secondary: string;
};

const fieldClass =
  "mt-1.5 h-10 w-full rounded-[9px] border border-[#DFE1E5] bg-white px-3 text-[13px] text-[#0B0C0E] outline-none transition focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/15 dark:bg-[#121316] dark:text-[#F5F5F4]";
const labelClass =
  "block text-[11.5px] font-medium text-[#40454E] dark:text-[#D8D9DC]";
const monoClass =
  "font-mono text-[9px] uppercase tracking-[.11em] text-[#6B7078] dark:text-[#9CA0A8]";

function DialogShell({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[rgba(9,10,12,.46)] p-4 backdrop-blur-[2px] sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "my-auto flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-[14px] border border-black/[.07] bg-white shadow-[0_32px_70px_-26px_rgba(9,10,12,.46),0_2px_6px_rgba(9,10,12,.06)] sm:max-h-[min(84dvh,760px)] dark:border-white/10 dark:bg-[#0F1012]",
          wide ? "max-w-[760px] xl:max-w-[800px]" : "max-w-[520px]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-start gap-5 border-b border-black/[.07] px-5 py-3.5 sm:px-6 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-semibold tracking-[-.026em] text-[#0B0C0E] dark:text-[#F5F5F4]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[11.5px] leading-5 text-[#6B7078] dark:text-[#A8ABB2]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[#6B7078] transition hover:bg-black/[.045] hover:text-[#0B0C0E] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CityField({
  value,
  language,
  onChange,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const skipSearch = useRef(false);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      setOpen(false);
      setSuggestions([]);
      return;
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/profile/cities?q=${encodeURIComponent(value)}&lang=${language}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          suggestions?: CitySuggestion[];
        };
        const next = payload.suggestions ?? [];
        setSuggestions(next);
        setOpen(next.length > 0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [language, value]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          className={cn(fieldClass, "pr-9")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          placeholder={language === "de" ? "Stadt suchen" : "Search city"}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-[17px] size-3.5 animate-spin text-[#6B7078]" />
        ) : (
          <MapPin className="absolute right-3 top-[17px] size-3.5 text-[#8A9099]" />
        )}
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-[48px] z-30 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_16px_34px_-18px_rgba(9,10,12,.32)] dark:border-white/10 dark:bg-[#151619]">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="flex w-full items-baseline gap-1.5 px-3 py-2.5 text-left transition hover:bg-[#F7F8FA] dark:hover:bg-white/[.06]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                skipSearch.current = true;
                onChange(suggestion.label);
                setSuggestions([]);
                setOpen(false);
              }}
            >
              <strong className="text-[12.5px] font-medium text-[#0B0C0E] dark:text-white">
                {suggestion.city}
              </strong>
              <span className="truncate text-[11px] text-[#6B7078] dark:text-[#A8ABB2]">
                {suggestion.secondary}
              </span>
            </button>
          ))}
          <div className="border-t border-black/[.06] px-3 py-1.5 text-right text-[9px] text-[#8A9099] dark:border-white/10">
            Powered by Google
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PhoneField({
  code,
  phone,
  language,
  onCode,
  onPhone,
}: {
  code: string;
  phone: string;
  language: Language;
  onCode: (value: string) => void;
  onPhone: (value: string) => void;
}) {
  const selected = COUNTRY_DIAL_CODES.find((country) => country.dialCode === code) ?? null;

  return (
    <div className="mt-1.5 flex h-10 w-full min-w-0 overflow-hidden rounded-[9px] border border-[#DFE1E5] bg-white transition focus-within:border-[#002BBA] focus-within:ring-3 focus-within:ring-[#002BBA]/10 dark:border-white/15 dark:bg-[#121316]">
      <label className="relative h-full w-[118px] shrink-0 sm:w-[124px]">
        <span className="pointer-events-none absolute inset-0 flex items-center gap-2 px-3 pr-8 text-[12px] text-[#0B0C0E] dark:text-white">
          <span>{selected ? countryFlag(selected.iso2) : "🌐"}</span>
          <span className="truncate">{selected ? code : (language === "de" ? "Vorwahl" : "Code")}</span>
          <ChevronDown className="ml-auto size-3.5 shrink-0 text-[#6B7078]" />
        </span>
        <select
          value={code}
          onChange={(event) => onCode(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={language === "de" ? "Ländervorwahl" : "Country calling code"}
        >
          <option value="">{language === "de" ? "Ländervorwahl wählen" : "Choose country code"}</option>
          {COUNTRY_DIAL_CODES.map((country) => (
            <option key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
              {countryFlag(country.iso2)} {country.name} ({country.dialCode})
            </option>
          ))}
        </select>
      </label>
      <span className="my-2 w-px shrink-0 bg-black/10 dark:bg-white/15" aria-hidden="true" />
      <input
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-[13px] text-[#0B0C0E] outline-none placeholder:text-[#969BA3] dark:text-white dark:placeholder:text-[#737780]"
        value={phone}
        onChange={(event) => onPhone(event.target.value.replace(/[^0-9 ()\-./]/g, ""))}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={language === "de" ? "151 23456789" : "555 123 4567"}
      />
    </div>
  );
}

export function CurrencyField({
  currency,
  currencyMode,
  location,
  language,
  onCurrency,
  onMode,
}: {
  currency: string;
  currencyMode: "auto" | "manual";
  location: string;
  language: Language;
  onCurrency: (value: string) => void;
  onMode: (value: "auto" | "manual") => void;
}) {
  const inferred = inferCurrencyFromLocation(location) ?? normalizeLeadbaseCurrency(currency);
  return (
    <div className="mt-1.5 flex h-10 w-full min-w-0 overflow-hidden rounded-[9px] border border-[#DFE1E5] bg-white transition focus-within:border-[#002BBA] focus-within:ring-3 focus-within:ring-[#002BBA]/10 dark:border-white/15 dark:bg-[#121316]">
      <select
        value={currencyMode === "auto" ? "auto" : "manual"}
        onChange={(event) => onMode(event.target.value === "manual" ? "manual" : "auto")}
        className="h-full w-[132px] shrink-0 border-0 border-r border-black/10 bg-transparent px-3 text-[12px] outline-none dark:border-white/15 dark:text-white"
        aria-label={language === "de" ? "Währungsmodus" : "Currency mode"}
      >
        <option value="auto">{language === "de" ? `Auto · ${inferred}` : `Auto · ${inferred}`}</option>
        <option value="manual">{language === "de" ? "Manuell" : "Manual"}</option>
      </select>
      <select
        value={normalizeLeadbaseCurrency(currency)}
        onChange={(event) => {
          onMode("manual");
          onCurrency(event.target.value);
        }}
        disabled={currencyMode === "auto"}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-[12.5px] outline-none disabled:cursor-default disabled:text-[#6B7078] dark:text-white dark:disabled:text-[#A8ABB2]"
        aria-label={language === "de" ? "Währung" : "Currency"}
      >
        {LEADBASE_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
    </div>
  );
}

export function ProfileEditDialog({
  initialProfile,
  avatarUrl,
  gmailEmail,
  language,
  onClose,
  onSaved,
}: {
  initialProfile: LeadbaseProfileData;
  avatarUrl: string | null;
  gmailEmail: string | null;
  language: Language;
  onClose: () => void;
  onSaved: (profile: LeadbaseProfileData, avatarUrl: string | null) => void;
}) {
  const [draft, setDraft] = useState(initialProfile);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft.phoneCountryCode || (draft.currencyMode === "auto" && !draft.currency)) {
      const guessedDial = dialCodeFromLocale(navigator.language);
      const guessedCurrency = inferCurrencyFromLocation(draft.location) ?? inferCurrencyFromLocale(navigator.language);
      setDraft((current) => ({
        ...current,
        phoneCountryCode: current.phoneCountryCode || guessedDial || "",
        currency: current.currency || guessedCurrency || "USD",
      }));
    }
  }, [draft.currency, draft.currencyMode, draft.location, draft.phoneCountryCode]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function update<K extends keyof LeadbaseProfileData>(
    key: K,
    value: LeadbaseProfileData[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError(language === "de" ? "Das Profilbild darf maximal 3 MB groß sein." : "The profile image may be up to 3 MB.");
      return;
    }
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  }

  async function persist() {
    setError("");
    if (!draft.fullName.trim()) {
      setError(language === "de" ? "Vollständiger Name ist erforderlich." : "Full name is required.");
      return;
    }
    if (!draft.location.trim()) {
      setError(language === "de" ? "Standort ist erforderlich." : "Location is required.");
      return;
    }
    setSaving(true);
    try {
      let nextAvatar = avatarUrl;
      if (avatar) {
        const formData = new FormData();
        formData.set("avatar", avatar);
        const avatarResult = await saveAvatar(formData);
        if (!avatarResult.ok || !avatarResult.data) {
          throw new Error(avatarResult.ok ? "Avatar upload failed." : avatarResult.error);
        }
        nextAvatar = avatarResult.data.avatarUrl;
      }
      const result = await saveProfile(draft);
      if (!result.ok || !result.data) {
        throw new Error(result.ok ? "Profile save failed." : result.error);
      }
      onSaved(result.data.profile, nextAvatar);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile save failed.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (draft.fullName || "LB")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <DialogShell
      title={language === "de" ? "Profil bearbeiten" : "Edit profile"}
      subtitle={language === "de" ? "Dieselben Daten wie beim Onboarding – Änderungen gelten anschließend überall in Leadbase." : "The same profile data as onboarding, reused throughout Leadbase."}
      onClose={onClose}
      wide
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4 rounded-[12px] bg-[#F7F8FA] p-3.5 dark:bg-white/[.055]">
          <label className="group relative flex size-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[12px] bg-[#0B0C0E] text-[13px] font-semibold text-white">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="size-full object-cover" />
            ) : (
              initials || <UserRound className="size-5" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
              <Upload className="size-4" />
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={chooseAvatar}
            />
          </label>
          <div className="min-w-0">
            <strong className="block text-[13px] font-medium dark:text-white">
              {language === "de" ? "Profilbild" : "Profile image"}
            </strong>
            <span className="mt-0.5 block text-[10.5px] text-[#6B7078] dark:text-[#A8ABB2]">
              {language === "de" ? "PNG, JPG oder WebP · max. 3 MB" : "PNG, JPG or WebP · max. 3 MB"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            {language === "de" ? "Vollständiger Name" : "Full name"} <span className="text-[#B42318]">*</span>
            <input className={fieldClass} value={draft.fullName} onChange={(event) => update("fullName", event.target.value)} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Standort" : "Location"} <span className="text-[#B42318]">*</span>
            <CityField value={draft.location} language={language} onChange={(value) => {
              setDraft((current) => ({
                ...current,
                location: value,
                ...(current.currencyMode === "auto" && inferCurrencyFromLocation(value)
                  ? { currency: inferCurrencyFromLocation(value)! }
                  : {}),
              }));
            }} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Absendername" : "Sender name"}
            <input className={fieldClass} value={draft.senderName} onChange={(event) => update("senderName", event.target.value)} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Rolle im Outreach" : "Outreach role"}
            <input className={fieldClass} value={draft.outreachRole} onChange={(event) => update("outreachRole", event.target.value)} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Telefon" : "Phone"}
            <PhoneField code={draft.phoneCountryCode} phone={draft.phone} language={language} onCode={(value) => update("phoneCountryCode", value)} onPhone={(value) => update("phone", value)} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Währung" : "Currency"}
            <CurrencyField
              currency={draft.currency}
              currencyMode={draft.currencyMode}
              location={draft.location}
              language={language}
              onCurrency={(value) => update("currency", value)}
              onMode={(value) => setDraft((current) => ({
                ...current,
                currencyMode: value,
                currency: value === "auto"
                  ? (inferCurrencyFromLocation(current.location) ?? inferCurrencyFromLocale(navigator.language) ?? normalizeLeadbaseCurrency(current.currency))
                  : normalizeLeadbaseCurrency(current.currency),
              }))}
            />
            <span className="mt-1.5 block text-[10px] font-normal leading-4 text-[#6B7078] dark:text-[#A8ABB2]">
              {language === "de" ? "Auto passt sich deinem Standort an. Manuell überschreibt die Erkennung." : "Auto follows your location. Manual overrides detection."}
            </span>
          </label>
          <label className={labelClass}>
            Website
            <input className={fieldClass} value={draft.website} onChange={(event) => update("website", event.target.value)} placeholder={language === "de" ? "deinefirma.de" : "yourcompany.com"} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Firma / Marke" : "Company / brand"}
            <input className={fieldClass} value={draft.company} onChange={(event) => update("company", event.target.value)} />
          </label>
          <label className={labelClass}>
            {language === "de" ? "Leistungsschwerpunkt" : "Service focus"}
            <input className={fieldClass} value={draft.focus} onChange={(event) => update("focus", event.target.value)} />
          </label>
          <label className={cn(labelClass, "sm:col-span-2")}>
            {language === "de" ? "Standard-Signatur" : "Default signature"}
            <textarea className={cn(fieldClass, "h-auto min-h-20 py-2.5")} value={draft.signature} onChange={(event) => update("signature", event.target.value)} rows={3} />
          </label>
          <label className={cn(labelClass, "sm:col-span-2")}>
            {language === "de" ? "Kurzbeschreibung" : "Short description"}
            <textarea className={cn(fieldClass, "h-auto min-h-20 py-2.5")} value={draft.description} onChange={(event) => update("description", event.target.value)} rows={3} />
          </label>
        </div>

        <div className="mt-4 rounded-[10px] border border-black/[.07] bg-[#FAFBFC] px-3 py-2.5 dark:border-white/10 dark:bg-white/[.035]">
          <span className={monoClass}>{language === "de" ? "Antwort-Adresse" : "Reply address"}</span>
          <strong className="mt-1 block text-[12px] font-medium dark:text-white">{gmailEmail || draft.replyEmail}</strong>
          <p className="mt-1 text-[10.5px] leading-4 text-[#6B7078] dark:text-[#A8ABB2]">
            {language === "de" ? "Wird automatisch aus Gmail oder deiner Konto-E-Mail abgeleitet und kann hier nicht manuell überschrieben werden." : "Derived automatically from Gmail or your account email and cannot be overridden here."}
          </p>
        </div>
        {error ? <p className="mt-3 text-[11.5px] text-[#B42318]">{error}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-black/[.07] px-5 py-3 sm:px-6 dark:border-white/10">
        <div className="mr-auto min-w-0" aria-live="polite">
          {error ? <p className="truncate text-[11.5px] text-[#B42318]" title={error}>{error}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-black/10 bg-white px-3.5 text-[12.5px] font-medium text-[#40454E] hover:bg-[#F7F8FA] dark:border-white/15 dark:bg-[#121316] dark:text-[#E8E8EA] dark:hover:bg-white/10">
          {language === "de" ? "Abbrechen" : "Cancel"}
        </button>
        <button type="button" onClick={() => void persist()} disabled={saving} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,.30)] disabled:opacity-55">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {saving ? (language === "de" ? "Speichert…" : "Saving…") : (language === "de" ? "Änderungen speichern" : "Save changes")}
        </button>
      </div>
    </DialogShell>
  );
}

export function ManagePlanDialog({
  initial,
  language,
  onClose,
  onSaved,
}: {
  initial: AccountPlanSelection;
  language: Language;
  onClose: () => void;
  onSaved: (value: AccountPlanSelection) => void;
}) {
  const initialPaidId: LeadbasePublicPlanId =
    initial.planId === "free" ? "pro" : initial.planId;
  const [planId, setPlanId] = useState<LeadbasePublicPlanId>(initialPaidId);
  const [billing, setBilling] = useState<LeadbaseBillingInterval>(initial.billing);
  const [tiers, setTiers] = useState<Record<LeadbasePublicPlanId, number>>({
    starter: initialPaidId === "starter" ? initial.tierIndex : 0,
    pro: initialPaidId === "pro" ? initial.tierIndex : 0,
    scale: initialPaidId === "scale" ? initial.tierIndex : 0,
  });
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [creditInfoOpen, setCreditInfoOpen] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = LEADBASE_PUBLIC_PLANS.find((plan) => plan.id === planId)!;
  const selectedTier = selectedPlan.tiers[Math.min(tiers[planId], selectedPlan.tiers.length - 1)];
  const price = priceForTier(selectedTier, billing);
  const selectedIsCurrent =
    initial.planId !== "free" &&
    planId === initial.planId &&
    tiers[planId] === initial.tierIndex &&
    billing === initial.billing;

  async function checkout() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "subscription",
          planId,
          tierIndex: tiers[planId],
          billing,
        }),
      });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be created.");

      onSaved({
        planId,
        tierIndex: tiers[planId],
        billing,
        checkoutStatus: "pending_checkout",
        credits: selectedTier.credits,
        priceEur: price,
      });
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be created.");
      setSaving(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Billing portal could not be opened.");
      window.location.assign(payload.url);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Billing portal could not be opened.");
      setPortalLoading(false);
    }
  }

  return (
    <DialogShell
      title={language === "de" ? "Plan verwalten" : "Manage plan"}
      subtitle={language === "de" ? "Wähle Plan, Credit-Stufe und Abrechnung. Bezahlt und freigeschaltet wird ausschließlich über Stripe." : "Choose your plan, credit tier and billing interval. Payment and activation happen securely through Stripe."}
      onClose={onClose}
      wide
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end gap-4 rounded-[12px] bg-[#F7F8FA] p-3.5 dark:bg-white/[.055]">
          <div>
            <span className={monoClass}>
              {selectedIsCurrent
                ? (language === "de" ? "Aktueller Plan" : "Current plan")
                : (language === "de" ? "Ausgewählt" : "Selected")}
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <strong className="text-[17px] font-semibold tracking-[-.02em] dark:text-white">{selectedPlan.name}</strong>
              <span className="rounded-[6px] bg-[#EAEEFB] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.06em] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA5FF]"><AnimatedNumber value={price} locale={language === "de" ? "de-DE" : "en-US"} /> € / {billing === "monthly" ? (language === "de" ? "Monat" : "month") : (language === "de" ? "Jahr" : "year")}</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <span className={monoClass}>Credits</span>
            <strong className="mt-1.5 block text-[17px] font-semibold tracking-[-.02em] dark:text-white">{selectedTier.credits.toLocaleString(language === "de" ? "de-DE" : "en-US")}</strong>
          </div>
        </div>

        <div className="mt-4 flex w-fit rounded-[10px] bg-[#F3F4F6] p-0.5 dark:bg-white/[.07]">
          <button type="button" onClick={() => setBilling("monthly")} className={cn("flex h-8 items-center gap-2 rounded-[8px] px-3 text-[11.5px] transition", billing === "monthly" ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,.12)] dark:bg-[#1C1E22] dark:text-white" : "text-[#6B7078] dark:text-[#A8ABB2]")}>
            {language === "de" ? "Monatlich" : "Monthly"}
          </button>
          <button type="button" onClick={() => setBilling("yearly")} className={cn("flex h-8 items-center gap-2 rounded-[8px] px-3 text-[11.5px] transition", billing === "yearly" ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,.12)] dark:bg-[#1C1E22] dark:text-white" : "text-[#6B7078] dark:text-[#A8ABB2]")}>
            {language === "de" ? "Jährlich" : "Yearly"}
            <span className="rounded-[5px] bg-[#EAF7EE] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[.04em] text-[#218A45] dark:bg-[#1E5B32]/30 dark:text-[#6FD28E]">
              {language === "de" ? `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% sparen` : `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% off`}
            </span>
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {LEADBASE_PUBLIC_PLANS.map((plan) => {
            const active = plan.id === planId;
            const tierIndex = Math.min(tiers[plan.id], plan.tiers.length - 1);
            const tier = plan.tiers[tierIndex];
            const tierPrice = priceForTier(tier, billing);
            return (
              <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={cn("rounded-[12px] border bg-white p-3.5 text-left transition dark:bg-[#121316]", active ? "border-[#002BBA] shadow-[0_0_0_3px_rgba(0,43,186,.10)]" : "border-black/10 hover:border-[#002BBA]/45 dark:border-white/12")}>
                <div className="flex items-center gap-2">
                  <strong className="text-[13.5px] font-semibold dark:text-white">{plan.name}</strong>
                  {plan.id === initial.planId ? (
                    <span className="rounded-[5px] bg-[#EAF7EE] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[.06em] text-[#218A45] dark:bg-[#1E5B32]/30 dark:text-[#6FD28E]">
                      {language === "de" ? "Aktueller Plan" : "Current plan"}
                    </span>
                  ) : null}
                  {plan.recommended ? <span className="rounded-[5px] bg-[#EAEEFB] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[.08em] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA5FF]">{language === "de" ? "Empfohlen" : "Recommended"}</span> : null}
                  <span className={cn("ml-auto size-3.5 rounded-full", active ? "bg-[#002BBA] shadow-[inset_0_0_0_3.5px_white]" : "border border-[#DFE1E5] dark:border-white/20")} />
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <strong className="text-[18px] font-semibold tracking-[-.025em] tabular-nums dark:text-white"><AnimatedNumber value={tierPrice} locale={language === "de" ? "de-DE" : "en-US"} /> €</strong>
                  <span className="text-[10.5px] text-[#6B7078] dark:text-[#A8ABB2]">/{billing === "monthly" ? (language === "de" ? "Monat" : "mo") : (language === "de" ? "Jahr" : "yr")}</span>
                </div>
                <div className="mt-1 min-h-[16px] text-[9.5px] text-[#6B7078] dark:text-[#A8ABB2]">
                  {billing === "yearly" ? (language === "de" ? `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% günstiger · jährlich abgerechnet` : `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% off · billed yearly`) : (language === "de" ? "Monatlich kündbar" : "Cancel monthly")}
                </div>
                <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                  <input type="range" min={0} max={plan.tiers.length - 1} step={1} value={tierIndex} onChange={(event) => { setPlanId(plan.id); setTiers((current) => ({ ...current, [plan.id]: Number(event.target.value) })); }} className="w-full accent-[#002BBA]" aria-label={`${plan.name} credits`} />
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-[#6B7078] dark:text-[#A8ABB2]">
                    <span>{tier.credits.toLocaleString(language === "de" ? "de-DE" : "en-US")} Credits</span>
                    <span>{plan.includedLeads.toLocaleString(language === "de" ? "de-DE" : "en-US")} Leads</span>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] leading-[1.45] text-[#6B7078] dark:text-[#A8ABB2]">{language === "de" ? plan.extra : plan.extraEn}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[10px] border border-black/[.07] px-3 py-2.5 text-[10.5px] leading-[1.5] text-[#6B7078] dark:border-white/10 dark:text-[#A8ABB2]">
          <p>
            {language === "de"
              ? "Credits werden nur für KI-Aktionen verbraucht. Teurere Modelle wie GPT-6 Astra verbrauchen mehr Credits und sind nur in passenden Plänen freigeschaltet."
              : "Credits are only used for AI-powered actions. Premium models such as GPT-6 Astra use more Credits and are only available on eligible plans."}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-mono text-[9.5px] text-[#40454E] dark:text-[#C7CAD0]">
              {language === "de"
                ? "Richtwert: Analyse + Outreach + Call Prep + Standard-Design ≈ 20–60 Credits."
                : "Typical: analysis + outreach + call prep + standard design ≈ 20–60 Credits."}
            </p>
            <button
              type="button"
              onClick={() => setCreditInfoOpen(true)}
              className="text-[10.5px] font-medium text-[#002BBA] underline-offset-2 transition hover:underline dark:text-[#8EA5FF]"
            >
              {language === "de" ? "So funktionieren Credits" : "How credits work"}
            </button>
          </div>
        </div>
        {creditInfoOpen ? (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-[rgba(9,10,12,.42)] p-4 backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setCreditInfoOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={language === "de" ? "So funktionieren Credits" : "How Credits work"}
              className="w-full max-w-[520px] rounded-[16px] border border-black/[.08] bg-white shadow-[0_24px_80px_rgba(9,10,12,.24)] dark:border-white/10 dark:bg-[#121316]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-black/[.07] px-5 py-4 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-semibold tracking-[-.02em] text-[#0B0C0E] dark:text-white">
                      {language === "de" ? "So funktionieren Credits" : "How Credits work"}
                    </h3>
                    <span className="rounded-full bg-[#EAEEFB] px-2 py-1 font-mono text-[8px] uppercase tracking-[.06em] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA5FF]">
                      {language === "de" ? "Richtwerte" : "Estimates"}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-[430px] text-[11px] leading-[1.55] text-[#6B7078] dark:text-[#A8ABB2]">
                    {language === "de"
                      ? "Diese Werte sind typische Richtwerte. Die tatsächliche Abrechnung hängt vom verwendeten KI-Modell, der Eingabelänge und der Ausgabe ab."
                      : "These are typical estimates. Actual Credit usage depends on the AI model, input size, and output length."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreditInfoOpen(false)}
                  className="grid size-8 shrink-0 place-items-center rounded-[8px] text-[#6B7078] transition hover:bg-black/[.05] hover:text-[#0B0C0E] dark:text-[#A8ABB2] dark:hover:bg-white/[.07] dark:hover:text-white"
                  aria-label={language === "de" ? "Schließen" : "Close"}
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  {[
                    [language === "de" ? "Website analysieren" : "Analyze website", "~1–3"],
                    [language === "de" ? "Outreach erstellen" : "Generate outreach", "~1–3"],
                    [language === "de" ? "Call Prep" : "Call prep", "~1–4"],
                    [language === "de" ? "Standard-Design" : "Standard design", "~15–50"],
                  ].map(([name, credits]) => (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F7F8FA] px-3 py-2.5 dark:bg-white/[.045]">
                      <span className="min-w-0 text-[#555B65] dark:text-[#B8BBC2]">{name}</span>
                      <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums text-[#0B0C0E] dark:text-white">{credits}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-4 rounded-[12px] border border-[#002BBA]/12 bg-[#EAEEFB]/55 px-3.5 py-3 dark:bg-[#002BBA]/10">
                  <div>
                    <p className="text-[11px] font-medium text-[#0B0C0E] dark:text-white">
                      {language === "de" ? "Typischer kompletter Lead-Workflow" : "Typical full lead workflow"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#6B7078] dark:text-[#A8ABB2]">
                      {language === "de"
                        ? "Analyse + Outreach + Call Prep + Standard-Design"
                        : "Analysis + outreach + call prep + standard design"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <strong className="font-mono text-[15px] text-[#002BBA] dark:text-[#8EA5FF]">~20–60</strong>
                    <span className="ml-1 font-mono text-[8.5px] uppercase tracking-[.04em] text-[#6B7078] dark:text-[#A8ABB2]">Credits</span>
                  </div>
                </div>

                <p className="mt-3 text-[10px] leading-[1.55] text-[#7A7F88] dark:text-[#91959D]">
                  {language === "de"
                    ? "Premium-Designs mit GPT-6 Astra oder hohe Reasoning-Stufen können deutlich mehr Credits verbrauchen. Leadbase zeigt deshalb vor wichtigen KI-Aktionen einen ungefähren Credit-Bereich an."
                    : "Premium designs with GPT-6 Astra or higher reasoning levels can use significantly more Credits. Leadbase therefore shows an estimated Credit range before important AI actions."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-[11.5px] text-[#B42318]">{error}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-black/[.07] px-5 py-3 sm:px-6 dark:border-white/10">
        {initial.checkoutStatus === "active" ? (
          <button type="button" onClick={() => void openPortal()} disabled={portalLoading} className="mr-auto h-9 rounded-[9px] border border-black/10 px-3.5 text-[12.5px] font-medium text-[#40454E] disabled:opacity-55 dark:border-white/15 dark:text-[#E8E8EA]">
            {portalLoading ? (language === "de" ? "Öffnet…" : "Opening…") : (language === "de" ? "Abo & Zahlung verwalten" : "Manage billing")}
          </button>
        ) : <span className="mr-auto" />}
        <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-black/10 px-3.5 text-[12.5px] font-medium text-[#40454E] dark:border-white/15 dark:text-[#E8E8EA]">{language === "de" ? "Abbrechen" : "Cancel"}</button>
        <button type="button" onClick={() => void checkout()} disabled={saving} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white disabled:opacity-55">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}{language === "de" ? "Weiter zu Stripe" : "Continue to Stripe"}</button>
      </div>
    </DialogShell>
  );
}

export function BuyCreditsDialog({
  language,
  onClose,
  onSaved,
}: {
  language: Language;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string>(LEADBASE_CREDIT_TOPUPS[1].id);
  const [customCredits, setCustomCredits] = useState(5_000);
  const [customInput, setCustomInput] = useState("5000");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preset = LEADBASE_CREDIT_TOPUPS.find((topup) => topup.id === selected) ?? null;
  const customActive = selected === "custom";
  const selectedCredits = customActive ? customCredits : (preset?.credits ?? LEADBASE_CREDIT_TOPUPS[1].credits);
  const selectedPrice = customActive ? (customCreditPriceEur(customCredits) ?? 0) : (preset?.priceEur ?? LEADBASE_CREDIT_TOPUPS[1].priceEur);

  function setSafeCustomCredits(value: number) {
    const stepped = Math.round(value / LEADBASE_CUSTOM_CREDITS_STEP) * LEADBASE_CUSTOM_CREDITS_STEP;
    const next = Math.max(LEADBASE_CUSTOM_CREDITS_MIN, Math.min(LEADBASE_CUSTOM_CREDITS_MAX, stepped));
    setCustomCredits(next);
    setCustomInput(String(next));
    setSelected("custom");
  }

  function updateCustomInput(raw: string) {
    setCustomInput(raw);
    setSelected("custom");
    const value = Number(raw);
    if (Number.isFinite(value) && value >= LEADBASE_CUSTOM_CREDITS_MIN && value <= LEADBASE_CUSTOM_CREDITS_MAX && value % LEADBASE_CUSTOM_CREDITS_STEP === 0) {
      setCustomCredits(value);
    }
  }

  async function checkout() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "credits", presetId: customActive ? "custom" : preset?.id, credits: selectedCredits }),
      });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be created.");
      onSaved(language === "de" ? "Stripe Checkout wird geöffnet." : "Opening Stripe Checkout.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be created.");
      setSaving(false);
    }
  }

  return (
    <DialogShell
      title={language === "de" ? "Credits hinzufügen" : "Add credits"}
      subtitle={language === "de" ? "Einmalige Credit-Pakete. Gekaufte Credits verfallen nicht und werden erst nach deinen monatlichen Plan-Credits verwendet." : "One-time credit packs. Purchased credits do not expire and are used after your monthly plan credits."}
      onClose={onClose}
      wide
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {LEADBASE_CREDIT_TOPUPS.map((pack) => {
            const active = pack.id === selected;
            return (
              <button key={pack.id} type="button" onClick={() => setSelected(pack.id)} className={cn("rounded-[12px] border bg-white p-3.5 text-left transition dark:bg-[#121316]", active ? "border-[#002BBA] shadow-[0_0_0_3px_rgba(0,43,186,.10)]" : "border-black/10 hover:border-[#002BBA]/45 dark:border-white/12")}>
                <span className={monoClass}>{pack.id === "small" ? (language === "de" ? "Klein" : "Small") : pack.id === "medium" ? (language === "de" ? "Mittel" : "Medium") : (language === "de" ? "Groß" : "Large")}</span>
                <strong className="mt-2 block text-[17px] font-semibold tracking-[-.02em] dark:text-white">{pack.credits.toLocaleString(language === "de" ? "de-DE" : "en-US")}</strong>
                <span className="text-[10.5px] text-[#6B7078] dark:text-[#A8ABB2]">Credits</span>
                <div className="mt-3 border-t border-black/[.07] pt-2.5 dark:border-white/10"><strong className="text-[13px] dark:text-white">{pack.priceEur} €</strong></div>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "mt-3 rounded-[12px] border p-3.5 transition",
            customActive
              ? "border-[#002BBA] bg-[#F8FAFF] shadow-[0_0_0_3px_rgba(0,43,186,.08)] dark:bg-[#002BBA]/[.06]"
              : "border-black/10 bg-white dark:border-white/12 dark:bg-[#121316]",
          )}
        >
          <button type="button" onClick={() => setSelected("custom")} className="flex w-full items-center gap-3 text-left">
            <div className="min-w-0 flex-1">
              <span className={monoClass}>{language === "de" ? "Individuell" : "Custom"}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <strong className="text-[17px] font-semibold tracking-[-.02em] tabular-nums dark:text-white">
                  {customCredits.toLocaleString(language === "de" ? "de-DE" : "en-US")} Credits
                </strong>
                <span className="text-[10.5px] text-[#6B7078] dark:text-[#A8ABB2]">{language === "de" ? "frei wählbar" : "choose your amount"}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={monoClass}>{language === "de" ? "Preis" : "Price"}</span>
              <strong className="mt-1 block text-[16px] font-semibold tabular-nums dark:text-white"><AnimatedNumber value={customCreditPriceEur(customCredits) ?? 0} locale={language === "de" ? "de-DE" : "en-US"} /> €</strong>
            </div>
            <span className={cn("size-3.5 shrink-0 rounded-full", customActive ? "bg-[#002BBA] shadow-[inset_0_0_0_3.5px_white]" : "border border-[#DFE1E5] dark:border-white/20")} />
          </button>

          <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", customActive ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="min-h-0 overflow-hidden">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={LEADBASE_CUSTOM_CREDITS_MIN}
                  max={LEADBASE_CUSTOM_CREDITS_MAX}
                  step={LEADBASE_CUSTOM_CREDITS_STEP}
                  value={customCredits}
                  onChange={(event) => setSafeCustomCredits(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-[#002BBA]"
                  aria-label={language === "de" ? "Individuelle Credits" : "Custom credits"}
                />
                <div className="relative w-[116px] shrink-0">
                  <input
                    type="number"
                    min={LEADBASE_CUSTOM_CREDITS_MIN}
                    max={LEADBASE_CUSTOM_CREDITS_MAX}
                    step={LEADBASE_CUSTOM_CREDITS_STEP}
                    value={customInput}
                    onChange={(event) => updateCustomInput(event.target.value)}
                    onBlur={() => setSafeCustomCredits(Number(customInput))}
                    onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                    className="h-9 w-full rounded-[9px] border border-[#DFE1E5] bg-white px-2.5 pr-7 text-right font-mono text-[11.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/15 dark:bg-[#0F1012] dark:text-white"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-2.5 font-mono text-[9px] text-[#8A9099]">C</span>
                </div>
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[8.5px] text-[#8A9099]">
                <span>{LEADBASE_CUSTOM_CREDITS_MIN.toLocaleString(language === "de" ? "de-DE" : "en-US")}</span>
                <span>{LEADBASE_CUSTOM_CREDITS_MAX.toLocaleString(language === "de" ? "de-DE" : "en-US")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-black/[.07] px-3 py-2.5 dark:border-white/10">
          <Zap className="mt-0.5 size-3.5 shrink-0 text-[#002BBA]" />
          <p className="text-[10.5px] leading-[1.5] text-[#6B7078] dark:text-[#A8ABB2]">{language === "de" ? "Credits werden ausschließlich nach einem bestätigten Stripe-Webhook gutgeschrieben. Der Browser kann weder Preis noch Credit-Menge manipulieren." : "Credits are granted only after a verified Stripe webhook. The browser cannot manipulate the price or credit amount."}</p>
        </div>
        {error ? <p className="mt-3 text-[11.5px] text-[#B42318]">{error}</p> : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[.07] px-5 py-3 sm:px-6 dark:border-white/10">
        <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-black/10 px-3.5 text-[12.5px] font-medium text-[#40454E] dark:border-white/15 dark:text-[#E8E8EA]">{language === "de" ? "Abbrechen" : "Cancel"}</button>
        <button type="button" onClick={() => void checkout()} disabled={saving} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white disabled:opacity-55">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}{language === "de" ? <>{selectedCredits.toLocaleString("de-DE")} Credits · <AnimatedNumber value={selectedPrice} locale="de-DE" /> €</> : <>{selectedCredits.toLocaleString("en-US")} credits · €<AnimatedNumber value={selectedPrice} locale="en-US" /></>}</button>
      </div>
    </DialogShell>
  );
}
