"use client";

import { memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { AttemptGridState, Grid } from "@/lib/crossword/types";
import { cellKey } from "@/lib/crossword/types";
import type { Selection } from "@/lib/crossword/navigation";

interface Props {
  grid: Grid;
  numbers: Map<string, number>;
  state: AttemptGridState;
  selection: Selection | null;
  wordCells: Set<string>;
  rtl: boolean;
  solved: boolean;
  onCellClick: (row: number, column: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  registerCell: (key: string, el: HTMLButtonElement | null) => void;
}

/** Cells never shrink below this, even if it means the grid scrolls. */
const MIN_CELL = 34;

/**
 * The grid is the hero: white cells, near-black letters, no decoration inside
 * the frame. Only cursor/word/state tints appear, and every state also carries
 * a glyph so it never depends on color. See docs/design-system.md §4.
 */
export const CrosswordGrid = memo(function CrosswordGrid({
  grid,
  numbers,
  state,
  selection,
  wordCells,
  rtl,
  solved,
  onCellClick,
  onKeyDown,
  registerCell,
}: Props) {
  const t = useTranslations("game");
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const refCallback = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => registerCell(key, el),
    [registerCell]
  );

  return (
    <div className="overflow-x-auto pb-1">
      <div
        role="grid"
        aria-label={t("gridLabel")}
        dir={rtl ? "rtl" : "ltr"}
        onKeyDown={onKeyDown}
        className="mx-auto rounded-lg border-2 border-line bg-paper-bright p-1 shadow-card"
        style={{
          width: "100%",
          maxWidth: 560,
          minWidth: width * MIN_CELL,
          containerType: "inline-size",
        }}
      >
        {Array.from({ length: height }, (_, r) => (
          <div
            key={r}
            role="row"
            className="grid"
            style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: width }, (_, c) => {
              const key = cellKey(r, c);
              const solution = grid[r][c];
              if (solution === null) {
                return (
                  <div
                    key={key}
                    role="gridcell"
                    aria-label={t("blockCell")}
                    className="aspect-square rounded-[2px] bg-cell-block"
                  />
                );
              }
              const cell = state.cells[r][c];
              const isSelected =
                selection !== null && selection.row === r && selection.column === c;
              const inWord = wordCells.has(key);
              const number = numbers.get(key);
              const wrong = cell.flags.includes("checked-wrong");
              const revealed = cell.flags.includes("revealed");
              const confirmed = cell.flags.includes("confirmed");

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  ref={refCallback(key)}
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-label={`${t("cell", { row: r + 1, column: c + 1 })}${
                    cell.letter ? `, ${cell.letter}` : ""
                  }${wrong ? ", ✗" : revealed ? ", •" : confirmed ? ", ✓" : ""}`}
                  onClick={() => onCellClick(r, c)}
                  className={`relative flex aspect-square items-center justify-center rounded-[3px] border border-cell-line p-0 font-sans font-bold uppercase leading-none transition-colors duration-[120ms] ${
                    isSelected
                      ? "bg-cell-active"
                      : inWord
                        ? "bg-cell-word"
                        : "bg-cell"
                  } ${wrong ? "text-wrong" : "text-cell-ink"}`}
                  style={{ fontSize: `min(${Math.min(58 / width, 6.5)}cqw, 26px)` }}
                >
                  {number !== undefined && (
                    <span
                      aria-hidden
                      className="absolute top-0 start-0.5 font-mono font-normal text-ink-soft"
                      style={{ fontSize: `min(${Math.min(26 / width, 2.6)}cqw, 11px)` }}
                    >
                      {number}
                    </span>
                  )}
                  <span aria-hidden>{cell.letter}</span>

                  {/* State glyphs: shape, never color alone. */}
                  {wrong && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top right, transparent 46%, var(--wrong) 46%, var(--wrong) 54%, transparent 54%)",
                        opacity: 0.75,
                      }}
                    />
                  )}
                  {revealed && (
                    <span
                      aria-hidden
                      className="absolute bottom-0.5 end-0.5 size-1.5 rounded-full bg-revealed"
                    />
                  )}
                  {confirmed && !solved && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 end-0.5 font-mono text-[9px] leading-none text-correct"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
