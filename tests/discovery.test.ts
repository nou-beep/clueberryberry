import { describe, expect, it } from "vitest";
import {
  LIBRARY_SIZES,
  LIBRARY_SORTS,
  LIBRARY_TIMES,
  applyDerivedFilters,
  sizeBandOf,
  timeBandOf,
  type PuzzleIndexRow,
} from "@/lib/db/queries";

/** A minimal index row; only the fields the derived filters read matter. */
function row(overrides: Partial<PuzzleIndexRow> & { id: string }): PuzzleIndexRow {
  return {
    slug: overrides.id,
    title: overrides.id,
    language: "en",
    subjectSlug: "biology",
    subjectName: "Biology",
    subjectTheme: "biology",
    tone: "playful",
    topicSlug: "cats",
    topicName: "Cats",
    difficulty: "easy",
    width: 9,
    height: 9,
    entryCount: 8,
    estimatedSolveTime: 240,
    origin: "official",
    featured: false,
    // Fixed so ordering assertions do not depend on the clock.
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("size bands", () => {
  it("follows the same boundaries the Playground builds to", () => {
    expect(sizeBandOf({ width: 9, height: 11 })).toBe("small");
    expect(sizeBandOf({ width: 11, height: 11 })).toBe("small");
    expect(sizeBandOf({ width: 12, height: 9 })).toBe("medium");
    expect(sizeBandOf({ width: 13, height: 13 })).toBe("medium");
    expect(sizeBandOf({ width: 15, height: 10 })).toBe("large");
  });

  it("covers every band it offers", () => {
    const produced = new Set(
      [9, 12, 15].map((n) => sizeBandOf({ width: n, height: n }))
    );
    for (const band of LIBRARY_SIZES) expect(produced.has(band)).toBe(true);
  });
});

describe("time bands", () => {
  it("buckets an estimate, and refuses to bucket a missing one", () => {
    expect(timeBandOf(120)).toBe("short");
    expect(timeBandOf(300)).toBe("short");
    expect(timeBandOf(301)).toBe("medium");
    expect(timeBandOf(900)).toBe("medium");
    expect(timeBandOf(901)).toBe("long");
    // A puzzle with no estimate is never claimed to fit a band.
    expect(timeBandOf(null)).toBeNull();
  });

  it("covers every band it offers", () => {
    const produced = new Set([100, 600, 1200].map((n) => timeBandOf(n)));
    for (const band of LIBRARY_TIMES) expect(produced.has(band)).toBe(true);
  });
});

describe("derived filters", () => {
  const rows = [
    row({ id: "b-small", title: "Beetles", width: 9, height: 9, estimatedSolveTime: 200 }),
    row({ id: "a-medium", title: "Anemones", width: 13, height: 12, estimatedSolveTime: 600 }),
    row({ id: "c-large", title: "Coral", width: 15, height: 15, estimatedSolveTime: 1500 }),
  ];

  it("filters by grid size", () => {
    expect(applyDerivedFilters(rows, { size: "large" }, {}).map((r) => r.id)).toEqual([
      "c-large",
    ]);
  });

  it("filters by estimated time", () => {
    expect(applyDerivedFilters(rows, { time: "short" }, {}).map((r) => r.id)).toEqual([
      "b-small",
    ]);
  });

  it("drops rows with no estimate when a time band is asked for", () => {
    const unknown = [...rows, row({ id: "no-estimate", estimatedSolveTime: null })];
    expect(applyDerivedFilters(unknown, { time: "short" }, {}).map((r) => r.id)).toEqual([
      "b-small",
    ]);
  });

  it("sorts by title", () => {
    expect(applyDerivedFilters(rows, { sort: "title" }, {}).map((r) => r.id)).toEqual([
      "a-medium",
      "b-small",
      "c-large",
    ]);
  });

  it("orders by popularity only from recorded attempts", () => {
    const attempts = { "c-large": 9, "b-small": 3 };
    expect(applyDerivedFilters(rows, { sort: "popular" }, attempts).map((r) => r.id)).toEqual([
      "c-large",
      "b-small",
      "a-medium",
    ]);
  });

  it("leaves the order alone when there is no attempt data to rank by", () => {
    // The honest behaviour: with an empty attempts table, asking for "popular"
    // must not invent a ranking. The interface hides the option entirely, and
    // the query keeps whatever order the database returned.
    expect(applyDerivedFilters(rows, { sort: "popular" }, {}).map((r) => r.id)).toEqual([
      "b-small",
      "a-medium",
      "c-large",
    ]);
  });

  it("combines a size and a time band", () => {
    expect(
      applyDerivedFilters(rows, { size: "medium", time: "medium" }, {}).map((r) => r.id)
    ).toEqual(["a-medium"]);
  });

  it("returns nothing rather than something approximate", () => {
    expect(applyDerivedFilters(rows, { size: "small", time: "long" }, {})).toEqual([]);
  });

  it("declares only sorts it can honour", () => {
    expect([...LIBRARY_SORTS]).toEqual(["new", "popular", "title"]);
  });
});
