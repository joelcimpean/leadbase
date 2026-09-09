"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ProposalSectionNavItem = {
  number: string;
  label: string;
  href: string;
};

type ProposalSectionNavProps = {
  items: ProposalSectionNavItem[];
  accentColor: string;
  ariaLabel?: string;
};

export function ProposalSectionNav({
  items,
  accentColor,
  ariaLabel = "Proposal contents",
}: ProposalSectionNavProps) {
  const ids = useMemo(
    () =>
      items.map((item) =>
        item.href.replace(/^#/, "")
      ),
    [items]
  );

  const [activeId, setActiveId] =
    useState(ids[0] ?? "");

  useEffect(() => {
    if (ids.length === 0) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;

      const probeY = Math.min(
        180,
        Math.max(96, window.innerHeight * 0.2)
      );

      const sections = ids
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

      if (sections.length === 0) {
        return;
      }

      let nextId = sections[0].id;

      for (const section of sections) {
        const rect = section.getBoundingClientRect();

        if (rect.top <= probeY) {
          nextId = section.id;
        }

        if (rect.top <= probeY && rect.bottom > probeY) {
          nextId = section.id;
          break;
        }
      }

      setActiveId((current) =>
        current === nextId ? current : nextId
      );
    };

    const schedule = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return (
    <nav
      className="mt-3 flex flex-col"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const id = item.href.replace(/^#/, "");
        const active = id === activeId;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "location" : undefined}
            onClick={(event) => {
              const section = document.getElementById(id);

              if (!section) {
                return;
              }

              event.preventDefault();
              setActiveId(id);
              section.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });

              window.history.replaceState(
                null,
                "",
                item.href
              );
            }}
            className="flex min-w-0 items-baseline gap-2 rounded-[7px] py-1.5 pr-1 text-[10.5px] transition-colors hover:text-[#14161A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002BBA]/25"
            style={{
              color: active ? accentColor : "#6B6660",
              fontWeight: active ? 500 : 400,
            }}
          >
            <span
              className="lb-proposal-mono w-4 shrink-0 text-[8px] tracking-[0.06em] transition-colors"
              style={{
                color: active ? accentColor : "#B0AAA1",
              }}
            >
              {item.number}
            </span>
            <span className="truncate">
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
