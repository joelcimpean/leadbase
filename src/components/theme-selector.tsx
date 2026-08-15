"use client";

import {
  Laptop,
  Moon,
  Sun,
} from "lucide-react";

import {
  useTheme,
} from "next-themes";

import {
  useEffect,
  useState,
} from "react";

import {
  cn,
} from "@/lib/utils";

/* =========================================================
   TYPES
========================================================= */

type ThemeOption = {
  value:
    | "light"
    | "dark"
    | "system";

  label: string;

  description: string;

  icon:
    React.ElementType;
};

/* =========================================================
   OPTIONS
========================================================= */

const themeOptions:
  ThemeOption[] = [
    {
      value:
        "light",

      label:
        "Light",

      description:
        "Always use the light appearance.",

      icon:
        Sun,
    },

    {
      value:
        "dark",

      label:
        "Dark",

      description:
        "Always use the dark appearance.",

      icon:
        Moon,
    },

    {
      value:
        "system",

      label:
        "System",

      description:
        "Follow your device appearance.",

      icon:
        Laptop,
    },
  ];

/* =========================================================
   COMPONENT
========================================================= */

export function ThemeSelector() {
  const {
    theme,
    setTheme,
  } =
    useTheme();

  const [
    mounted,
    setMounted,
  ] =
    useState(false);

  useEffect(
    () => {
      setMounted(true);
    },
    []
  );

  if (!mounted) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {themeOptions.map(
          (
            option
          ) => (
            <div
              key={
                option.value
              }
              className="h-[92px] animate-pulse rounded-xl border bg-muted/20"
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {themeOptions.map(
        (
          option
        ) => {
          const Icon =
            option.icon;

          const active =
            theme ===
            option.value;

          return (
            <button
              key={
                option.value
              }
              type="button"
              onClick={
                () =>
                  setTheme(
                    option.value
                  )
              }
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",

                active
                  ? "border-foreground bg-muted/60"
                  : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-4" />
                </div>

                <div
                  className={cn(
                    "mt-1 size-3.5 rounded-full border",

                    active
                      ? "border-foreground bg-foreground ring-2 ring-background"
                      : "border-muted-foreground/40"
                  )}
                />
              </div>

              <p className="mt-4 text-sm font-medium">
                {
                  option.label
                }
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  option.description
                }
              </p>
            </button>
          );
        }
      )}
    </div>
  );
}