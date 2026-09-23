"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";

import {
  saveOnboardingPlan,
  saveOnboardingProfile,
  type OnboardingProfileInput,
} from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { saveAvatar, saveProposalBranding } from "@/app/(app)/profile/actions";
import { CityField, CurrencyField, PhoneField } from "@/components/profile-account-center-dialogs";
import { useLanguage } from "@/components/language-provider";
import { AnimatedNumber } from "@/components/animated-number";
import { dialCodeFromLocale } from "@/lib/country-dial-codes";
import { type LeadbaseBillingCurrency } from "@/lib/account-currency";
import {
  LEADBASE_PUBLIC_PLANS,
  LEADBASE_YEARLY_DISCOUNT_PERCENT,
  priceForTier,
  type LeadbaseBillingInterval,
  type LeadbasePublicPlanId,
} from "@/lib/public-plans";
import { cn } from "@/lib/utils";
import styles from "./public-onboarding-gate.module.css";

type Step =
  | "entry"
  | "login"
  | "signup"
  | "forgot"
  | "plan"
  | "profile"
  | "done";

type PublicOnboardingGateProps = {
  initialStep?: "entry" | "plan" | "profile";
  accountEmail?: string | null;
  initialName?: string | null;
  gmailEmail?: string | null;
};

function optionalFields(language: "de" | "en") {
  return language === "de"
    ? ([
        ["website", "Website", "deinefirma.de"],
        ["outreachRole", "Rolle im Outreach", "Webdesigner & Webentwickler"],
        ["company", "Firma / Marke", "Deine Firma"],
        ["focus", "Leistungsschwerpunkt", "Websites für lokale Unternehmen"],
        ["signature", "Standard-Signatur", "Viele Grüße, dein Name"],
      ] as const)
    : ([
        ["website", "Website", "yourcompany.com"],
        ["outreachRole", "Outreach role", "Web designer & developer"],
        ["company", "Company / brand", "Your company"],
        ["focus", "Service focus", "Websites for local businesses"],
        ["signature", "Default signature", "Best regards, your name"],
      ] as const);
}

function formatNumber(value: number, language: "de" | "en") {
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US").format(value);
}

function staticRows() {
  return Array.from({ length: 9 }, (_, index) => ({
    a: 92 + ((index * 37) % 110),
    b: 60 + ((index * 29) % 95),
  }));
}

function clampTier(value: number) {
  return Math.max(0, Math.min(3, Math.round(value)));
}

const ONBOARDING_PROFILE_DRAFT_KEY = "leadbase:onboarding-profile-draft:v1";

export function PublicOnboardingGate({
  initialStep = "entry",
  accountEmail = null,
  initialName = null,
  gmailEmail = null,
}: PublicOnboardingGateProps) {
  const { language } = useLanguage();
  const de = language === "de";
  const text = (german: string, english: string) => de ? german : english;
  const [step, setStep] = useState<Step>(initialStep);
  const [billing, setBilling] = useState<LeadbaseBillingInterval>("monthly");
  const billingCurrency: LeadbaseBillingCurrency = "USD";
  const [planId, setPlanId] = useState<LeadbasePublicPlanId | "free">("pro");
  const [tiers, setTiers] = useState<Record<LeadbasePublicPlanId, number>>({
    starter: 0,
    pro: 0,
    scale: 0,
  });
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [profileTouched, setProfileTouched] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [name, setName] = useState(initialName ?? "");
  const [location, setLocation] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [optional, setOptional] = useState<Record<string, string>>({});
  const [brandColor, setBrandColor] = useState("#002BBA");
  const [brandIdentityMode, setBrandIdentityMode] = useState<"logo" | "avatar" | "none">("avatar");
  const [brandCtaMode, setBrandCtaMode] = useState<"email" | "booking" | "both">("email");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingProviderLabel, setBookingProviderLabel] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null);
  const [showOptionalMobile, setShowOptionalMobile] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const locationRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!phoneCountryCode) {
      const guessed = dialCodeFromLocale(navigator.language);
      if (guessed) setPhoneCountryCode(guessed);
    }
  }, [phoneCountryCode]);

  useEffect(() => {
    if (step !== "profile") return;
    try {
      const raw = window.sessionStorage.getItem(ONBOARDING_PROFILE_DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        name?: string;
        location?: string;
        phoneCountryCode?: string;
        phone?: string;
        currency?: string;
        optional?: Record<string, string>;
        brandColor?: string;
        brandIdentityMode?: "logo" | "avatar" | "none";
        brandCtaMode?: "email" | "booking" | "both";
        bookingUrl?: string;
        bookingProviderLabel?: string;
        brandLogoUrl?: string;
        showOptionalMobile?: boolean;
      };
      if (typeof saved.name === "string") setName(saved.name);
      if (typeof saved.location === "string") setLocation(saved.location);
      if (typeof saved.phoneCountryCode === "string") setPhoneCountryCode(saved.phoneCountryCode);
      if (typeof saved.phone === "string") setPhone(saved.phone);
      if (typeof saved.currency === "string") setCurrency(saved.currency);
      if (saved.optional && typeof saved.optional === "object") setOptional(saved.optional);
      if (typeof saved.brandColor === "string") setBrandColor(saved.brandColor);
      if (saved.brandIdentityMode === "logo" || saved.brandIdentityMode === "avatar" || saved.brandIdentityMode === "none") setBrandIdentityMode(saved.brandIdentityMode);
      if (saved.brandCtaMode === "email" || saved.brandCtaMode === "booking" || saved.brandCtaMode === "both") setBrandCtaMode(saved.brandCtaMode);
      if (typeof saved.bookingUrl === "string") setBookingUrl(saved.bookingUrl);
      if (typeof saved.bookingProviderLabel === "string") setBookingProviderLabel(saved.bookingProviderLabel);
      if (typeof saved.brandLogoUrl === "string" && saved.brandLogoUrl) setBrandLogoPreview(saved.brandLogoUrl);
      if (typeof saved.showOptionalMobile === "boolean") setShowOptionalMobile(saved.showOptionalMobile);
      window.sessionStorage.removeItem(ONBOARDING_PROFILE_DRAFT_KEY);
    } catch {
      window.sessionStorage.removeItem(ONBOARDING_PROFILE_DRAFT_KEY);
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (brandLogoPreview?.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview);
    };
  }, [avatarPreview, brandLogoPreview]);

  function chooseOnboardingAvatar(file: File | null) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setProfileError(text("Das Profilbild darf maximal 3 MB groß sein.", "The profile image may be up to 3 MB."));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setProfileError(text("Bitte PNG, JPG oder WebP verwenden.", "Please use PNG, JPG or WebP."));
      return;
    }
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError(null);
  }

  function chooseOnboardingBrandLogo(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError(text("Das Logo darf maximal 2 MB groß sein.", "The logo may be up to 2 MB."));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setProfileError(text("Bitte PNG, JPG oder WebP für das Logo verwenden.", "Please use PNG, JPG or WebP for the logo."));
      return;
    }
    if (brandLogoPreview?.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview);
    setBrandLogoFile(file);
    setBrandLogoPreview(URL.createObjectURL(file));
    setBrandIdentityMode("logo");
    setProfileError(null);
  }

  async function connectGmailFromOnboarding() {
    setProfileError(null);
    setBusy(true);
    try {
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.set("avatar", avatarFile);
        const avatarResult = await saveAvatar(avatarData);
        if (!avatarResult.ok) throw new Error(avatarResult.error);
        setAvatarFile(null);
      }

      const brandKitData = new FormData();
      brandKitData.set("accentColor", brandColor);
      brandKitData.set("templateId", "minimal");
      brandKitData.set("identityMode", brandIdentityMode);
      brandKitData.set("ctaMode", brandCtaMode);
      brandKitData.set("bookingUrl", bookingUrl);
      brandKitData.set("bookingProviderLabel", bookingProviderLabel);
      if (brandLogoFile) brandKitData.set("logo", brandLogoFile);
      const brandKitResult = await saveProposalBranding(brandKitData);
      if (!brandKitResult.ok || !brandKitResult.data) throw new Error(brandKitResult.ok ? "Brand Kit could not be saved." : brandKitResult.error);
      setBrandLogoFile(null);

      window.sessionStorage.setItem(ONBOARDING_PROFILE_DRAFT_KEY, JSON.stringify({
        name,
        location,
        phoneCountryCode,
        phone,
        currency,
        optional,
        brandColor,
        brandIdentityMode,
        brandCtaMode,
        bookingUrl,
        bookingProviderLabel,
        brandLogoUrl: brandKitResult.data.logoUrl || "",
        showOptionalMobile,
      }));

      window.location.assign("/api/google/gmail/connect?returnTo=%2F");
    } catch (error) {
      setBusy(false);
      setProfileError(error instanceof Error ? error.message : text("Gmail konnte nicht verbunden werden.", "Gmail connection could not be started."));
    }
  }

  const rows = useMemo(staticRows, []);
  const currentPlan =
    planId === "free"
      ? null
      : LEADBASE_PUBLIC_PLANS.find((plan) => plan.id === planId) ?? LEADBASE_PUBLIC_PLANS[1];
  const currentTier = currentPlan ? currentPlan.tiers[tiers[currentPlan.id]] : null;
  const replyEmail = gmailEmail || accountEmail || text("dein Konto", "your account");

  const showSteps = ["plan", "profile", "done"].includes(step);
  const stepIndex = step === "plan" ? 2 : step === "profile" ? 3 : step === "done" ? 4 : 1;

  async function continueWithGoogle() {
    setAuthError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      setBusy(false);
      setAuthError(error instanceof Error ? error.message : text("Google-Anmeldung konnte nicht gestartet werden.", "Google sign-in could not be started."));
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const password2 = String(form.get("password2") ?? "");

    if (!email) {
      setBusy(false);
      setAuthError(text("Bitte gib deine E-Mail-Adresse ein.", "Please enter your email address."));
      return;
    }

    const supabase = createClient();
    try {
      if (step === "forgot") {
        const next = encodeURIComponent("/auth/reset");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        });
        if (error) throw error;
        setAuthError(text("Link gesendet, falls ein Konto existiert.", "Reset link sent if an account exists."));
        return;
      }

      if (step === "signup") {
        if (password.length < 8) {
          setAuthError(text("Das Passwort muss mindestens 8 Zeichen lang sein.", "Password must be at least 8 characters."));
          return;
        }
        if (password !== password2) {
          setAuthError(text("Die Passwörter stimmen nicht überein.", "Passwords do not match."));
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setAuthError(text("Prüfe dein E-Mail-Postfach und bestätige deinen Account. Danach kannst du direkt weitermachen.", "Check your inbox and verify your account. Then you can continue."));
          return;
        }
        window.location.assign("/");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign("/");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : text("Anmeldung konnte nicht abgeschlossen werden.", "Sign-in could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function persistPlan(nextPlanId: LeadbasePublicPlanId | "free") {
    setBusy(true);
    setAuthError(null);
    try {
      const tierIndex = nextPlanId === "free" ? 0 : tiers[nextPlanId];
      const result = await saveOnboardingPlan({ planId: nextPlanId, tierIndex, billing, billingCurrency });
      if (!result.ok) throw new Error(result.error);
      setPlanId(nextPlanId);
      setStep("profile");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : text("Plan konnte nicht gespeichert werden.", "Plan could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function finishProfile() {
    setProfileTouched(true);
    setProfileError(null);
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!location.trim()) {
      locationRef.current?.focus();
      return;
    }

    setBusy(true);
    const input: OnboardingProfileInput = {
      fullName: name,
      location,
      phoneCountryCode,
      phone,
      currency,
      currencyMode: "manual",
      website: optional.website,
      outreachRole: optional.outreachRole,
      company: optional.company,
      focus: optional.focus,
      signature: optional.signature,
      description: optional.description,
    };

    try {
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.set("avatar", avatarFile);
        const avatarResult = await saveAvatar(avatarData);
        if (!avatarResult.ok) throw new Error(avatarResult.error);
      }
      const result = await saveOnboardingProfile(input);
      if (!result.ok) {
        if (result.field === "fullName") nameRef.current?.focus();
        if (result.field === "location") locationRef.current?.focus();
        throw new Error(result.error);
      }

      const brandKitData = new FormData();
      brandKitData.set("accentColor", brandColor);
      brandKitData.set("templateId", "minimal");
      brandKitData.set("identityMode", brandIdentityMode);
      brandKitData.set("ctaMode", brandCtaMode);
      brandKitData.set("bookingUrl", bookingUrl);
      brandKitData.set("bookingProviderLabel", bookingProviderLabel);
      if (brandLogoFile) brandKitData.set("logo", brandLogoFile);
      const brandKitResult = await saveProposalBranding(brandKitData);
      if (!brandKitResult.ok) throw new Error(brandKitResult.error);

      if (planId !== "free") {
        const checkoutResponse = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: "subscription",
            planId,
            tierIndex: tiers[planId],
            billing,
            billingCurrency,
          }),
        });
        const checkoutPayload = await checkoutResponse.json() as { url?: string; error?: string };
        if (!checkoutResponse.ok || !checkoutPayload.url) {
          throw new Error(checkoutPayload.error || text("Stripe Checkout konnte nicht gestartet werden.", "Stripe Checkout could not be started."));
        }
        window.location.assign(checkoutPayload.url);
        return;
      }
      window.sessionStorage.removeItem(ONBOARDING_PROFILE_DRAFT_KEY);
      setStep("done");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : text("Profil konnte nicht gespeichert werden.", "Profile could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  function tierFromPointer(event: React.PointerEvent<HTMLDivElement>, plan: LeadbasePublicPlanId) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width <= 16 ? 0 : (event.clientX - rect.left - 8) / (rect.width - 16);
    const index = clampTier(ratio * 3);
    setPlanId(plan);
    setTiers((current) => ({ ...current, [plan]: index }));
  }

  const panelClass = cn(
    styles.panel,
    step === "plan" && styles.panelPlan,
    step === "profile" && styles.panelProfile,
  );

  return (
    <main className={styles.root}>
      <div className={styles.shell} aria-hidden="true">
        <aside className={styles.shellSidebar}>
          <div className={styles.shellBrand}>
            <span className={styles.brandMark}><Zap /></span>
            <span><strong>Leadbase</strong><small>{text("Lead-Workspace", "Lead workspace")}</small></span>
          </div>
          <div className={styles.shellNav}>
            {(de ? ["Dashboard", "Leads finden", "Leads", "Kampagnen", "Projekte", "Angebote", "Posteingang", "Analytics"] : ["Dashboard", "Find Leads", "Leads", "Campaigns", "Projects", "Proposals", "Inbox", "Analytics"]).map((item) => (
              <div key={item}><i />{item}</div>
            ))}
          </div>
          <div className={styles.shellCredits}>
            <div><Zap /> <span>Credits</span><i /></div>
            <b />
          </div>
        </aside>
        <section className={styles.shellMain}>
          <header><strong>Dashboard</strong><i /><em /><span /></header>
          <div className={styles.shellBody}>
            <div className={styles.shellTiles}>
              {["48%", "64%", "52%", "70%"].map((width) => (
                <article key={width}><i /><b style={{ width }} /><em /></article>
              ))}
            </div>
            <article className={styles.shellList}>
              <div className={styles.shellListHeader}><i /><span /></div>
              {rows.map((row, index) => (
                <div key={index}><i /><b style={{ width: row.a }} /><em style={{ width: row.b }} /><span /></div>
              ))}
            </article>
          </div>
        </section>
      </div>

      <div className={styles.shield} />
      <div className={styles.safeLabel}><LockKeyhole /> {text("Sicherer App-Shell · keine geschützten Daten geladen", "Secure app shell · no protected data loaded")}</div>

      <div className={styles.overlay}>
        <section className={panelClass} role="dialog" aria-modal="true" aria-labelledby="leadbase-auth-title">
          {showSteps ? (
            <div className={styles.steps}>
              {(de ? ["Account", "Plan", "Profil", "Fertig"] : ["Account", "Plan", "Profile", "Done"]).map((label, index) => (
                <div key={label} className={cn(index + 1 === stepIndex && styles.stepActive, index + 1 < stepIndex && styles.stepDone)}>
                  <span>{label}</span>{index < 3 ? <i /> : null}
                </div>
              ))}
              <small>{stepIndex} / 4</small>
            </div>
          ) : null}

          {step === "entry" ? (
            <div className={styles.swap}>
              <span className={styles.logoSquare}><Zap /></span>
              <div className={styles.eyebrow}>Leadbase</div>
              <h1 id="leadbase-auth-title">{text("Willkommen bei Leadbase", "Welcome to Leadbase")}</h1>
              <p>{text("Melde dich an oder erstelle deinen Account – beides führt in denselben Workspace.", "Sign in or create your account — both lead to the same workspace.")}</p>
              <div className={styles.authButtons}>
                <button type="button" className={styles.googleButton} onClick={continueWithGoogle} disabled={busy}>
                  <span className={styles.googleGlyph}>G</span> {text("Mit Google fortfahren", "Continue with Google")}
                </button>
                <div className={styles.or}><i />{text("oder", "or")}<i /></div>
                <button type="button" className={styles.primaryButton} onClick={() => setStep("signup")}>
                  <Mail /> {text("Mit E-Mail fortfahren", "Continue with email")}
                </button>
              </div>
              
              <div className={styles.authSwitch}>{text("Du hast schon einen Account?", "Already have an account?")} <button type="button" onClick={() => setStep("login")}>{text("Anmelden", "Sign in")}</button></div>
              <p className={styles.legal}>{text("Mit dem Fortfahren stimmst du den Nutzungsbedingungen und der Datenschutzerklärung zu.", "By continuing, you agree to the Terms of Service and Privacy Policy.")}</p>
            </div>
          ) : null}

          {["login", "signup", "forgot"].includes(step) ? (
            <div className={styles.swap}>
              <button type="button" className={styles.backButton} onClick={() => { setStep("entry"); setAuthError(null); }}><ArrowLeft /> {text("Zurück", "Back")}</button>
              <h1>
                {step === "login" ? text("Anmelden", "Sign in") : step === "signup" ? text("Account erstellen", "Create account") : text("Passwort zurücksetzen", "Reset password")}
              </h1>
              <p>
                {step === "login"
                  ? text("Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.", "Sign in with your email address and password.")
                  : step === "signup"
                    ? text("Erstelle deinen Account. Danach wählst du Plan und Profil.", "Create your account. Then choose your plan and set up your profile.")
                    : text("Wir schicken dir einen sicheren Link zum Zurücksetzen.", "We'll send you a secure reset link.")}
              </p>
              <form onSubmit={submitAuth} className={styles.authForm}>
                <label>{text("E-Mail", "Email")}<input name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
                {step !== "forgot" ? (
                  <label>
                    <span>{text("Passwort", "Password")} {step === "signup" ? <small>{text("Mind. 8 Zeichen", "Min. 8 characters")}</small> : <button type="button" onClick={() => setStep("forgot")}>{text("Passwort vergessen?", "Forgot password?")}</button>}</span>
                    <div className={styles.passwordField}>
                      <input name="password" type={showPassword ? "text" : "password"} autoComplete={step === "login" ? "current-password" : "new-password"} placeholder="••••••••••" />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? text("Passwort verbergen", "Hide password") : text("Passwort anzeigen", "Show password")}>{showPassword ? <EyeOff /> : <Eye />}</button>
                    </div>
                  </label>
                ) : null}
                {step === "signup" ? <label>{text("Passwort bestätigen", "Confirm password")}<input name="password2" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••••" /></label> : null}
                {authError ? <div className={styles.inlineAlert}><AlertCircle />{authError}</div> : null}
                <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? text("Bitte warten…", "Please wait…") : step === "login" ? text("Anmelden", "Sign in") : step === "signup" ? text("Account erstellen", "Create account") : text("Reset-Link senden", "Send reset link")}</button>
              </form>
              {step !== "forgot" ? (
                <div className={styles.authSwitch}>
                  {step === "login" ? text("Noch keinen Account?", "No account yet?") : text("Du hast schon einen Account?", "Already have an account?")}
                  <button type="button" onClick={() => setStep(step === "login" ? "signup" : "login")}>{step === "login" ? text("Registrieren", "Create account") : text("Anmelden", "Sign in")}</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "plan" ? (
            <div className={styles.swap}>
              <div className={styles.planHeader}>
                <div><h1>{text("Wähle deinen Plan", "Choose your plan")}</h1><p>{text("Du kannst jederzeit wechseln. Credits lassen sich in jedem Plan nachkaufen.", "You can switch at any time. Extra credits can be added on every plan.")}</p></div>
                <div className={styles.billingTabs}>
                  <button type="button" className={billing === "monthly" ? styles.tabActive : ""} onClick={() => setBilling("monthly")}>{text("Monatlich", "Monthly")}</button>
                  <button type="button" className={billing === "yearly" ? styles.tabActive : ""} onClick={() => setBilling("yearly")}>
                    <span>{text("Jährlich", "Yearly")}</span>
                    <b>{text(`${LEADBASE_YEARLY_DISCOUNT_PERCENT}% sparen`, `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% off`)}</b>
                  </button>
                </div>
              </div>
              <div className={styles.planGrid}>
                {LEADBASE_PUBLIC_PLANS.map((plan) => {
                  const on = planId === plan.id;
                  const tierIndex = tiers[plan.id];
                  const tier = plan.tiers[tierIndex];
                  const price = priceForTier(tier, billing, billingCurrency);
                  return (
                    <article key={plan.id} className={cn(styles.planCard, on && styles.planCardSelected)} onClick={() => setPlanId(plan.id)}>
                      <div className={styles.planNameRow}><strong>{plan.name}</strong>{plan.recommended ? <span>{text("Empfohlen", "Recommended")}</span> : null}<i className={on ? styles.radioOn : ""}>{on ? <b /> : null}</i></div>
                      <div className={styles.priceRow}><strong>$<AnimatedNumber value={price} locale="en-US" /></strong><span>{billing === "monthly" ? text("/ Monat", "/ month") : text("/ Jahr", "/ year")}</span></div>
                      <small>{billing === "monthly" ? text("monatlich kündbar", "cancel monthly") : text(`${LEADBASE_YEARLY_DISCOUNT_PERCENT}% günstiger · jährlich abgerechnet`, `${LEADBASE_YEARLY_DISCOUNT_PERCENT}% off · billed yearly`)}</small>
                      <div
                        className={styles.creditSlider}
                        role="slider"
                        tabIndex={0}
                        aria-valuemin={0}
                        aria-valuemax={3}
                        aria-valuenow={tierIndex}
                        onPointerDown={(event) => tierFromPointer(event, plan.id)}
                        onPointerMove={(event) => { if (event.buttons) tierFromPointer(event, plan.id); }}
                        onKeyDown={(event) => {
                          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                          event.preventDefault();
                          const next = event.key === "Home" ? 0 : event.key === "End" ? 3 : tierIndex + (event.key === "ArrowRight" ? 1 : -1);
                          setPlanId(plan.id);
                          setTiers((current) => ({ ...current, [plan.id]: clampTier(next) }));
                        }}
                      >
                        <div className={styles.sliderTrack} />
                        <div className={styles.sliderFill} style={{ width: `calc((100% - 16px) * ${tierIndex / 3})` }} />
                        {[0, 1, 2, 3].map((dot) => <i key={dot} className={dot <= tierIndex ? styles.sliderDotOn : ""} style={{ left: `calc(8px + (100% - 16px) * ${dot / 3})` }} />)}
                        <b style={{ left: `calc(8px + (100% - 16px) * ${tierIndex / 3})` }} />
                      </div>
                      <div className={styles.creditLabel}><Zap /> <strong>{formatNumber(tier.credits, language)} Credits</strong><span>{text("/ Monat", "/ month")}</span></div>
                      <div className={styles.planFacts}><div><span>{text("Neue Leads", "New leads")}</span><strong>{formatNumber(plan.includedLeads, language)} {text("/ Monat", "/ month")}</strong></div><div><span>{text("AI-Redesigns", "AI redesigns")}</span><strong>{language === "de" ? plan.redesignsLabel : plan.redesignsLabelEn}</strong></div></div>
                      <p className={styles.planExtra}>{language === "de" ? plan.extra : plan.extraEn}</p>
                    </article>
                  );
                })}
              </div>
              {authError ? <div className={styles.inlineAlert}><AlertCircle />{authError}</div> : null}
              <div className={styles.planFooter}>
                <button type="button" className={styles.primaryButton} disabled={busy || !currentPlan} onClick={() => currentPlan && void persistPlan(currentPlan.id)}>
                  {busy ? text("Bitte warten…", "Please wait…") : currentPlan && currentTier ? <>{text("Mit", "Continue with")} {currentPlan.name} · $<AnimatedNumber value={priceForTier(currentTier, billing, billingCurrency)} locale="en-US" /></> : text("Fortfahren", "Continue")}<ArrowRight />
                </button>
                <button type="button" className={styles.textButton} disabled={busy} onClick={() => void persistPlan("free")}>{text("Kostenlos fortfahren →", "Continue free →")}</button>
                <span className={styles.billingNote}><AlertCircle /> {text("Nach dem Profil wirst du sicher zu Stripe Checkout weitergeleitet.", "After your profile, you’ll continue securely to Stripe Checkout.")}</span>
              </div>
            </div>
          ) : null}

          {step === "profile" ? (
            <div className={styles.swap}>
              <h1>{text("Profil einrichten", "Set up your profile")}</h1>
              <p>{text("Name und Standort brauchen wir für Ansprache und Angebote. Alles andere kannst du später ergänzen.", "We need your name and location for outreach and proposals. Everything else can be added later.")}</p>
              <div className={styles.onboardingAvatarRow}>
                <label className={styles.onboardingAvatar}>
                  {avatarPreview ? <img src={avatarPreview} alt="" /> : <UserRound />}
                  <span><Upload /></span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { chooseOnboardingAvatar(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
                </label>
                <div><strong>{text("Profilbild", "Profile image")}</strong><p>{text("Optional · PNG, JPG oder WebP · max. 3 MB", "Optional · PNG, JPG or WebP · max. 3 MB")}</p></div>
              </div>
              <div className={styles.requiredGrid}>
                <label>{text("Vollständiger Name", "Full name")} <span>*</span><input ref={nameRef} className={profileTouched && !name.trim() ? styles.invalid : ""} value={name} onChange={(event) => setName(event.target.value)} placeholder={text("Vollständiger Name", "Full name")} />{profileTouched && !name.trim() ? <small>{text("Dieses Feld ist erforderlich.", "This field is required.")}</small> : null}</label>
                <label>{text("Standort", "Location")} <span>*</span><div ref={(node) => { locationRef.current = node?.querySelector("input") ?? null; }}><CityField value={location} language={language} onChange={setLocation} /></div>{profileTouched && !location.trim() ? <small>{text("Dieses Feld ist erforderlich.", "This field is required.")}</small> : null}</label>
              </div>
              <button type="button" className={styles.mobileOptionalToggle} onClick={() => setShowOptionalMobile((open) => !open)}>{text("Optionale Angaben", "Optional details")} {showOptionalMobile ? text("schließen ↑", "close ↑") : text("öffnen ↓", "open ↓")}</button>
              <div className={cn(styles.optionalSection, showOptionalMobile && styles.optionalSectionOpen)}>
                <div className={styles.sectionDivider}><span>{text("Optional – später ergänzbar", "Optional — add later")}</span><i /></div>
                <div className={styles.optionalGrid}>
                  <label>{text("Telefon", "Phone")}<PhoneField code={phoneCountryCode} phone={phone} language={language} onCode={setPhoneCountryCode} onPhone={setPhone} /></label>
                  <label>{text("Währung", "Currency")}<CurrencyField
                    currency={currency}
                    language={language}
                    onCurrency={setCurrency}
                  /></label>
                  {optionalFields(language).map(([key, label, placeholder]) => (
                    <label key={key}>{label}<input value={optional[key] ?? ""} onChange={(event) => setOptional((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} /></label>
                  ))}
                </div>
                <div className="mt-4 rounded-[14px] border border-black/[.08] bg-white p-4 dark:border-white/10 dark:bg-white/[.03]">
                  <div className="flex items-start justify-between gap-4"><div><strong className="text-[12.5px]">Brand Kit</strong><p className="mt-1 text-[10.5px] leading-4 text-[#6B7078]">{text("Wird für zukünftige Outreach-CTAs, Kundenvorschauen und Proposals verwendet.", "Used for future outreach CTAs, customer previews and proposals.")}</p></div><div className="flex items-center gap-2"><input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value.toUpperCase())} className="size-8 rounded-[8px] border border-black/10 bg-white p-1" /><input value={brandColor} onChange={(event) => setBrandColor(event.target.value.toUpperCase())} maxLength={7} className="h-8 w-[92px] rounded-[8px] border border-black/10 px-2 font-mono text-[10.5px]" /></div></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div><span className="text-[10.5px] font-medium">{text("Öffentliche Identität", "Public identity")}</span><div className="mt-2 grid grid-cols-3 gap-1.5">{([['avatar', text("Profil", "Profile")], ['logo', 'Logo'], ['none', text("Keine", "None")]] as const).map(([id,label]) => <button key={id} type="button" disabled={id === 'logo' && !brandLogoPreview} onClick={() => setBrandIdentityMode(id)} className={cn("h-8 rounded-[8px] border text-[10px] font-medium disabled:opacity-35", brandIdentityMode === id ? "border-[#002BBA] bg-[#002BBA] text-white" : "border-black/10 bg-white")}>{label}</button>)}</div></div>
                    <div><span className="text-[10.5px] font-medium">{text("Projekt besprechen", "Discuss project")}</span><div className="mt-2 grid grid-cols-3 gap-1.5">{([['email', text("E-Mail", "Email")], ['booking', 'Booking'], ['both', text("Beides", "Both")]] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setBrandCtaMode(id)} className={cn("h-8 rounded-[8px] border text-[10px] font-medium", brandCtaMode === id ? "border-[#002BBA] bg-[#002BBA] text-white" : "border-black/10 bg-white")}>{label}</button>)}</div></div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-[10.5px]">Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { chooseOnboardingBrandLogo(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} className="mt-1 block w-full text-[10px]" /></label>
                    {brandLogoPreview ? <div className="flex h-12 items-center justify-center rounded-[9px] border border-black/10 bg-white"><img src={brandLogoPreview} alt="" className="max-h-8 max-w-[120px] object-contain" /></div> : <div className="flex h-12 items-center justify-center rounded-[9px] border border-dashed border-black/10 text-[9.5px] text-[#8A9099]">{text("Optionales Logo", "Optional logo")}</div>}
                  </div>
                  {brandCtaMode !== "email" ? <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px]"><input type="url" value={bookingUrl} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://cal.com/you/30min" className="h-9 rounded-[8px] border border-black/10 px-2.5 text-[10.5px]" /><input value={bookingProviderLabel} onChange={(event) => setBookingProviderLabel(event.target.value)} placeholder="Cal.com" className="h-9 rounded-[8px] border border-black/10 px-2.5 text-[10.5px]" /></div> : null}
                </div>
                <label className={styles.descriptionField}>{text("Kurzbeschreibung", "Short description")}<textarea rows={2} value={optional.description ?? ""} onChange={(event) => setOptional((current) => ({ ...current, description: event.target.value }))} placeholder={text("Ich baue schnelle, konversionsstarke Websites für meine Zielgruppe.", "I build fast, conversion-focused websites for my target audience.")} /></label>
              </div>
              <div className={styles.replyBox}>
                <Mail />
                <div className={styles.replyBoxCopy}>
                  <strong>{text("Antwort-Adresse", "Reply address")}: {replyEmail}</strong>
                  <p>{gmailEmail ? text("Gmail ist verbunden und wird für Antworten und Versand verwendet.", "Gmail is connected and used for replies and sending.") : text("Optional: Verbinde Gmail jetzt oder später in den Einstellungen.", "Optional: connect Gmail now or later in Settings.")}</p>
                </div>
                {!gmailEmail ? (
                  <button type="button" className={styles.gmailConnectButton} disabled={busy} onClick={() => void connectGmailFromOnboarding()}>
                    {busy ? text("Verbindet…", "Connecting…") : text("Gmail verbinden", "Connect Gmail")}
                  </button>
                ) : (
                  <span className={styles.gmailConnected}><Check />{text("Verbunden", "Connected")}</span>
                )}
              </div>
              {profileError ? <div className={styles.inlineAlert}><AlertCircle />{profileError}</div> : null}
              <div className={styles.profileFooter}>
                <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void finishProfile()}>{busy ? text("Speichern…", "Saving…") : text("Profil speichern", "Save profile")}</button>
                <button type="button" className={styles.textButton} disabled={busy} onClick={() => setStep("plan")}>{text("Zurück", "Back")}</button>
                <span>{text("Pflichtfelder mit", "Required fields marked with")} <b>*</b></span>
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className={cn(styles.swap, styles.done)}>
              <span className={styles.doneIcon}><Check /></span>
              <h1>{text("Alles bereit.", "All set.")}</h1>
              <p>{text("Dein Leadbase Workspace ist eingerichtet.", "Your Leadbase workspace is ready.")}</p>
              <div className={styles.summary}>
                <div><span>Plan</span><strong>{planId === "free" ? text("Free · später upgraden", "Free · upgrade later") : currentPlan?.name ?? "Pro"}</strong></div>
                <div><span>Credits</span><strong>{planId === "free" ? text("50 einmalig", "50 one-time") : `${formatNumber(currentTier?.credits ?? 0, language)} ${text("/ Monat", "/ month")}`}</strong></div>
                <div><span>{text("Absender", "Sender")}</span><strong>{replyEmail} · Gmail {gmailEmail ? text("verbunden", "connected") : text("offen", "not connected")}</strong></div>
              </div>
              <button type="button" className={styles.primaryButton} onClick={() => window.location.assign("/")}>{text("Leadbase öffnen", "Open Leadbase")}</button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
