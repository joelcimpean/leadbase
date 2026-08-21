import "server-only";

import {
  cookies,
} from "next/headers";

import {
  APP_LANGUAGE_COOKIE,
  normalizeAppLanguage,
  type AppLanguage,
} from "@/lib/i18n";

export async function getAppLanguage(): Promise<AppLanguage> {
  const cookieStore =
    await cookies();

  return normalizeAppLanguage(
    cookieStore.get(
      APP_LANGUAGE_COOKIE
    )?.value
  );
}