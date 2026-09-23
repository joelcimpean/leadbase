import Link from "next/link";
import { LockKeyhole, ArrowRight } from "lucide-react";

export function AccessGatePanel({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref = "/profile?dialog=plan",
  secondaryLabel,
  secondaryHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[58vh] w-full max-w-[820px] items-center justify-center px-4 py-10">
      <section className="w-full rounded-[16px] border border-black/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/[0.09] dark:bg-[#111216] sm:p-8">
        <div className="flex size-10 items-center justify-center rounded-[11px] bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA8FF]">
          <LockKeyhole className="size-4.5" />
        </div>
        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.11em] text-[#002BBA] dark:text-[#8EA8FF]">{eyebrow}</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.025em] text-[#0B0C0E] dark:text-white">{title}</h1>
        <p className="mt-2 max-w-[620px] text-[13px] leading-6 text-[#6B7078] dark:text-[#A6ABB4]">{description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={ctaHref} className="inline-flex h-[36px] items-center gap-2 rounded-[10px] bg-[#002BBA] px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-[#00229A]">
            {ctaLabel}
            <ArrowRight className="size-3.5" />
          </Link>
          {secondaryLabel && secondaryHref ? (
            <Link href={secondaryHref} className="inline-flex h-[36px] items-center rounded-[10px] border border-black/[0.09] bg-white px-4 text-[12.5px] font-medium text-[#40454E] transition-colors hover:bg-[#F7F8FA] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#D7D9DE] dark:hover:bg-white/[0.06]">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
