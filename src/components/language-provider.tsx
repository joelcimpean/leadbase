"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  APP_LANGUAGE_COOKIE,
  type AppLanguage,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;

  setLanguage: (
    language: AppLanguage
  ) => void;
};

const LanguageContext =
  createContext<LanguageContextValue | null>(
    null
  );

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: AppLanguage;

  children: React.ReactNode;
}) {
  const router =
    useRouter();

  const [
    language,
    setLanguageState,
  ] =
    useState<AppLanguage>(
      initialLanguage
    );

  useEffect(
    () => {
      setLanguageState(
        initialLanguage
      );
    },
    [
      initialLanguage,
    ]
  );

  const setLanguage =
    useCallback(
      (
        nextLanguage:
          AppLanguage
      ) => {
        if (
          nextLanguage ===
          language
        ) {
          return;
        }

        /* =================================================
           1. PERSIST LANGUAGE
        ================================================= */

        document.cookie = `${APP_LANGUAGE_COOKIE}=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;

        /* =================================================
           2. UPDATE CLIENT COMPONENTS IMMEDIATELY
        ================================================= */

        setLanguageState(
          nextLanguage
        );

        /* =================================================
           3. REFRESH SERVER COMPONENTS AUTOMATICALLY

           This is NOT a browser reload.
           It only refreshes the server-rendered Next.js
           components so they receive the new cookie.
        ================================================= */

        window.requestAnimationFrame(
          () => {
            router.refresh();
          }
        );
      },
      [
        language,
        router,
      ]
    );

  const value =
    useMemo(
      () => ({
        language,
        setLanguage,
      }),
      [
        language,
        setLanguage,
      ]
    );

  return (
    <LanguageContext.Provider
      value={
        value
      }
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(
      LanguageContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider."
    );
  }

  return context;
}