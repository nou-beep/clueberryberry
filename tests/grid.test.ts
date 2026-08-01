import { describe, expect, it } from "vitest";
import {
  buildGridFromEntries,
  hasRotationalSymmetry,
  isConnected,
  numberGrid,
} from "@/lib/crossword/grid";
import { cellKey, type EntryDef, type Grid } from "@/lib/crossword/types";

const entry = (
  direction: "across" | "down",
  row: number,
  column: number,
  answer: string
): EntryDef => ({
  number: 0,
  direction,
  row,
  column,
  answer,
  clue: "x",
  clueStyle: "definition",
});

describe("buildGridFromEntries", () => {
  it("builds a grid with matching crossings", () => {
    const grid = buildGridFromEntries({
      width: 5,
      height: 5,
      language: "en",
      entries: [entry("across", 0, 0, "HEART"), entry("down", 0, 2, "APRIL")],
    });
    expect(grid[0]).toEqual(["H", "E", "A", "R", "T"]);
    expect(grid[1][2]).toBe("P");
    expect(grid[4][2]).toBe("L");
  });

  it("throws on crossing conflicts", () => {
    expect(() =>
      buildGridFromEntries({
        width: 5,
        height: 5,
        language: "en",
        entries: [entry("across", 0, 0, "HEART"), entry("down", 0, 2, "TIGER")],
      })
    ).toThrow(/conflict/i);
  });

  it("throws when an entry leaves the grid", () => {
    expect(() =>
      buildGridFromEntries({
        width: 4,
        height: 4,
        language: "en",
        entries: [entry("across", 0, 0, "HEART")],
      })
    ).toThrow(/leaves/);
  });
});

describe("numberGrid", () => {
  it("numbers slots in standard scan order", () => {
    // H E A R T
    // . . P . .
    // . . R . .
    // . . I . .
    // . . L . .
    const grid = buildGridFromEntries({
      width: 5,
      height: 5,
      language: "en",
      entries: [entry("across", 0, 0, "HEART"), entry("down", 0, 2, "APRIL")],
    });
    const { numbers, slots } = numberGrid(grid);
    expect(numbers.get(cellKey(0, 0))).toBe(1);
    expect(numbers.get(cellKey(0, 2))).toBe(2);
    expect(slots).toHaveLength(2);
    expect(slots.find((s) => s.direction === "down")).toMatchObject({
      number: 2,
      row: 0,
      column: 2,
      length: 5,
    });
  });

  it("gives a shared number to across+down starting at the same cell", () => {
    const grid = buildGridFromEntries({
      width: 4,
      height: 4,
      language: "en",
      entries: [entry("across", 0, 0, "STAR"), entry("down", 0, 0, "SPIN")],
    });
    const { numbers, slots } = numberGrid(grid);
    expect(numbers.get(cellKey(0, 0))).toBe(1);
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.number === 1)).toBe(true);
  });
});

describe("grid predicates", () => {
  it("detects disconnected areas", () => {
    const grid: Grid = [
      ["A", "B", null],
      [null, null, null],
      [null, "C", "D"],
    ];
    expect(isConnected(grid)).toBe(false);
  });

  it("checks rotational symmetry of the block pattern", () => {
    const symmetric: Grid = [
      ["A", "B", null],
      ["C", "D", "E"],
      [null, "F", "G"],
    ];
    const asymmetric: Grid = [
      ["A", "B", null],
      ["C", "D", "E"],
      ["F", "G", null],
    ];
    expect(hasRotationalSymmetry(symmetric)).toBe(true);
    expect(hasRotationalSymmetry(asymmetric)).toBe(false);
  });
});
