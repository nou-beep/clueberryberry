import {
  buildGridFromEntries,
  cellEntryMap,
  hasRotationalSymmetry,
  isConnected,
  numberGrid,
} from "./grid";
import { answerToCells, normalizeAnswer } from "./normalize";
import type { Grid, PuzzleDef, ValidationIssue } from "./types";
import { cellKey } from "./types";

const err = (
  code: string,
  message: string,
  extra?: Partial<ValidationIssue>
): ValidationIssue => ({ severity: "error", code, message, ...extra });

const warn = (
  code: string,
  message: string,
  extra?: Partial<ValidationIssue>
): ValidationIssue => ({ severity: "warning", code, message, ...extra });

/** Strip punctuation and split a clue into comparable word tokens. */
function clueTokens(clue: string, language: string): string[] {
  const cleaned = clue
    .toLowerCase()
    .replace(/[«»“”"'’…—–:;,.?!()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(" ").filter((w) => w.length > (language === "ar" ? 1 : 2));
}

/** Detect the answer or an obvious derivative appearing inside its own clue. */
function clueLeaksAnswer(
  answer: string,
  clue: string,
  language: PuzzleDef["language"]
): boolean {
  const norm = (s: string) => normalizeAnswer(s, language).toLowerCase();
  const a = norm(answer);
  if (a.length < 3) return false;
  for (const token of clueTokens(clue, language)) {
    const t = norm(token);
    if (t.length < 3) continue;
    // exact word, or shared stem (one contains the other with ≥5 chars overlap)
    if (t === a) return true;
    if (a.length >= 5 && (t.startsWith(a.slice(0, 5)) || a.startsWith(t.slice(0, 5)))) {
      if (t.includes(a) || a.includes(t)) return true;
    }
  }
  return false;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  grid?: Grid;
  valid: boolean;
}

/**
 * Full editorial validation for a puzzle definition.
 * Checks structure (grid/entries agreement, numbering, connectivity) and
 * editorial quality (duplicates, leaked answers, difficulty consistency).
 */
export function validatePuzzle(
  def: PuzzleDef,
  options: { allowTwoLetterAnswers?: boolean } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let grid: Grid | undefined;

  // 1. Grid can be built from entries without crossing conflicts.
  try {
    grid = buildGridFromEntries(def);
  } catch (e) {
    issues.push(err("grid_conflict", (e as Error).message));
  }

  // If an explicit grid was provided, it must agree with the derived one.
  if (grid && def.grid) {
    outer: for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const a = def.grid[r]?.[c] ?? null;
        const b = grid[r][c];
        const an = a === null ? null : normalizeAnswer(a, def.language, def.normalization);
        if (an !== b) {
          issues.push(
            err(
              "grid_mismatch",
              `Grid data disagrees with entries at r${r},c${c} ("${a}" vs "${b}")`,
              { cell: { row: r, column: c } }
            )
          );
          break outer;
        }
      }
    }
  }

  const seenAnswers = new Map<string, string>();
  const seenClues = new Map<string, string>();

  for (const entry of def.entries) {
    const label = { entry: { number: entry.number, direction: entry.direction } };
    const letters = answerToCells(entry.answer, def.language, def.normalization);

    if (!entry.clue || entry.clue.trim().length === 0) {
      issues.push(err("missing_clue", `"${entry.answer}" has no clue`, label));
    }
    if (letters.length === 2 && !options.allowTwoLetterAnswers) {
      issues.push(err("two_letter_answer", `"${entry.answer}" is a two-letter answer`, label));
    }

    const normAnswer = letters.join("");
    const priorAnswer = seenAnswers.get(normAnswer);
    if (priorAnswer) {
      issues.push(
        err("duplicate_answer", `"${entry.answer}" appears more than once`, label)
      );
    }
    seenAnswers.set(normAnswer, entry.answer);

    const clueNorm = entry.clue.trim().toLowerCase();
    if (clueNorm) {
      const prior = seenClues.get(clueNorm);
      if (prior) {
        issues.push(
          err("duplicate_clue", `Clue "${entry.clue}" is used for both "${prior}" and "${entry.answer}"`, label)
        );
      }
      seenClues.set(clueNorm, entry.answer);
    }

    if (clueLeaksAnswer(entry.answer, entry.clue, def.language)) {
      issues.push(
        err(
          "answer_in_clue",
          `Clue for "${entry.answer}" contains the answer or an obvious derivative`,
          label
        )
      );
    }

    for (const alt of entry.acceptedAlternatives ?? []) {
      const altCells = answerToCells(alt, def.language, def.normalization);
      if (altCells.length !== letters.length) {
        issues.push(
          err(
            "bad_alternative",
            `Alternative "${alt}" for "${entry.answer}" has length ${altCells.length}, expected ${letters.length}`,
            label
          )
        );
      }
    }

    if (
      entry.difficultyRating !== undefined &&
      (entry.difficultyRating < 1 || entry.difficultyRating > 5)
    ) {
      issues.push(err("bad_difficulty_rating", `Difficulty rating must be 1-5`, label));
    }
  }

  if (grid) {
    // 2. Numbering agreement: every slot in the grid must be claimed by
    //    exactly one entry with matching number/length, and vice versa.
    const { numbers, slots } = numberGrid(grid);
    const slotKey = (d: string, r: number, c: number) => `${d}:${r},${c}`;
    const slotMap = new Map(slots.map((s) => [slotKey(s.direction, s.row, s.column), s]));

    for (const entry of def.entries) {
      const letters = answerToCells(entry.answer, def.language, def.normalization);
      const slot = slotMap.get(slotKey(entry.direction, entry.row, entry.column));
      const label = { entry: { number: entry.number, direction: entry.direction } };
      if (!slot) {
        issues.push(
          err(
            "entry_not_a_slot",
            `"${entry.answer}" (${entry.direction}) does not start at a valid slot — check surrounding blocks`,
            label
          )
        );
        continue;
      }
      if (slot.length !== letters.length) {
        issues.push(
          err(
            "length_mismatch",
            `"${entry.answer}" has ${letters.length} letters but its slot runs ${slot.length} cells`,
            label
          )
        );
      }
      const expectedNumber = numbers.get(cellKey(entry.row, entry.column));
      if (expectedNumber !== entry.number) {
        issues.push(
          err(
            "wrong_number",
            `"${entry.answer}" is numbered ${entry.number} but grid numbering gives ${expectedNumber ?? "none"}`,
            label
          )
        );
      }
      slotMap.delete(slotKey(entry.direction, entry.row, entry.column));
    }
    for (const orphan of slotMap.values()) {
      issues.push(
        err(
          "slot_without_entry",
          `Grid contains a ${orphan.length}-cell ${orphan.direction} slot at r${orphan.row},c${orphan.column} with no entry`,
          { cell: { row: orphan.row, column: orphan.column } }
        )
      );
    }

    // 3. Every open square belongs to at least one entry.
    const covered = cellEntryMap(def);
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        if (grid[r][c] !== null && !covered.has(cellKey(r, c))) {
          issues.push(
            err("uncovered_cell", `Open cell r${r},c${c} belongs to no entry`, {
              cell: { row: r, column: c },
            })
          );
        }
      }
    }

    if (!isConnected(grid)) {
      issues.push(err("disconnected", "The grid has disconnected areas"));
    }
    if (def.symmetry && !hasRotationalSymmetry(grid)) {
      issues.push(
        err("asymmetric", "Rotational symmetry is enabled but the block pattern is not symmetric")
      );
    }
  }

  // 4. Theme + difficulty consistency (editorial warnings).
  const themeCount = def.entries.filter((e) => e.isThemeEntry).length;
  if (themeCount === 1) {
    issues.push(warn("lonely_theme", "Only one entry is marked as a theme entry"));
  }
  const ratings = def.entries
    .map((e) => e.difficultyRating)
    .filter((r): r is number => r !== undefined);
  if (ratings.length >= 3) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const expected = { easy: [1, 2.4], medium: [2, 3.6], hard: [2.8, 5] }[def.difficulty];
    if (avg < expected[0] || avg > expected[1]) {
      issues.push(
        warn(
          "difficulty_inconsistent",
          `Average entry difficulty ${avg.toFixed(1)} sits outside the expected range for a ${def.difficulty} puzzle`
        )
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return {
    issues,
    errors,
    warnings: issues.filter((i) => i.severity === "warning"),
    grid,
    valid: errors.length === 0,
  };
}
