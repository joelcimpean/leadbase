import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

export function PlanLockedWorkspace({
  children,
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref = "/profile?dialog=plan",
  badge,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  badge?: string | null;
}) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-[4px] grayscale-[0.12] opacity-[0.62]"
      >
        {children}
      </div>

      <div className="fixed inset-0 z-[115] flex items-center justify-center bg-[rgba(9,10,12,.34)] p-4 backdrop-blur-[2px] sm:p-8">
        <section className="w-full max-w-[520px] rounded-[16px] border border-black/[0.08] bg-white p-6 shadow-[0_32px_70px_-26px_rgba(9,10,12,.48),0_2px_6px_rgba(9,10,12,.08)] dark:border-white/10 dark:bg-[#0F1012] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA8FF]">
              <LockKeyhole className="size-4.5" />
            </div>
            {badge ? (
              <span className="rounded-[7px] bg-[#F1F3F6] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.08em] text-[#6B7078] dark:bg-white/[.06] dark:text-[#A8ABB2]">
                {badge}
              </span>
            ) : null}
          </div>

          <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.11em] text-[#002BBA] dark:text-[#8EA8FF]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.025em] text-[#0B0C0E] dark:text-white">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[#6B7078] dark:text-[#A6ABB4]">
            {description}
          </p>

          <Link
            href={ctaHref}
            className="mt-6 inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#002BBA] px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-[#00229A]"
          >
            {ctaLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
