import { answerToCells } from "./normalize";
import type {
  Direction,
  EntryDef,
  Grid,
  NumberedGrid,
  PuzzleDef,
  Slot,
} from "./types";
import { cellKey } from "./types";

export function isOpen(grid: Grid, row: number, col: number): boolean {
  return (
    row >= 0 &&
    col >= 0 &&
    row < grid.length &&
    col < (grid[0]?.length ?? 0) &&
    grid[row][col] !== null
  );
}

/**
 * Standard crossword numbering: scan row-major; a cell gets a number if it
 * starts an across slot (no open cell before it, at least one after) or a
 * down slot. Slots shorter than minLength are ignored (isolated letters that
 * belong only to the crossing direction).
 */
export function numberGrid(grid: Grid, minLength = 2): NumberedGrid {
  const numbers = new Map<string, number>();
  const slots: Slot[] = [];
  let n = 0;
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const runLength = (row: number, col: number, dir: Direction): number => {
    let len = 0;
    let r = row;
    let c = col;
    while (isOpen(grid, r, c)) {
      len++;
      if (dir === "across") c++;
      else r++;
    }
    return len;
  };

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!isOpen(grid, row, col)) continue;
      const startsAcross =
        !isOpen(grid, row, col - 1) && runLength(row, col, "across") >= minLength;
      const startsDown =
        !isOpen(grid, row - 1, col) && runLength(row, col, "down") >= minLength;
      if (!startsAcross && !startsDown) continue;
      n++;
      numbers.set(cellKey(row, col), n);
      if (startsAcross) {
        slots.push({
          number: n,
          direction: "across",
          row,
          column: col,
          length: runLength(row, col, "across"),
        });
      }
      if (startsDown) {
        slots.push({
          number: n,
          direction: "down",
          row,
          column: col,
          length: runLength(row, col, "down"),
        });
      }
    }
  }
  return { numbers, slots };
}

export function entryCells(
  entry: Pick<EntryDef, "row" | "column" | "direction">,
  length: number
): Array<{ row: number; column: number }> {
  return Array.from({ length }, (_, i) => ({
    row: entry.direction === "down" ? entry.row + i : entry.row,
    column: entry.direction === "across" ? entry.column + i : entry.column,
  }));
}

/**
 * Build a solution grid from entry placements. Throws on crossing conflicts
 * or out-of-bounds placements — used by the seed pipeline and JSON import so
 * hand-authored puzzles fail loudly instead of shipping broken crossings.
 */
export function buildGridFromEntries(
  def: Pick<PuzzleDef, "width" | "height" | "entries" | "language" | "normalization">
): Grid {
  const grid: Grid = Array.from({ length: def.height }, () =>
    Array.from({ length: def.width }, () => null)
  );
  for (const entry of def.entries) {
    const letters = answerToCells(entry.answer, def.language, def.normalization);
    if (letters.length < 2) {
      throw new Error(`Entry "${entry.answer}" is shorter than 2 letters`);
    }
    const cells = entryCells(entry, letters.length);
    for (let i = 0; i < letters.length; i++) {
      const { row, column } = cells[i];
      if (row < 0 || column < 0 || row >= def.height || column >= def.width) {
        throw new Error(
          `Entry "${entry.answer}" (${entry.direction} at r${entry.row},c${entry.column}) leaves the ${def.width}x${def.height} grid`
        );
      }
      const existing = grid[row][column];
      if (existing !== null && existing !== letters[i]) {
        throw new Error(
          `Crossing conflict at r${row},c${column}: "${existing}" vs "${letters[i]}" from "${entry.answer}"`
        );
      }
      grid[row][column] = letters[i];
    }
  }
  return grid;
}

/** Map each open cell to the entries passing through it. */
export function cellEntryMap(
  def: Pick<PuzzleDef, "entries" | "language" | "normalization">
): Map<string, { across?: EntryDef; down?: EntryDef }> {
  const map = new Map<string, { across?: EntryDef; down?: EntryDef }>();
  for (const entry of def.entries) {
    const letters = answerToCells(entry.answer, def.language, def.normalization);
    for (const { row, column } of entryCells(entry, letters.length)) {
      const key = cellKey(row, column);
      const existing = map.get(key) ?? {};
      existing[entry.direction] = entry;
      map.set(key, existing);
    }
  }
  return map;
}

/** True when every open cell is reachable from every other via open orthogonal steps. */
export function isConnected(grid: Grid): boolean {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  let start: [number, number] | null = null;
  let openCount = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] !== null) {
        openCount++;
        if (!start) start = [r, c];
      }
    }
  }
  if (!start) return true;
  const seen = new Set<string>([cellKey(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [r, c] = queue.pop()!;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (isOpen(grid, nr, nc) && !seen.has(cellKey(nr, nc))) {
        seen.add(cellKey(nr, nc));
        queue.push([nr, nc]);
      }
    }
  }
  return seen.size === openCount;
}

/** 180° rotational symmetry of the block pattern. */
export function hasRotationalSymmetry(grid: Grid): boolean {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const a = grid[r][c] === null;
      const b = grid[height - 1 - r][width - 1 - c] === null;
      if (a !== b) return false;
    }
  }
  return true;
}
