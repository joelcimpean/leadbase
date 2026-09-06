"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

export type AppTheme =
  | "light"
  | "dark"
  | "system";

type ThemeContextValue = {
  theme:
    AppTheme;

  resolvedTheme:
    "light"
    | "dark";

  setTheme:
    (
      value:
        AppTheme
    ) =>
      void;
};

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_KEY =
  "leadbase-theme";

/* =========================================================
   CONTEXT
========================================================= */

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );

/* =========================================================
   HELPERS
========================================================= */

function isAppTheme(
  value:
    string
    | null
): value is AppTheme {
  return (
    value ===
      "light" ||
    value ===
      "dark" ||
    value ===
      "system"
  );
}

function getSystemTheme() {
  if (
    typeof window ===
      "undefined"
  ) {
    return "light" as const;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

function getStoredTheme(): AppTheme {
  if (
    typeof window ===
      "undefined"
  ) {
    return "system";
  }

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    return isAppTheme(
      stored
    )
      ? stored
      : "system";
  } catch {
    return "system";
  }
}

function applyResolvedTheme(
  resolvedTheme:
    "light"
    | "dark"
) {
  if (
    typeof document ===
      "undefined"
  ) {
    return;
  }

  const root =
    document.documentElement;

  root.classList.toggle(
    "dark",
    resolvedTheme ===
      "dark"
  );

  root.style.colorScheme =
    resolvedTheme;
}

/* =========================================================
   PROVIDER
========================================================= */

export function ThemeProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    theme,
    setThemeState,
  ] =
    useState<AppTheme>(
      () =>
        getStoredTheme()
    );

  const [
    systemTheme,
    setSystemTheme,
  ] =
    useState<
      "light"
      | "dark"
    >(
      () =>
        getSystemTheme()
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(
    () => {
      const media =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

      const syncSystemTheme =
        () => {
          setSystemTheme(
            media.matches
              ? "dark"
              : "light"
          );
        };

      syncSystemTheme();

      media.addEventListener(
        "change",
        syncSystemTheme
      );

      return () => {
        media.removeEventListener(
          "change",
          syncSystemTheme
        );
      };
    },
    []
  );

  const resolvedTheme =
    theme ===
      "system"
      ? systemTheme
      : theme;

  useEffect(
    () => {
      applyResolvedTheme(
        resolvedTheme
      );
    },
    [
      resolvedTheme,
    ]
  );

  const setTheme =
    useCallback(
      (
        value:
          AppTheme
      ) => {
        setThemeState(
          value
        );

        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            value
          );
        } catch {
          // Theme still works for the current session.
        }

        const nextResolved =
          value ===
            "system"
            ? getSystemTheme()
            : value;

        applyResolvedTheme(
          nextResolved
        );
      },
      []
    );

  const value =
    useMemo<ThemeContextValue>(
      () => ({
        theme,
        resolvedTheme,
        setTheme,
      }),
      [
        resolvedTheme,
        setTheme,
        theme,
      ]
    );

  return (
    <ThemeContext.Provider
      value={
        value
      }
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
