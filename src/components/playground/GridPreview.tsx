"use client";

import { useTranslations } from "next-intl";
import type { PlaygroundDefinition } from "@/lib/playground/definition";

/**
 * The grid as it will be handed to a solver: shape and numbering, no letters.
 * Deliberately not the playable component — this is the look-before-you-play
 * step, and showing the answers here would spoil the puzzle you just made.
 */
export function GridPreview({ definition }: { definition: PlaygroundDefinition }) {
  const t = useTranslations("playground");

  const numbers = new Map<string, number>();
  for (const entry of definition.entries) {
    const key = `${entry.row},${entry.column}`;
    const existing = numbers.get(key);
    if (existing === undefined || entry.number < existing) numbers.set(key, entry.number);
  }

  return (
    <figure className="overflow-x-auto">
      <table
        className="mx-auto border-collapse"
        role="table"
        aria-label={t("preview.gridLabel", {
          width: definition.width,
          height: definition.height,
        })}
      >
        <tbody>
          {definition.grid.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const number = numbers.get(`${r},${c}`);
                return (
                  <td
                    key={c}
                    className={`relative size-7 border sm:size-8 ${
                      cell === null
                        ? "border-transparent bg-transparent"
                        : "border-[color:var(--cell-ink)] bg-[color:var(--cell)]"
                    }`}
                  >
                    {number !== undefined && (
                      <span className="absolute start-0.5 top-0 font-mono text-[9px] text-[color:var(--cell-ink)]">
                        {number}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-3 text-center text-sm text-ink-soft">
        {t("preview.caption", {
          width: definition.width,
          height: definition.height,
          count: definition.entries.length,
        })}
      </figcaption>
    </figure>
  );
}
