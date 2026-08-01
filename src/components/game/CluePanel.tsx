"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { EntryDef } from "@/lib/crossword/types";

interface Props {
  entries: EntryDef[];
  activeEntry: EntryDef | null;
  solvedKeys: Set<string>;
  onSelect: (entry: EntryDef) => void;
}

export const entryId = (e: Pick<EntryDef, "number" | "direction">) =>
  `${e.direction}-${e.number}`;

function ClueList({
  title,
  entries,
  activeEntry,
  solvedKeys,
  onSelect,
}: Props & { title: string }) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!activeEntry) return;
    const el = listRef.current?.querySelector(`[data-clue="${entryId(activeEntry)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeEntry]);

  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="label-caps mb-1.5 flex items-center gap-1.5 border-b-2 border-line pb-1 text-ink">
        <span aria-hidden className="block size-2 rotate-45 bg-pink" />
        {title}
      </h3>
      <ol
        ref={listRef}
        className="max-h-[300px] space-y-px overflow-y-auto pe-1 lg:max-h-[460px]"
      >
        {entries.map((entry) => {
          const active =
            activeEntry?.number === entry.number &&
            activeEntry?.direction === entry.direction;
          const solved = solvedKeys.has(entryId(entry));
          return (
            <li key={entryId(entry)}>
              <button
                type="button"
                data-clue={entryId(entry)}
                aria-current={active}
                onClick={() => onSelect(entry)}
                className={`flex w-full items-baseline gap-2 rounded-e-lg border-s-4 px-2 py-2 text-start text-[14px] leading-snug transition-colors duration-[120ms] ${
                  active
                    ? "border-accent bg-butter/60 font-semibold text-ink"
                    : "border-transparent text-ink hover:bg-paper-sunken"
                }`}
              >
                <span className="min-w-5 shrink-0 font-mono text-xs font-medium text-ink-soft">
                  {entry.number}
                </span>
                <span className={solved ? "text-ink-faint line-through decoration-line-soft" : ""}>
                  {entry.clue}
                </span>
                {solved && (
                  <span aria-hidden className="ms-auto shrink-0 text-xs text-correct">
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function CluePanel(props: Props) {
  const t = useTranslations("puzzle");
  const across = props.entries.filter((e) => e.direction === "across");
  const down = props.entries.filter((e) => e.direction === "down");
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <ClueList {...props} title={t("across")} entries={across} />
      <ClueList {...props} title={t("down")} entries={down} />
    </div>
  );
}
