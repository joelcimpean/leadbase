import { getAppLanguage } from "@/lib/i18n-server";
import { ResetPasswordClient } from "./reset-password-client";

export default async function ResetPasswordPage() {
  const language = await getAppLanguage();
  return <ResetPasswordClient language={language} />;
}
