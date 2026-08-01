import { entryCells } from "@/lib/crossword/grid";
import { answerToCells, normalizeAnswer } from "@/lib/crossword/normalize";
import type { Direction, EntryDef } from "@/lib/crossword/types";
import { validatePuzzle } from "@/lib/crossword/validate";
import { bankFor, type PlaygroundTheme } from "./banks";
import { createRng } from "./generate";
import { toPuzzleDef, type PlaygroundDefinition } from "./definition";

/**
 * Post-generation editing.
 *
 * Every operation returns a *new* definition and re-runs the full editorial
 * validator before handing it back. An edit that would make the puzzle
 * unsolvable is refused with the check that caught it — the same rule as
 * generation: nothing is playable until it is valid.
 */

export type EditFailure =
  /** No entry with that number and direction. */
  | "no_such_entry"
  /** A clue must not be empty. */
  | "empty_clue"
  /** The replacement answer is a different length from the one in the grid. */
  | "wrong_length"
  /** The replacement disagrees with a letter a crossing entry already fixes. */
  | "crossing_conflict"
  /** The word bank has no other clue for this answer. */
  | "no_other_clue"
  /** The edit produced a puzzle the validator rejects. */
  | "validation_failed";

export type EditResult =
  | { ok: true; definition: PlaygroundDefinition }
  | { ok: false; code: EditFailure; messages?: string[] };

export interface EntryRef {
  number: number;
  direction: Direction;
}

const sameEntry = (entry: EntryDef, ref: EntryRef) =>
  entry.number === ref.number && entry.direction === ref.direction;

/** Re-derive the grid from the entries, so an answer change moves the letters. */
function rebuildGrid(definition: PlaygroundDefinition): PlaygroundDefinition {
  const grid: (string | null)[][] = Array.from({ length: definition.height }, () =>
    Array.from({ length: definition.width }, () => null)
  );
  for (const entry of definition.entries) {
    const letters = answerToCells(entry.answer, definition.language);
    entryCells(entry, letters.length).forEach(({ row, column }, index) => {
      if (grid[row]?.[column] !== undefined) grid[row][column] = letters[index];
    });
  }
  return { ...definition, grid };
}

/** Validate, or report the errors in the caller's language-neutral codes. */
function sealed(definition: PlaygroundDefinition): EditResult {
  const rebuilt = rebuildGrid(definition);
  const result = validatePuzzle(toPuzzleDef(rebuilt));
  if (!result.valid) {
    return {
      ok: false,
      code: "validation_failed",
      messages: result.errors.map((issue) => issue.code),
    };
  }
  return { ok: true, definition: rebuilt };
}

/** Rename the puzzle. The only edit that cannot invalidate the grid. */
export function rename(definition: PlaygroundDefinition, title: string): EditResult {
  const trimmed = title.trim().slice(0, 120);
  if (trimmed.length === 0) return { ok: false, code: "empty_clue" };
  return sealed({ ...definition, title: trimmed });
}

/** Rewrite one clue by hand. */
export function setClue(
  definition: PlaygroundDefinition,
  ref: EntryRef,
  clue: string
): EditResult {
  const trimmed = clue.trim().slice(0, 400);
  if (trimmed.length === 0) return { ok: false, code: "empty_clue" };
  if (!definition.entries.some((entry) => sameEntry(entry, ref))) {
    return { ok: false, code: "no_such_entry" };
  }
  return sealed({
    ...definition,
    entries: definition.entries.map((entry) =>
      sameEntry(entry, ref) ? { ...entry, clue: trimmed } : entry
    ),
  });
}

/**
 * The letters a crossing entry already fixes, as an array of letter-or-null.
 * The editor shows this so a replacement answer can be typed against the shape
 * of the slot rather than guessed and rejected.
 */
export function answerPattern(
  definition: PlaygroundDefinition,
  ref: EntryRef
): Array<string | null> {
  const target = definition.entries.find((entry) => sameEntry(entry, ref));
  if (!target) return [];
  const length = answerToCells(target.answer, definition.language).length;
  const fixed = new Map<string, string>();
  for (const entry of definition.entries) {
    if (sameEntry(entry, ref)) continue;
    const letters = answerToCells(entry.answer, definition.language);
    entryCells(entry, letters.length).forEach(({ row, column }, index) => {
      fixed.set(`${row},${column}`, letters[index]);
    });
  }
  return entryCells(target, length).map(
    ({ row, column }) => fixed.get(`${row},${column}`) ?? null
  );
}

/** Swap in a different answer. Must fit the slot and agree with every crossing. */
export function setAnswer(
  definition: PlaygroundDefinition,
  ref: EntryRef,
  answer: string
): EditResult {
  const target = definition.entries.find((entry) => sameEntry(entry, ref));
  if (!target) return { ok: false, code: "no_such_entry" };

  const normalized = normalizeAnswer(answer.trim(), definition.language);
  const letters = answerToCells(normalized, definition.language);
  const existing = answerToCells(target.answer, definition.language);
  if (letters.length !== existing.length) return { ok: false, code: "wrong_length" };

  const pattern = answerPattern(definition, ref);
  for (let i = 0; i < letters.length; i++) {
    const fixed = pattern[i];
    if (fixed !== null && fixed !== undefined && fixed !== letters[i]) {
      return { ok: false, code: "crossing_conflict" };
    }
  }

  return sealed({
    ...definition,
    entries: definition.entries.map((entry) =>
      sameEntry(entry, ref)
        ? {
            ...entry,
            answer: normalized,
            // The old explanation described the old word.
            explanation: undefined,
            acceptedAlternatives: undefined,
          }
        : entry
    ),
  });
}

/** Clues the curated bank offers for an answer, minus the ones already in use. */
function alternativeClues(
  definition: PlaygroundDefinition,
  theme: PlaygroundTheme | null,
  entry: EntryDef
): string[] {
  if (!theme) return [];
  const inUse = new Set(definition.entries.map((item) => item.clue.toLowerCase()));
  const word = bankFor(definition.language, theme).find(
    (candidate) =>
      answerToCells(candidate.answer, definition.language).join("") ===
      answerToCells(entry.answer, definition.language).join("")
  );
  if (!word) return [];
  return word.clues.filter(
    (clue) => clue.trim().length > 0 && !inUse.has(clue.toLowerCase())
  );
}

/**
 * Ask the bank for a different clue for one entry. Fails honestly when the bank
 * has nothing else to offer rather than paraphrasing the clue it already wrote.
 */
export function regenerateClue(
  definition: PlaygroundDefinition,
  ref: EntryRef,
  theme: PlaygroundTheme | null,
  seed: number
): EditResult {
  const entry = definition.entries.find((item) => sameEntry(item, ref));
  if (!entry) return { ok: false, code: "no_such_entry" };
  const options = alternativeClues(definition, theme, entry);
  if (options.length === 0) return { ok: false, code: "no_other_clue" };
  const rng = createRng(seed);
  return setClue(definition, ref, options[rng.int(options.length)]);
}

/**
 * Rewrite every clue in one direction — the "regenerate this section" action.
 * Entries the bank cannot re-clue keep the clue they have; the caller is told
 * how many actually changed so the interface can report a real number.
 */
export function regenerateSection(
  definition: PlaygroundDefinition,
  direction: Direction,
  theme: PlaygroundTheme | null,
  seed: number
): EditResult & { changed?: number } {
  const rng = createRng(seed);
  let working = definition;
  let changed = 0;
  for (const entry of definition.entries.filter((item) => item.direction === direction)) {
    const ref = { number: entry.number, direction };
    const options = alternativeClues(working, theme, entry);
    if (options.length === 0) continue;
    const attempt = setClue(working, ref, options[rng.int(options.length)]);
    if (attempt.ok) {
      working = attempt.definition;
      changed++;
    }
  }
  if (changed === 0) return { ok: false, code: "no_other_clue", changed: 0 };
  return { ...sealed(working), changed };
}
