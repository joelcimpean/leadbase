"use client";

import {
  Check,
  ChevronDown,
  Search,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   INDUSTRY LIBRARY
========================================================= */

type IndustryOption = {
  name: string;
  category: string;
  recommended?: boolean;
  keywords?: string[];
};

const INDUSTRIES: IndustryOption[] = [
  /* =======================================================
     HANDWERK & BAU
  ======================================================= */

  {
    name: "Photovoltaik / Solar",
    category: "Handwerk & Energie",
    recommended: true,
    keywords: ["pv", "solaranlage", "solarenergie"],
  },
  {
    name: "Elektriker",
    category: "Handwerk & Energie",
    recommended: true,
    keywords: ["elektro", "elektrotechnik"],
  },
  {
    name: "Sanitär, Heizung & Klima",
    category: "Handwerk & Energie",
    recommended: true,
    keywords: ["shk", "heizung", "sanitär", "klima"],
  },
  {
    name: "Wärmepumpen / Heizungsbau",
    category: "Handwerk & Energie",
    recommended: true,
    keywords: ["wärmepumpe", "heizung"],
  },
  {
    name: "Dachdecker",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: ["dach", "bedachung"],
  },
  {
    name: "Garten- und Landschaftsbau",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: [
      "gartenbau",
      "galabau",
      "landschaftsbau",
      "garten",
    ],
  },
  {
    name: "Maler & Lackierer",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: ["maler", "lackierer"],
  },
  {
    name: "Schreinerei / Tischlerei",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: [
      "schreiner",
      "tischler",
      "holzbau",
    ],
  },
  {
    name: "Zimmerei",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: ["zimmerer", "holzbau"],
  },
  {
    name: "Metallbau",
    category: "Handwerk & Bau",
    keywords: ["metall", "schlosserei"],
  },
  {
    name: "Bauunternehmen",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: ["bau", "hochbau", "tiefbau"],
  },
  {
    name: "Trockenbau",
    category: "Handwerk & Bau",
  },
  {
    name: "Innenausbau",
    category: "Handwerk & Bau",
    recommended: true,
  },
  {
    name: "Fliesenleger",
    category: "Handwerk & Bau",
  },
  {
    name: "Bodenleger",
    category: "Handwerk & Bau",
  },
  {
    name: "Fenster & Türen",
    category: "Handwerk & Bau",
    keywords: ["fensterbau", "türenbau"],
  },
  {
    name: "Küchenstudio",
    category: "Handwerk & Bau",
    recommended: true,
    keywords: ["küchen", "küchenbauer"],
  },
  {
    name: "Gebäudereinigung",
    category: "Handwerk & Bau",
    keywords: ["reinigung", "reinigungsfirma"],
  },
  {
    name: "Gebäudetechnik",
    category: "Handwerk & Energie",
  },
  {
    name: "Smart Home / Gebäudeautomation",
    category: "Handwerk & Energie",
    keywords: [
      "smart home",
      "automation",
      "gebäudeautomation",
    ],
  },

  /* =======================================================
     IMMOBILIEN
  ======================================================= */

  {
    name: "Immobilienmakler",
    category: "Immobilien",
    recommended: true,
    keywords: ["makler", "immobilien"],
  },
  {
    name: "Hausverwaltung",
    category: "Immobilien",
    recommended: true,
    keywords: [
      "immobilienverwaltung",
      "property management",
    ],
  },
  {
    name: "Architekturbüro",
    category: "Immobilien",
    recommended: true,
    keywords: ["architekt", "architektur"],
  },
  {
    name: "Innenarchitektur",
    category: "Immobilien",
    recommended: true,
    keywords: ["interior", "interior design"],
  },
  {
    name: "Projektentwickler",
    category: "Immobilien",
    keywords: ["projektentwicklung"],
  },

  /* =======================================================
     BEAUTY
  ======================================================= */

  {
    name: "Friseur",
    category: "Beauty",
    recommended: true,
    keywords: ["hair", "friseursalon"],
  },
  {
    name: "Barbershop",
    category: "Beauty",
    recommended: true,
    keywords: ["barber"],
  },
  {
    name: "Kosmetikstudio",
    category: "Beauty",
    recommended: true,
    keywords: ["kosmetik", "beauty"],
  },
  {
    name: "Nagelstudio",
    category: "Beauty",
    keywords: ["nails", "nageldesign"],
  },
  {
    name: "Permanent Make-up",
    category: "Beauty",
    keywords: ["pmu", "permanent makeup"],
  },

  /* =======================================================
     GESUNDHEIT
  ======================================================= */

  {
    name: "Zahnarzt",
    category: "Gesundheit",
    recommended: true,
    keywords: [
      "zahnarztpraxis",
      "dentist",
      "zahnmedizin",
    ],
  },
  {
    name: "Physiotherapie",
    category: "Gesundheit",
    recommended: true,
    keywords: ["physio"],
  },
  {
    name: "Ergotherapie",
    category: "Gesundheit",
  },
  {
    name: "Osteopathie",
    category: "Gesundheit",
  },
  {
    name: "Chiropraktik",
    category: "Gesundheit",
  },
  {
    name: "Ärztepraxis",
    category: "Gesundheit",
    keywords: ["arzt", "praxis"],
  },

  /* =======================================================
     B2B & PROFESSIONAL SERVICES
  ======================================================= */

  {
    name: "Unternehmensberatung",
    category: "B2B Dienstleistungen",
    recommended: true,
    keywords: ["consulting", "berater"],
  },
  {
    name: "IT-Dienstleister",
    category: "B2B Dienstleistungen",
    recommended: true,
    keywords: [
      "it",
      "software",
      "systemhaus",
      "managed service",
    ],
  },
  {
    name: "Steuerberater",
    category: "B2B Dienstleistungen",
    recommended: true,
    keywords: ["steuerberatung"],
  },
  {
    name: "Rechtsanwalt / Kanzlei",
    category: "B2B Dienstleistungen",
    recommended: true,
    keywords: [
      "anwalt",
      "rechtsanwalt",
      "kanzlei",
    ],
  },
  {
    name: "Versicherungsmakler",
    category: "B2B Dienstleistungen",
    keywords: ["versicherung"],
  },
  {
    name: "Finanzberatung",
    category: "B2B Dienstleistungen",
    keywords: ["finanzberater", "finance"],
  },
  {
    name: "Marketingagentur",
    category: "B2B Dienstleistungen",
    keywords: ["marketing", "agentur"],
  },
  {
    name: "Werbeagentur",
    category: "B2B Dienstleistungen",
    keywords: ["werbung", "agentur"],
  },
  {
    name: "Personalberatung",
    category: "B2B Dienstleistungen",
    keywords: [
      "recruiting",
      "personalvermittlung",
      "headhunter",
    ],
  },
  {
    name: "Ingenieurbüro",
    category: "B2B Dienstleistungen",
    recommended: true,
    keywords: ["ingenieur"],
  },

  /* =======================================================
     AUTOMOTIVE
  ======================================================= */

  {
    name: "Autowerkstatt",
    category: "Automotive",
    recommended: true,
    keywords: [
      "kfz",
      "werkstatt",
      "kfz-werkstatt",
    ],
  },
  {
    name: "Autoaufbereitung",
    category: "Automotive",
    recommended: true,
    keywords: [
      "fahrzeugaufbereitung",
      "detailing",
    ],
  },
  {
    name: "Fahrschule",
    category: "Automotive",
    recommended: true,
  },
  {
    name: "Autohaus",
    category: "Automotive",
  },

  /* =======================================================
     GASTRONOMIE & HOSPITALITY
  ======================================================= */

  {
    name: "Restaurant",
    category: "Gastronomie & Hospitality",
    recommended: true,
  },
  {
    name: "Café",
    category: "Gastronomie & Hospitality",
  },
  {
    name: "Hotel",
    category: "Gastronomie & Hospitality",
    recommended: true,
  },
  {
    name: "Catering",
    category: "Gastronomie & Hospitality",
  },
  {
    name: "Eventlocation",
    category: "Gastronomie & Hospitality",
    recommended: true,
  },

  /* =======================================================
     FITNESS & WELLNESS
  ======================================================= */

  {
    name: "Fitnessstudio",
    category: "Fitness & Wellness",
    recommended: true,
    keywords: ["gym", "fitness"],
  },
  {
    name: "Personal Training",
    category: "Fitness & Wellness",
    keywords: ["personal trainer"],
  },
  {
    name: "Yoga / Pilates",
    category: "Fitness & Wellness",
    keywords: ["yoga", "pilates"],
  },
  {
    name: "Wellness / Spa",
    category: "Fitness & Wellness",
    recommended: true,
    keywords: ["wellness", "spa"],
  },

  /* =======================================================
     RETAIL
  ======================================================= */

  {
    name: "Möbelhaus",
    category: "Einzelhandel",
    keywords: ["möbel"],
  },
  {
    name: "Juwelier",
    category: "Einzelhandel",
    recommended: true,
    keywords: ["schmuck"],
  },
  {
    name: "Optiker",
    category: "Einzelhandel",
    recommended: true,
    keywords: ["brillen", "augenoptik"],
  },
  {
    name: "Modegeschäft",
    category: "Einzelhandel",
    keywords: ["fashion", "mode"],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeSearchValue(
  value: string
) {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}

type IndustryAutocompleteProps = {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onValueChange?: (
    value: string
  ) => void;
};

/* =========================================================
   COMPONENT
========================================================= */

export function IndustryAutocomplete({
  id,
  name,
  value,
  defaultValue = "",
  placeholder = "Search or enter an industry...",
  required = false,
  onValueChange,
}: IndustryAutocompleteProps) {
  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const isControlled =
    value !== undefined;

  const [
    internalValue,
    setInternalValue,
  ] = useState(defaultValue);

  const [open, setOpen] =
    useState(false);

  const currentValue =
    isControlled
      ? value
      : internalValue;

  function updateValue(
    nextValue: string
  ) {
    if (!isControlled) {
      setInternalValue(
        nextValue
      );
    }

    onValueChange?.(
      nextValue
    );
  }

  /* =======================================================
     CLOSE WHEN CLICKING OUTSIDE
  ======================================================= */

  useEffect(() => {
    function handlePointerDown(
      event: PointerEvent
    ) {
      if (
        !wrapperRef.current
      ) {
        return;
      }

      if (
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, []);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredIndustries =
    useMemo(() => {
      const query =
        normalizeSearchValue(
          currentValue
        );

      if (!query) {
        return INDUSTRIES;
      }

      return INDUSTRIES.filter(
        (industry) => {
          const searchable =
            normalizeSearchValue(
              [
                industry.name,
                industry.category,
                ...(industry.keywords ??
                  []),
              ].join(" ")
            );

          return searchable.includes(
            query
          );
        }
      );
    }, [currentValue]);

  const groupedIndustries =
    useMemo(() => {
      const groups =
        new Map<
          string,
          IndustryOption[]
        >();

      for (const industry of filteredIndustries) {
        const current =
          groups.get(
            industry.category
          ) ?? [];

        current.push(industry);

        groups.set(
          industry.category,
          current
        );
      }

      return Array.from(
        groups.entries()
      );
    }, [filteredIndustries]);

  const exactMatch =
    INDUSTRIES.some(
      (industry) =>
        normalizeSearchValue(
          industry.name
        ) ===
        normalizeSearchValue(
          currentValue
        )
    );

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      {/* INPUT */}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          id={id}
          name={name}
          value={currentValue}
          onChange={(event) => {
            updateValue(
              event.target.value
            );

            setOpen(true);
          }}
          onFocus={() =>
            setOpen(true)
          }
          placeholder={
            placeholder
          }
          required={required}
          autoComplete="off"
          className="h-10 pl-9 pr-9"
        />

        <button
          type="button"
          aria-label="Show industry suggestions"
          onClick={() =>
            setOpen(
              (current) =>
                !current
            )
          }
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open &&
                "rotate-180"
            )}
          />
        </button>
      </div>

      {/* DROPDOWN */}

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border bg-popover shadow-lg">
          <div className="border-b px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />

              <span>
                Suggested industries
                for lead generation
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {groupedIndustries.length >
            0 ? (
              groupedIndustries.map(
                ([
                  category,
                  industries,
                ]) => (
                  <div
                    key={
                      category
                    }
                    className="py-1"
                  >
                    <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {category}
                    </p>

                    {industries.map(
                      (
                        industry
                      ) => {
                        const selected =
                          normalizeSearchValue(
                            currentValue
                          ) ===
                          normalizeSearchValue(
                            industry.name
                          );

                        return (
                          <button
                            key={
                              industry.name
                            }
                            type="button"
                            onClick={() => {
                              updateValue(
                                industry.name
                              );

                              setOpen(
                                false
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {
                                    industry.name
                                  }
                                </span>

                                {industry.recommended ? (
                                  <span className="rounded-full border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Good fit
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {selected ? (
                              <Check className="size-4 shrink-0" />
                            ) : null}
                          </button>
                        );
                      }
                    )}
                  </div>
                )
              )
            ) : (
              <div className="px-3 py-5 text-center">
                <p className="text-sm font-medium">
                  No suggestion
                  found
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  You can still use
                  &quot;
                  {currentValue}
                  &quot; as a custom
                  industry.
                </p>
              </div>
            )}
          </div>

          {currentValue.trim() &&
          !exactMatch ? (
            <div className="border-t bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Custom industries
                are allowed. Your
                current value will
                be saved exactly as
                entered.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}