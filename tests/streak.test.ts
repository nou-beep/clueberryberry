import { describe, expect, it } from "vitest";
import { addDays, currentStreak, longestStreak, toDateString } from "@/lib/crossword/streak";

describe("date helpers", () => {
  it("formats and adds days across month boundaries", () => {
    expect(toDateString(new Date(2026, 0, 31))).toBe("2026-01-31");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29"); // leap year
  });
});

describe("currentStreak", () => {
  const today = "2026-07-31";

  it("is zero with no completions", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-07-29", "2026-07-30", "2026-07-31"], today)).toBe(3);
  });

  it("does not punish a not-yet-played today", () => {
    expect(currentStreak(["2026-07-29", "2026-07-30"], today)).toBe(2);
  });

  it("breaks after a full missed day", () => {
    expect(currentStreak(["2026-07-28", "2026-07-29"], today)).toBe(0);
  });

  it("ignores gaps further back", () => {
    expect(
      currentStreak(["2026-07-25", "2026-07-30", "2026-07-31"], today)
    ).toBe(2);
  });

  it("deduplicates multiple completions on one day", () => {
    expect(currentStreak(["2026-07-31", "2026-07-31"], today)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in history", () => {
    expect(
      longestStreak([
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
        "2026-02-10",
        "2026-02-11",
      ])
    ).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
