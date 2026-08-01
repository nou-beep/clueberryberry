import { describe, expect, it } from "vitest";
import { validatePuzzle } from "@/lib/crossword/validate";
import type { EntryDef, PuzzleDef } from "@/lib/crossword/types";

const entry = (
  direction: "across" | "down",
  row: number,
  column: number,
  answer: string,
  clue: string,
  number: number,
  extra: Partial<EntryDef> = {}
): EntryDef => ({
  number,
  direction,
  row,
  column,
  answer,
  clue,
  clueStyle: "definition",
  ...extra,
});

const base = (overrides: Partial<PuzzleDef> = {}): PuzzleDef => ({
  slug: "test",
  title: "Test",
  language: "en",
  subject: "biology",
  topic: "human-anatomy",
  difficulty: "easy",
  width: 5,
  height: 5,
  author: "Desk",
  entries: [
    entry("across", 0, 0, "HEART", "Beating organ", 1),
    entry("down", 0, 2, "APRIL", "Spring month", 2),
  ],
  ...overrides,
});

describe("validatePuzzle", () => {
  it("passes a clean puzzle", () => {
    const result = validatePuzzle(base());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("flags crossing conflicts", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Beating organ", 1),
          entry("down", 0, 2, "TIGER", "Striped cat", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "grid_conflict")).toBe(true);
  });

  it("flags wrong numbering", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Beating organ", 1),
          entry("down", 0, 2, "APRIL", "Spring month", 7),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "wrong_number")).toBe(true);
  });

  it("flags duplicate answers and clues", () => {
    const result = validatePuzzle(
      base({
        width: 7,
        height: 7,
        entries: [
          entry("across", 0, 0, "ARM", "Limb", 1),
          entry("down", 0, 0, "APE", "Limb", 1),
          entry("across", 2, 0, "EAR", "Hearing organ", 3),
          entry("down", 0, 2, "MARM", "x", 2), // M-A-R-M crosses ARM.M and EAR.R
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "duplicate_clue")).toBe(true);
  });

  it("flags missing clues and two-letter answers", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "", 1),
          entry("down", 0, 2, "AT", "Preposition", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "missing_clue")).toBe(true);
    expect(result.errors.some((i) => i.code === "two_letter_answer")).toBe(true);
  });

  it("flags the answer appearing in its own clue", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Your heart, basically", 1),
          entry("down", 0, 2, "APRIL", "Spring month", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "answer_in_clue")).toBe(true);
  });

  it("flags obvious derivatives of the answer in the clue", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Hearts, singular", 1),
          entry("down", 0, 2, "APRIL", "Spring month", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "answer_in_clue")).toBe(true);
  });

  it("flags accepted alternatives with wrong length", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Beating organ", 1, {
            acceptedAlternatives: ["HEARTS"],
          }),
          entry("down", 0, 2, "APRIL", "Spring month", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "bad_alternative")).toBe(true);
  });

  it("flags slots that have no entry", () => {
    // Two adjacent parallel across words create phantom 2-cell vertical slots.
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "HEART", "Beating organ", 1),
          entry("across", 1, 0, "BEATS", "Rhythm units", 6),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "slot_without_entry")).toBe(true);
  });

  it("flags disconnected grids", () => {
    const result = validatePuzzle(
      base({
        entries: [
          entry("across", 0, 0, "ARM", "Limb", 1),
          entry("across", 4, 0, "EAR", "It hears", 2),
        ],
      })
    );
    expect(result.errors.some((i) => i.code === "disconnected")).toBe(true);
  });

  it("flags broken symmetry only when enabled", () => {
    const def = base({ symmetry: true });
    const result = validatePuzzle(def);
    expect(result.errors.some((i) => i.code === "asymmetric")).toBe(true);
    expect(
      validatePuzzle({ ...def, symmetry: false }).errors.some(
        (i) => i.code === "asymmetric"
      )
    ).toBe(false);
  });

  it("warns on a single theme entry and inconsistent difficulty", () => {
    const result = validatePuzzle(
      base({
        difficulty: "hard",
        entries: [
          entry("across", 0, 0, "HEART", "Beating organ", 1, {
            isThemeEntry: true,
            difficultyRating: 1,
          }),
          entry("down", 0, 2, "APRIL", "Spring month", 2, { difficultyRating: 1 }),
          entry("down", 0, 4, "TORSO", "Trunk", 3),
          entry("across", 4, 2, "LEO", "Zodiac lion", 4, { difficultyRating: 1 }),
        ],
      })
    );
    expect(result.warnings.some((i) => i.code === "lonely_theme")).toBe(true);
    expect(result.warnings.some((i) => i.code === "difficulty_inconsistent")).toBe(
      true
    );
  });
});
