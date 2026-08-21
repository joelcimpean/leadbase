"use client";

import {
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Languages,
} from "lucide-react";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  languageCopy,
  type AppLanguage,
} from "@/lib/i18n";

export function LanguageSelector() {
  const router =
    useRouter();

  const {
    language,
    setLanguage,
  } =
    useLanguage();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const text =
    languageCopy[
      language
    ].settings;

  function handleLanguageChange(
    nextLanguage: AppLanguage
  ) {
    if (
      nextLanguage ===
      language
    ) {
      return;
    }

    setLanguage(
      nextLanguage
    );

    startTransition(
      () => {
        router.refresh();
      }
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          variant={
            language ===
            "en"
              ? "default"
              : "outline"
          }
          disabled={
            isPending
          }
          aria-pressed={
            language ===
            "en"
          }
          onClick={() =>
            handleLanguageChange(
              "en"
            )
          }
          className="h-11 w-full gap-2 sm:h-9 sm:w-auto"
        >
          <Languages className="size-3.5" />

          {text.english}
        </Button>

        <Button
          type="button"
          variant={
            language ===
            "de"
              ? "default"
              : "outline"
          }
          disabled={
            isPending
          }
          aria-pressed={
            language ===
            "de"
          }
          onClick={() =>
            handleLanguageChange(
              "de"
            )
          }
          className="h-11 w-full gap-2 sm:h-9 sm:w-auto"
        >
          <Languages className="size-3.5" />

          {text.german}
        </Button>
      </div>
    </div>
  );
}