import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAppLanguage } from "@/lib/i18n-server";
import { ResetPasswordClient } from "./reset-password-client";

export default async function ResetPasswordPage() {
  const [language, cookieStore] = await Promise.all([
    getAppLanguage(),
    cookies(),
  ]);

  if (cookieStore.get("leadbase_password_recovery")?.value !== "1") {
    redirect("/profile?security=password-link-required");
  }

  return <ResetPasswordClient language={language} />;
}
