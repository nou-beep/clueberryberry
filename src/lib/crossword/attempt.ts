import { entryCells } from "./grid";
import { answerToCells, normalizeLetter } from "./normalize";
import type {
  AttemptGridState,
  EntryDef,
  Grid,
  NormalizationRules,
  PuzzleLanguage,
} from "./types";

export function emptyAttempt(width: number, height: number): AttemptGridState {
  return {
    cells: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ letter: "", flags: [] as never[] }))
    ),
  };
}

export function cellIsCorrect(
  state: AttemptGridState,
  grid: Grid,
  row: number,
  col: number,
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): boolean {
  const solution = grid[row][col];
  if (solution === null) return true;
  const typed = state.cells[row][col].letter;
  if (!typed) return false;
  return normalizeLetter(typed, language, rules) === solution;
}

export function entryIsCorrect(
  state: AttemptGridState,
  entry: EntryDef,
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): boolean {
  const letters = answerToCells(entry.answer, language, rules);
  const cells = entryCells(entry, letters.length);
  const typed = cells
    .map(({ row, column }) => state.cells[row][column].letter)
    .join("");
  if (Array.from(typed).length !== letters.length) return false;
  const normTyped = Array.from(typed)
    .map((ch) => normalizeLetter(ch, language, rules))
    .join("");
  if (normTyped === letters.join("")) return true;
  // Whole-word alternatives (e.g. accepted Arabic spelling variants).
  return (entry.acceptedAlternatives ?? []).some(
    (alt) => answerToCells(alt, language, rules).join("") === normTyped
  );
}

export interface CompletionSummary {
  filled: number;
  open: number;
  correct: number;
  percentage: number; // filled cells / open cells
  solved: boolean; // every open cell correct (or entry-level alternative match)
}

export function summarizeAttempt(
  state: AttemptGridState,
  grid: Grid,
  entries: EntryDef[],
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): CompletionSummary {
  let filled = 0;
  let open = 0;
  let correct = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === null) continue;
      open++;
      if (state.cells[r][c].letter) filled++;
      if (cellIsCorrect(state, grid, r, c, language, rules)) correct++;
    }
  }
  // Cell-exact solve, or every entry satisfied via accepted alternatives.
  const solved =
    open > 0 &&
    (correct === open ||
      (filled === open && entries.every((e) => entryIsCorrect(state, e, language, rules))));
  return {
    filled,
    open,
    correct,
    percentage: open === 0 ? 0 : Math.round((filled / open) * 100),
    solved,
  };
}
