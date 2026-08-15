"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Bitte gib deine E-Mail-Adresse und dein Passwort ein."
      )}`
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        "E-Mail-Adresse oder Passwort ist falsch."
      )}`
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}