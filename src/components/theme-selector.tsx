"use client";

import {
  Laptop,
  Moon,
  Sun,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useTheme,
} from "@/components/theme-provider";

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

  label:
    string;

  description:
    string;

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
    useState(
      false
    );

  useEffect(
    () => {
      setMounted(
        true
      );
    },
    []
  );

  if (
    !mounted
  ) {
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
              onClick={() =>
                setTheme(
                  option.value
                )
              }
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",

                active
                  ? "border-primary/30 bg-primary/[0.055] shadow-[0_8px_28px_rgba(0,43,186,0.07)]"
                  : "border-border/70 bg-background hover:-translate-y-px hover:border-primary/15 hover:bg-primary/[0.025] hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn(
                    "flex size-10 items-center justify-center rounded-xl border transition-colors",
                    active
                      ? "border-primary/15 bg-primary/10 text-primary"
                      : "border-border/70 bg-background text-muted-foreground group-hover:text-foreground"
                  )}>
                  <Icon className="size-4" />
                </div>

                <div
                  className={cn(
                    "mt-1 flex size-4 items-center justify-center rounded-full border transition-all",

                    active
                      ? "border-primary bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                      : "border-muted-foreground/35 bg-background"
                  )}
                />
              </div>

              <p className={cn("mt-4 text-sm font-semibold transition-colors", active ? "text-primary" : "text-foreground")}>
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
