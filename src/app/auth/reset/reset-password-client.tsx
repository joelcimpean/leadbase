"use client";

import { useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Zap } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordClient({ language }: { language: "de" | "en" }) {
  const de = language === "de";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError(de ? "Das Passwort muss mindestens 8 Zeichen lang sein." : "Password must be at least 8 characters.");
    if (password !== repeat) return setError(de ? "Die Passwörter stimmen nicht überein." : "Passwords do not match.");
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return setError(updateError.message);
    }
    await fetch("/auth/reset/complete", { method: "POST" }).catch(() => undefined);
    setBusy(false);
    setDone(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F6F7F9] px-5 py-10 text-[#0B0C0E]">
      <section className="w-full max-w-[416px] rounded-[14px] border border-black/[0.07] bg-white px-7 py-6 shadow-[0_32px_70px_-26px_rgba(9,10,12,0.34)]">
        <div className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#002BBA] text-white"><Zap className="size-[18px]" /></div>
        <div className="mt-[15px] font-mono text-[9px] uppercase tracking-[0.16em] text-[#A3A8B0]">Leadbase</div>
        <h1 className="mt-[7px] text-[21px] font-semibold tracking-[-0.026em]">{de ? "Neues Passwort" : "New password"}</h1>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-[#6B7078]">{de ? "Wähle ein neues Passwort für deinen Leadbase Account." : "Choose a new password for your Leadbase account."}</p>
        {done ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-[13px] text-[#2F6B3A]"><Check className="size-4" /> {de ? "Passwort gespeichert." : "Password saved."}</div>
            <a href="/" className="mt-4 flex h-[42px] items-center justify-center rounded-[9px] bg-[#002BBA] text-[13.5px] font-medium text-white">{de ? "Leadbase öffnen" : "Open Leadbase"}</a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            {[
              { label: de ? "Neues Passwort" : "New password", value: password, set: setPassword },
              { label: de ? "Passwort wiederholen" : "Repeat password", value: repeat, set: setRepeat },
            ].map((field) => (
              <label key={field.label} className="block text-[11.5px] font-medium text-[#40454E]">
                {field.label}
                <div className="relative mt-1.5">
                  <input value={field.value} onChange={(event) => field.set(event.target.value)} type={show ? "text" : "password"} className="h-10 w-full rounded-[9px] border border-[#DFE1E5] px-3 pr-11 text-[13.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10" />
                  <button type="button" onClick={() => setShow((current) => !current)} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-[7px] text-[#8A9099] hover:bg-[#F3F4F6]" aria-label={show ? (de ? "Passwort verbergen" : "Hide password") : (de ? "Passwort anzeigen" : "Show password")}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                </div>
              </label>
            ))}
            {error ? <div className="flex items-start gap-2 text-[12px] leading-5 text-[#B42318]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div> : null}
            <button disabled={busy} className="flex h-[42px] w-full items-center justify-center rounded-[9px] bg-[#002BBA] text-[13.5px] font-medium text-white disabled:opacity-50">{busy ? (de ? "Speichern…" : "Saving…") : (de ? "Passwort speichern" : "Save password")}</button>
          </form>
        )}
      </section>
    </main>
  );
}
