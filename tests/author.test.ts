import { describe, expect, it } from "vitest";
import { numberAuthoredPuzzle, authoredPuzzleSchema } from "@/lib/crossword/author";

const authored = {
  slug: "t",
  title: "T",
  language: "en" as const,
  subject: "biology",
  topic: "human-anatomy",
  difficulty: "easy" as const,
  width: 5,
  height: 5,
  author: "Desk",
  entries: [
    {
      direction: "down" as const,
      row: 0,
      column: 2,
      answer: "APRIL",
      clue: "Spring month",
      clueStyle: "definition" as const,
    },
    {
      direction: "across" as const,
      row: 0,
      column: 0,
      answer: "HEART",
      clue: "Beating organ",
      clueStyle: "definition" as const,
    },
  ],
};

describe("numberAuthoredPuzzle", () => {
  it("assigns standard numbers and sorts entries", () => {
    const def = numberAuthoredPuzzle(authoredPuzzleSchema.parse(authored));
    expect(def.entries.map((e) => [e.number, e.answer])).toEqual([
      [1, "HEART"],
      [2, "APRIL"],
    ]);
    expect(def.grid).toBeDefined();
  });

  it("rejects entries that start mid-word instead of at a slot", () => {
    const floating = {
      ...authored,
      entries: [
        authored.entries[0],
        authored.entries[1],
        {
          direction: "down" as const,
          row: 1,
          column: 2,
          answer: "PRIL",
          clue: "Nonsense",
          clueStyle: "definition" as const,
        },
      ],
    };
    expect(() =>
      numberAuthoredPuzzle(authoredPuzzleSchema.parse(floating))
    ).toThrow(/does not start a numbered slot/);
  });
});
