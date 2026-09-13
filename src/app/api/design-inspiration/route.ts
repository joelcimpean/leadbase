import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertPlanFeatureAvailable, isPlanAccessError, planAccessMessage } from "@/lib/plan-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "design-inspiration";
const MAX_BYTES = 3 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function hasValidSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function authUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

export async function POST(request: Request) {
  const user = await authUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  try {
    await assertPlanFeatureAvailable(user.id, "design_generation");
  } catch (error) {
    if (isPlanAccessError(error)) {
      return NextResponse.json(
        { ok: false, error: planAccessMessage(error, "en") ?? "AI design is not included in your plan." },
        { status: 403 },
      );
    }
    throw error;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ ok: false, error: "No image selected." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Reference images may be at most 3 MB each." }, { status: 413 });
  }
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ ok: false, error: "Please use PNG, JPG or WebP." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(buffer, file.type)) {
    return NextResponse.json({ ok: false, error: "The uploaded file is not a valid image." }, { status: 415 });
  }

  const admin = createAdminClient();
  const path = `${user.id}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
  if (uploadError) {
    console.error("Could not upload design inspiration:", uploadError);
    return NextResponse.json({ ok: false, error: "Reference image could not be uploaded. Run the Phase 12 SQL migration first." }, { status: 500 });
  }

  const { data: signed, error: signedError } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signedError || !signed?.signedUrl) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: "Reference preview could not be created." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, url: signed.signedUrl, name: file.name, size: file.size });
}

export async function DELETE(request: Request) {
  const user = await authUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  let body: { path?: unknown } = {};
  try { body = await request.json(); } catch { /* noop */ }
  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!path || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid image path." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
