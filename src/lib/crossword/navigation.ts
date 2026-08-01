import { entryCells, isOpen } from "./grid";
import { answerToCells } from "./normalize";
import type {
  Direction,
  EntryDef,
  Grid,
  NormalizationRules,
  PuzzleLanguage,
} from "./types";
import { cellKey } from "./types";

export interface Selection {
  row: number;
  column: number;
  direction: Direction;
}

export interface NavContext {
  grid: Grid;
  entries: EntryDef[];
  language: PuzzleLanguage;
  normalization?: Partial<NormalizationRules>;
}

export function entryLength(ctx: NavContext, entry: EntryDef): number {
  return answerToCells(entry.answer, ctx.language, ctx.normalization).length;
}

export function entryAt(
  ctx: NavContext,
  row: number,
  column: number,
  direction: Direction
): EntryDef | null {
  for (const entry of ctx.entries) {
    if (entry.direction !== direction) continue;
    const len = entryLength(ctx, entry);
    if (
      direction === "across" &&
      entry.row === row &&
      column >= entry.column &&
      column < entry.column + len
    ) {
      return entry;
    }
    if (
      direction === "down" &&
      entry.column === column &&
      row >= entry.row &&
      row < entry.row + len
    ) {
      return entry;
    }
  }
  return null;
}

/** Entries sorted for Tab navigation: all across by number, then all down. */
export function orderedEntries(entries: EntryDef[]): EntryDef[] {
  return [...entries].sort((a, b) =>
    a.direction === b.direction
      ? a.number - b.number
      : a.direction === "across"
        ? -1
        : 1
  );
}

export function selectionForEntry(entry: EntryDef): Selection {
  return { row: entry.row, column: entry.column, direction: entry.direction };
}

/** Clamp a selection to the entry's first empty cell, if any. */
export function firstEmptyCell(
  ctx: NavContext,
  entry: EntryDef,
  letters: string[][]
): Selection {
  const cells = entryCells(entry, entryLength(ctx, entry));
  const empty = cells.find(({ row, column }) => !letters[row][column]);
  const target = empty ?? cells[0];
  return { row: target.row, column: target.column, direction: entry.direction };
}

export function nextEntry(
  ctx: NavContext,
  selection: Selection,
  step: 1 | -1
): EntryDef | null {
  const ordered = orderedEntries(ctx.entries);
  if (ordered.length === 0) return null;
  const current = entryAt(ctx, selection.row, selection.column, selection.direction);
  const idx = current
    ? ordered.findIndex(
        (e) => e.number === current.number && e.direction === current.direction
      )
    : -1;
  const nextIdx = (idx + step + ordered.length) % ordered.length;
  return ordered[nextIdx];
}

/**
 * Move one cell in a *visual* direction. `visualDx` is +1 for the key that
 * points toward the end of a row on screen; for RTL grids the caller maps
 * ArrowLeft/ArrowRight so that motion follows the screen, while the logical
 * column order (0 = first letter) stays language-agnostic.
 */
export function moveSelection(
  ctx: NavContext,
  selection: Selection,
  dRow: number,
  dCol: number
): Selection {
  let { row, column } = selection;
  const height = ctx.grid.length;
  const width = ctx.grid[0]?.length ?? 0;
  // Skip over blocks; stop at the border.
  for (let step = 0; step < Math.max(width, height); step++) {
    row += dRow;
    column += dCol;
    if (row < 0 || column < 0 || row >= height || column >= width) {
      return selection;
    }
    if (isOpen(ctx.grid, row, column)) {
      return { ...selection, row, column };
    }
  }
  return selection;
}

/** Advance within the current entry after typing (to the next empty cell first). */
export function advanceAfterType(
  ctx: NavContext,
  selection: Selection,
  letters: string[][]
): Selection {
  const entry = entryAt(ctx, selection.row, selection.column, selection.direction);
  if (!entry) return selection;
  const cells = entryCells(entry, entryLength(ctx, entry));
  const idx = cells.findIndex(
    (c) => c.row === selection.row && c.column === selection.column
  );
  // Prefer the next empty cell after the cursor within this entry.
  for (let i = idx + 1; i < cells.length; i++) {
    if (!letters[cells[i].row][cells[i].column]) {
      return { ...selection, row: cells[i].row, column: cells[i].column };
    }
  }
  // Otherwise just the next cell, or stay at the end.
  if (idx + 1 < cells.length) {
    return { ...selection, row: cells[idx + 1].row, column: cells[idx + 1].column };
  }
  return selection;
}

/** Backspace: clear current cell, or step back within the entry when already empty. */
export function retreatSelection(ctx: NavContext, selection: Selection): Selection {
  const entry = entryAt(ctx, selection.row, selection.column, selection.direction);
  if (!entry) return selection;
  const cells = entryCells(entry, entryLength(ctx, entry));
  const idx = cells.findIndex(
    (c) => c.row === selection.row && c.column === selection.column
  );
  if (idx > 0) {
    return { ...selection, row: cells[idx - 1].row, column: cells[idx - 1].column };
  }
  return selection;
}

/** Preferred direction when clicking a cell fresh: an entry must exist there. */
export function resolveSelection(
  ctx: NavContext,
  row: number,
  column: number,
  preferred: Direction
): Selection | null {
  if (!isOpen(ctx.grid, row, column)) return null;
  if (entryAt(ctx, row, column, preferred)) return { row, column, direction: preferred };
  const other: Direction = preferred === "across" ? "down" : "across";
  if (entryAt(ctx, row, column, other)) return { row, column, direction: other };
  return null;
}

export function cellsOfEntry(ctx: NavContext, entry: EntryDef) {
  return entryCells(entry, entryLength(ctx, entry));
}

export function entryCellKeys(ctx: NavContext, entry: EntryDef): Set<string> {
  return new Set(cellsOfEntry(ctx, entry).map((c) => cellKey(c.row, c.column)));
}
