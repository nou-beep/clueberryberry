import { describe, expect, it } from "vitest";
import { emptyAttempt, entryIsCorrect, summarizeAttempt } from "@/lib/crossword/attempt";
import { buildGridFromEntries } from "@/lib/crossword/grid";
import type { EntryDef } from "@/lib/crossword/types";

const entries: EntryDef[] = [
  {
    number: 1,
    direction: "across",
    row: 0,
    column: 0,
    answer: "HEART",
    clue: "x",
    clueStyle: "definition",
  },
  {
    number: 2,
    direction: "down",
    row: 0,
    column: 2,
    answer: "APRIL",
    clue: "y",
    clueStyle: "definition",
  },
];

const grid = buildGridFromEntries({
  width: 5,
  height: 5,
  language: "en",
  entries,
});

function typed(letters: Array<[number, number, string]>) {
  const state = emptyAttempt(5, 5);
  for (const [r, c, letter] of letters) state.cells[r][c].letter = letter;
  return state;
}

const fullSolve: Array<[number, number, string]> = [
  [0, 0, "H"],
  [0, 1, "E"],
  [0, 2, "A"],
  [0, 3, "R"],
  [0, 4, "T"],
  [1, 2, "P"],
  [2, 2, "R"],
  [3, 2, "I"],
  [4, 2, "L"],
];

describe("summarizeAttempt", () => {
  it("reports an empty attempt", () => {
    const s = summarizeAttempt(emptyAttempt(5, 5), grid, entries, "en");
    expect(s.open).toBe(9);
    expect(s.filled).toBe(0);
    expect(s.percentage).toBe(0);
    expect(s.solved).toBe(false);
  });

  it("detects a completed solve", () => {
    const s = summarizeAttempt(typed(fullSolve), grid, entries, "en");
    expect(s.percentage).toBe(100);
    expect(s.solved).toBe(true);
  });

  it("rejects a filled-but-wrong grid", () => {
    const wrong = fullSolve.map(
      ([r, c, l]) => [r, c, r === 4 ? "X" : l] as [number, number, string]
    );
    const s = summarizeAttempt(typed(wrong), grid, entries, "en");
    expect(s.percentage).toBe(100);
    expect(s.solved).toBe(false);
  });

  it("accepts lowercase input", () => {
    const lower = fullSolve.map(
      ([r, c, l]) => [r, c, l.toLowerCase()] as [number, number, string]
    );
    expect(summarizeAttempt(typed(lower), grid, entries, "en").solved).toBe(true);
  });
});

describe("entryIsCorrect with alternatives", () => {
  it("accepts a whole-word accepted alternative", () => {
    const altEntries: EntryDef[] = [
      {
        number: 1,
        direction: "across",
        row: 0,
        column: 0,
        answer: "COLOR",
        clue: "x",
        clueStyle: "definition",
        acceptedAlternatives: ["COLOR"], // same length only; different spelling scenario below
      },
    ];
    const st = typed([
      [0, 0, "C"],
      [0, 1, "O"],
      [0, 2, "L"],
      [0, 3, "O"],
      [0, 4, "R"],
    ]);
    expect(entryIsCorrect(st, altEntries[0], "en")).toBe(true);
  });

  it("accepts Arabic variant listed per answer", () => {
    const arEntry: EntryDef = {
      number: 1,
      direction: "across",
      row: 0,
      column: 0,
      answer: "ذاكرة",
      clue: "x",
      clueStyle: "definition",
      acceptedAlternatives: ["ذاكره"],
    };
    const st = emptyAttempt(5, 1);
    const letters = ["ذ", "ا", "ك", "ر", "ه"];
    letters.forEach((l, i) => (st.cells[0][i].letter = l));
    expect(entryIsCorrect(st, arEntry, "ar")).toBe(true);
  });

  it("rejects unlisted Arabic variants", () => {
    const arEntry: EntryDef = {
      number: 1,
      direction: "across",
      row: 0,
      column: 0,
      answer: "ذاكرة",
      clue: "x",
      clueStyle: "definition",
    };
    const st = emptyAttempt(5, 1);
    const letters = ["ذ", "ا", "ك", "ر", "ه"];
    letters.forEach((l, i) => (st.cells[0][i].letter = l));
    expect(entryIsCorrect(st, arEntry, "ar")).toBe(false);
  });
});
