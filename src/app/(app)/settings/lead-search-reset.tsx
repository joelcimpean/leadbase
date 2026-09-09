"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLanguage } from "@/components/language-provider";

import styles from "./settings-precision.module.css";

type ResetResponse = {
  ok?: boolean;
  error?: string;
  deletedCandidates?: number;
  deletedSearches?: number;
  releasedCompanies?: number;
};

const copy = {
  de: {
    title: "Lead-Suche zurücksetzen",
    description:
      "Löscht die Suchhistorie sowie alle offenen, gespeicherten oder verworfenen Suchkandidaten. Bereits im CRM angelegte Leads bleiben erhalten und weiterhin vor Duplikaten geschützt. Bereits gefundene Unternehmen können danach erneut in Suchergebnissen erscheinen.",
    button: "Zurücksetzen",
    warningTitle: "Suchhistorie wirklich löschen?",
    warning:
      "Diese Aktion kann nicht rückgängig gemacht werden. Bestehende CRM-Leads bleiben unverändert.",
    confirmationLabel: "Zum Bestätigen RESET eingeben",
    confirmationPlaceholder: "RESET",
    cancel: "Abbrechen",
    confirm: "Endgültig zurücksetzen",
    resetting: "Wird zurückgesetzt…",
    success: "Suchhistorie zurückgesetzt",
    candidates: "Kandidaten gelöscht",
    searches: "Suchläufe gelöscht",
    companies: "alte Firmen-Sperren gelöst",
    failed: "Die Lead-Suche konnte nicht zurückgesetzt werden.",
  },
  en: {
    title: "Reset lead search",
    description:
      "Deletes search history and all open, saved or rejected search candidates. Existing CRM leads stay untouched and protected from duplicates. Previously found companies can appear again afterwards.",
    button: "Reset",
    warningTitle: "Delete search history?",
    warning:
      "This action cannot be undone. Existing CRM leads remain unchanged.",
    confirmationLabel: "Type RESET to confirm",
    confirmationPlaceholder: "RESET",
    cancel: "Cancel",
    confirm: "Reset permanently",
    resetting: "Resetting…",
    success: "Search history reset",
    candidates: "candidates deleted",
    searches: "searches deleted",
    companies: "old company blocks released",
    failed: "Lead search could not be reset.",
  },
} as const;

export function LeadSearchReset() {
  const { language } = useLanguage();
  const router = useRouter();
  const text = copy[language];

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    candidates: number;
    searches: number;
    companies: number;
  } | null>(null);

  async function resetLeadDiscovery() {
    if (resetting || confirmation !== "RESET") return;

    setResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings/reset-lead-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(text.failed);
      }

      const result = (await response.json()) as ResetResponse;
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? text.failed);
      }

      // Keep the existing behavior: a full discovery reset also clears
      // the locally stored AI-search conversation.
      window.localStorage.removeItem("leadbase:ai-lead-search-chat:v1");

      setSuccess({
        candidates: result.deletedCandidates ?? 0,
        searches: result.deletedSearches ?? 0,
        companies: result.releasedCompanies ?? 0,
      });
      setConfirmation("");
      setConfirmationOpen(false);
      router.refresh();
    } catch (resetError) {
      console.error("Could not reset lead discovery:", resetError);
      setError(resetError instanceof Error ? resetError.message : text.failed);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className={styles.resetRoot}>
      <div className={styles.resetTop}>
        <div className={styles.resetCopy}>
          <strong>{text.title}</strong>
          <p>{text.description}</p>
        </div>

        {!confirmationOpen ? (
          <button
            type="button"
            className={styles.actionButtonWarn}
            onClick={() => {
              setConfirmationOpen(true);
              setConfirmation("");
              setError(null);
              setSuccess(null);
            }}
          >
            <Trash2 size={13} />
            {text.button}
          </button>
        ) : null}
      </div>

      {confirmationOpen ? (
        <div className={styles.resetConfirm}>
          <strong>{text.warningTitle}</strong>
          <p>{text.warning}</p>

          <label className={styles.resetInputLabel} htmlFor="lead-search-reset-confirmation">
            {text.confirmationLabel}
          </label>
          <input
            id="lead-search-reset-confirmation"
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={text.confirmationPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className={styles.resetInput}
          />

          <div className={styles.resetButtons}>
            <button
              type="button"
              disabled={resetting || confirmation !== "RESET"}
              className={styles.actionButtonDanger}
              onClick={() => void resetLeadDiscovery()}
              style={{ opacity: resetting || confirmation !== "RESET" ? 0.45 : 1 }}
            >
              {resetting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {resetting ? text.resetting : text.confirm}
            </button>
            <button
              type="button"
              disabled={resetting}
              className={styles.actionButtonQuiet}
              onClick={() => {
                setConfirmationOpen(false);
                setConfirmation("");
              }}
            >
              {text.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className={styles.resetSuccess}>
          <CheckCircle2 size={13} />
          <span>
            {text.success} · {success.candidates} {text.candidates} · {success.searches}{" "}
            {text.searches} · {success.companies} {text.companies}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className={styles.resetError}>
          <AlertTriangle size={13} />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
