"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LeadbaseProfileData = {
  senderName: string;
  outreachRole: string;
  replyEmail: string;
  website: string;
  signature: string;
  company: string;
  focus: string;
  description: string;
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  location: string;
};

export type ProposalBrandingDefaults = {
  accentColor: string;
  logoUrl: string | null;
  logoPath: string | null;
};

type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(trimmed) ? trimmed : "#002BBA";
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return null;
}

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Nicht angemeldet.");
  return { supabase, user };
}

export async function saveProfile(
  input: LeadbaseProfileData
): Promise<ActionResult<{ profile: LeadbaseProfileData }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const profile: LeadbaseProfileData = {
      senderName: clean(input.senderName, 120),
      outreachRole: clean(input.outreachRole, 160),
      replyEmail: clean(input.replyEmail, 254),
      website: clean(input.website, 300),
      signature: clean(input.signature, 2000),
      company: clean(input.company, 180),
      focus: clean(input.focus, 240),
      description: clean(input.description, 1200),
      fullName: clean(input.fullName, 160),
      phoneCountryCode: clean(input.phoneCountryCode, 8) || "+49",
      phone: clean(input.phone, 50),
      location: clean(input.location, 180),
    };

    if (!profile.fullName || !profile.senderName) {
      return { ok: false, error: "Name darf nicht leer sein." };
    }

    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        full_name: profile.fullName,
        name: profile.fullName,
        leadbase_profile: profile,
        leadbase_profile_completed: true,
      },
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { ok: true, data: { profile } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden." };
  }
}

export async function saveAvatar(formData: FormData): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Kein Profilbild ausgewählt." };
    }
    if (file.size > 3 * 1024 * 1024) {
      return { ok: false, error: "Das Profilbild darf maximal 3 MB groß sein." };
    }
    const extension = extensionFor(file.type);
    if (!extension) return { ok: false, error: "Bitte PNG, JPG oder WebP verwenden." };

    const admin = createAdminClient();
    const path = `${user.id}/profile/avatar.${extension}`;
    const previousPath = typeof user.user_metadata?.avatar_path === "string" ? user.user_metadata.avatar_path : null;
    if (previousPath && previousPath !== path) {
      await admin.storage.from("proposal-assets").remove([previousPath]);
    }

    const { error: uploadError } = await admin.storage.from("proposal-assets").upload(
      path,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, upsert: true, cacheControl: "3600" }
    );
    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = admin.storage.from("proposal-assets").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { ...currentMetadata, avatar_url: avatarUrl, avatar_path: path },
    });
    if (metadataError) return { ok: false, error: metadataError.message };

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { ok: true, data: { avatarUrl } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Profilbild konnte nicht gespeichert werden." };
  }
}

export async function saveProposalBranding(
  formData: FormData
): Promise<ActionResult<ProposalBrandingDefaults>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const current = (user.user_metadata?.leadbase_proposal_branding ?? {}) as Record<string, unknown>;
    let logoUrl = typeof current.logoUrl === "string" ? current.logoUrl : null;
    let logoPath = typeof current.logoPath === "string" ? current.logoPath : null;
    const accentColor = normalizeColor(String(formData.get("accentColor") ?? "#002BBA"));
    const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
    const file = formData.get("logo");
    const admin = createAdminClient();

    if (removeLogo && logoPath) {
      await admin.storage.from("proposal-assets").remove([logoPath]);
      logoPath = null;
      logoUrl = null;
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Das Logo darf maximal 2 MB groß sein." };
      const extension = extensionFor(file.type);
      if (!extension) return { ok: false, error: "Logo bitte als PNG, JPG oder WebP hochladen." };
      const path = `${user.id}/profile/proposal-branding-logo.${extension}`;
      if (logoPath && logoPath !== path) await admin.storage.from("proposal-assets").remove([logoPath]);
      const { error: uploadError } = await admin.storage.from("proposal-assets").upload(
        path,
        Buffer.from(await file.arrayBuffer()),
        { contentType: file.type, upsert: true, cacheControl: "3600" }
      );
      if (uploadError) return { ok: false, error: uploadError.message };
      const { data } = admin.storage.from("proposal-assets").getPublicUrl(path);
      logoPath = path;
      logoUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    const branding: ProposalBrandingDefaults = { accentColor, logoUrl, logoPath };
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: { ...metadata, leadbase_proposal_branding: branding },
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/leads", "layout");
    return { ok: true, data: branding };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Branding konnte nicht gespeichert werden." };
  }
}

export async function changeAccountEmail(nextEmail: string): Promise<ActionResult> {
  try {
    const { supabase } = await authenticatedUser();
    const email = clean(nextEmail, 254).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Bestätigungs-E-Mail wurde versendet, falls E-Mail-Bestätigung aktiv ist." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "E-Mail konnte nicht geändert werden." };
  }
}

export async function changePassword(nextPassword: string): Promise<ActionResult> {
  try {
    const { supabase } = await authenticatedUser();
    if (nextPassword.length < 8) return { ok: false, error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Passwort konnte nicht geändert werden." };
  }
}
