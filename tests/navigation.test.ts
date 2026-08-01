import { describe, expect, it } from "vitest";
import { buildGridFromEntries } from "@/lib/crossword/grid";
import {
  advanceAfterType,
  entryAt,
  moveSelection,
  nextEntry,
  resolveSelection,
  retreatSelection,
  type NavContext,
} from "@/lib/crossword/navigation";
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
  {
    number: 3,
    direction: "across",
    row: 2,
    column: 1,
    answer: "ORB",
    clue: "z",
    clueStyle: "definition",
  },
];

// H E A R T
// . . P . .
// . O R B .
// . . I . .
// . . L . .
const ctx: NavContext = {
  grid: buildGridFromEntries({ width: 5, height: 5, language: "en", entries }),
  entries,
  language: "en",
};

const emptyLetters = Array.from({ length: 5 }, () => Array(5).fill(""));

describe("navigation", () => {
  it("finds the entry through a cell in each direction", () => {
    expect(entryAt(ctx, 0, 2, "across")?.answer).toBe("HEART");
    expect(entryAt(ctx, 0, 2, "down")?.answer).toBe("APRIL");
    expect(entryAt(ctx, 2, 1, "down")).toBeNull();
  });

  it("resolves clicks, falling back to the available direction", () => {
    expect(resolveSelection(ctx, 2, 1, "down")).toEqual({
      row: 2,
      column: 1,
      direction: "across",
    });
    expect(resolveSelection(ctx, 1, 1, "across")).toBeNull(); // block
  });

  it("moves across blocks when arrowing", () => {
    // From (0,2) moving down: next open in column 2 is (1,2).
    const sel = moveSelection(ctx, { row: 0, column: 2, direction: "down" }, 1, 0);
    expect(sel).toMatchObject({ row: 1, column: 2 });
    // From (0,4) moving down there is nothing below: stays put.
    const stay = moveSelection(ctx, { row: 0, column: 4, direction: "down" }, 1, 0);
    expect(stay).toMatchObject({ row: 0, column: 4 });
  });

  it("advances to the next empty cell after typing", () => {
    const letters = emptyLetters.map((r) => [...r]);
    letters[0][1] = "E"; // pre-filled
    const sel = advanceAfterType(
      ctx,
      { row: 0, column: 0, direction: "across" },
      letters
    );
    expect(sel).toMatchObject({ row: 0, column: 2 }); // skips filled (0,1)
  });

  it("retreats within the entry on backspace", () => {
    const sel = retreatSelection(ctx, { row: 0, column: 2, direction: "across" });
    expect(sel).toMatchObject({ row: 0, column: 1 });
    const start = retreatSelection(ctx, { row: 0, column: 0, direction: "across" });
    expect(start).toMatchObject({ row: 0, column: 0 });
  });

  it("cycles entries with Tab in across-then-down order", () => {
    const first = { row: 0, column: 0, direction: "across" as const };
    const second = nextEntry(ctx, first, 1);
    expect(second).toMatchObject({ answer: "ORB" });
    const third = nextEntry(
      ctx,
      { row: 2, column: 1, direction: "across" },
      1
    );
    expect(third).toMatchObject({ answer: "APRIL" });
    const wrapped = nextEntry(ctx, { row: 0, column: 2, direction: "down" }, 1);
    expect(wrapped).toMatchObject({ answer: "HEART" });
    const back = nextEntry(ctx, first, -1);
    expect(back).toMatchObject({ answer: "APRIL" });
  });

  it("keeps RTL visual movement language-agnostic in the engine", () => {
    // The engine works in logical coordinates; the UI maps ArrowLeft to
    // +column for RTL. Moving +1 column from an Arabic across start goes to
    // the next letter of the word regardless of script.
    const arEntries: EntryDef[] = [
      {
        number: 1,
        direction: "across",
        row: 0,
        column: 0,
        answer: "قلب",
        clue: "x",
        clueStyle: "definition",
      },
      {
        number: 2,
        direction: "down",
        row: 0,
        column: 2,
        answer: "بحر",
        clue: "y",
        clueStyle: "definition",
      },
    ];
    const arCtx: NavContext = {
      grid: buildGridFromEntries({
        width: 3,
        height: 3,
        language: "ar",
        entries: arEntries,
      }),
      entries: arEntries,
      language: "ar",
    };
    const sel = moveSelection(arCtx, { row: 0, column: 0, direction: "across" }, 0, 1);
    expect(sel).toMatchObject({ row: 0, column: 1 });
    expect(entryAt(arCtx, 0, 2, "down")?.answer).toBe("بحر");
  });
});
