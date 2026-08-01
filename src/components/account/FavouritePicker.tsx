"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { TaxonomyOption } from "./types";

const MAX = 12;

/**
 * A filterable checkbox list for favourite subjects or collections. The list
 * comes from the taxonomy in the database — no component here holds a subject
 * list of its own (design-system §9a).
 */
export function FavouritePicker({
  legend,
  options,
  selected,
  onChange,
  disabled = false,
}: {
  legend: string;
  options: TaxonomyOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("account");
  const [filter, setFilter] = useState("");
  const filterId = useId();

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(needle) ||
        (o.group ?? "").toLowerCase().includes(needle)
    );
  }, [filter, options]);

  const full = selected.length >= MAX;

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="block text-[15px] font-semibold text-ink">{legend}</legend>
      <p className="text-[13px] text-ink-soft">
        {t("favouritesCount", { count: selected.length, max: MAX })}
      </p>
      <label htmlFor={filterId} className="sr-only">
        {t("filterList")}
      </label>
      <input
        id={filterId}
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t("filterList")}
        className="min-h-11 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 text-[15px] text-ink"
      />
      <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-card border-2 border-line-soft bg-paper p-2">
        {visible.length === 0 && (
          <li className="px-1 py-2 text-sm text-ink-soft">{t("noMatches")}</li>
        )}
        {visible.map((option) => {
          const checked = selected.includes(option.slug);
          return (
            <li key={option.slug}>
              <label className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-1.5 text-[15px] text-ink hover:bg-butter/40">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || (full && !checked)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, option.slug]
                        : selected.filter((s) => s !== option.slug)
                    )
                  }
                  className="size-5 shrink-0 accent-[var(--pink-deep)]"
                />
                <span className="min-w-0">
                  <span className="block truncate">{option.name}</span>
                  {option.group && (
                    <span className="label-caps block text-ink-faint">{option.group}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
