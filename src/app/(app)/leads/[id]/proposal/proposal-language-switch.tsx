"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type ProposalLanguage =
  | "de"
  | "en";

export function ProposalLanguageSwitch({
  language,
  disabled = false,
}: {
  language: ProposalLanguage;
  disabled?: boolean;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  function select(
    next:
      ProposalLanguage
  ) {
    if (
      disabled ||
      next === language
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set(
      "proposalLanguage",
      next
    );

    router.replace(
      `${pathname}?${params.toString()}`,
      {
        scroll:
          false,
      }
    );
  }

  return (
    <div
      className="flex h-[34px] items-center rounded-[10px] border border-black/[0.08] bg-[#F1F2F4] p-[3px] dark:border-white/[0.08] dark:bg-white/[0.05]"
      aria-label="Proposal language"
    >
      {(
        [
          "de",
          "en",
        ] as const
      ).map(
        (
          item
        ) => {
          const active =
            item ===
            language;

          return (
            <button
              key={
                item
              }
              type="button"
              disabled={
                disabled
              }
              onClick={
                () =>
                  select(
                    item
                  )
              }
              className={`h-[26px] min-w-[31px] rounded-[7px] px-2 font-mono text-[9.5px] uppercase tracking-[0.06em] transition-all disabled:cursor-not-allowed disabled:opacity-55 ${
                active
                  ? "bg-white text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,.10)] dark:bg-white/[0.11] dark:text-white"
                  : "text-[#7B8088] hover:text-[#0B0C0E] dark:text-[#9A9FA8] dark:hover:text-white"
              }`}
            >
              {
                item
              }
            </button>
          );
        }
      )}
    </div>
  );
}
