import { describe, expect, it } from "vitest";
import { STICKER_SLUGS, stickerForSlug } from "@/lib/stickers";
import {
  attemptXp,
  collectStickers,
  computeAchievements,
  computeStats,
  groupByMonth,
  levelForXp,
  type LocalAttempt,
} from "@/lib/progress/local";
import { emptyAttempt } from "@/lib/crossword/attempt";

function attempt(over: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    puzzleId: over.slug ?? "id-1",
    slug: "the-body-at-a-glance",
    title: "The Body at a Glance",
    language: "en",
    subjectSlug: "biology",
    topicSlug: "human-anatomy",
    difficulty: "easy",
    state: emptyAttempt(3, 3),
    elapsedSeconds: 120,
    mistakes: 0,
    hintsUsed: 0,
    checksUsed: 0,
    completionPercentage: 100,
    status: "completed",
    startedAt: "2026-07-30T10:00:00.000Z",
    completedAt: "2026-07-30T10:02:00.000Z",
    ...over,
  };
}

describe("stickerForSlug", () => {
  it("is deterministic — a puzzle always yields the same sticker", () => {
    const first = stickerForSlug("inside-the-cell");
    for (let i = 0; i < 5; i++) {
      expect(stickerForSlug("inside-the-cell")).toBe(first);
    }
  });

  it("only ever returns a sticker from the published set", () => {
    for (const slug of [
      "the-body-at-a-glance",
      "wired-minds",
      "la-cellule",
      "ar-jism-al-insan",
      "gift-of-the-nile",
    ]) {
      expect(STICKER_SLUGS).toContain(stickerForSlug(slug));
    }
  });

  it("spreads a realistic library across several different stickers", () => {
    const slugs = [
      "the-body-at-a-glance", "inside-the-cell", "wired-minds", "periodic-habits",
      "kitchen-chemistry", "gift-of-the-nile", "insert-coin", "press-start",
      "la-cellule", "neurones-en-jeu", "au-fil-de-la-memoire", "tableau-des-elements",
      "lumieres-du-maroc", "pixels-d-antan", "ar-jism-al-insan", "ar-fi-al-dhakira",
      "ar-kimya-al-bayt", "ar-ard-al-faraina", "ar-tarikh-al-maghrib", "ar-mufradat-al-laib",
    ];
    const distinct = new Set(slugs.map(stickerForSlug));
    expect(distinct.size).toBeGreaterThanOrEqual(8);
  });
});

describe("collectStickers", () => {
  it("counts one sticker per completed puzzle and ignores unfinished ones", () => {
    const attempts: Record<string, LocalAttempt> = {
      a: attempt({ puzzleId: "a", slug: "one" }),
      b: attempt({ puzzleId: "b", slug: "two" }),
      c: attempt({ puzzleId: "c", slug: "three", status: "in_progress" }),
    };
    const { counts, bySource } = collectStickers(attempts, stickerForSlug);
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    expect(total).toBe(2);
    expect(bySource).toHaveProperty("one");
    expect(bySource).not.toHaveProperty("three");
  });

  it("increments rather than discards a duplicate sticker", () => {
    // Two different puzzles that map to the same sticker still both count.
    const slugs = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
    const target = stickerForSlug(slugs[0]);
    const sharing = slugs.filter((s) => stickerForSlug(s) === target);
    const attempts: Record<string, LocalAttempt> = {};
    sharing.forEach((s, i) => {
      attempts[`p${i}`] = attempt({ puzzleId: `p${i}`, slug: s });
    });
    const { counts } = collectStickers(attempts, stickerForSlug);
    expect(counts[target]).toBe(sharing.length);
  });
});

describe("groupByMonth", () => {
  it("groups completed attempts by month, newest month first", () => {
    const attempts: Record<string, LocalAttempt> = {
      a: attempt({ puzzleId: "a", completedAt: "2026-06-04T09:00:00.000Z" }),
      b: attempt({ puzzleId: "b", completedAt: "2026-07-02T09:00:00.000Z" }),
      c: attempt({ puzzleId: "c", completedAt: "2026-07-20T09:00:00.000Z" }),
      d: attempt({ puzzleId: "d", status: "in_progress", completedAt: undefined }),
    };
    const groups = groupByMonth(attempts);
    expect(groups.map((g) => g.month)).toEqual(["2026-07", "2026-06"]);
    expect(groups[0].attempts).toHaveLength(2);
    // Newest completion first inside a month.
    expect(groups[0].attempts[0].puzzleId).toBe("c");
  });

  it("returns nothing when there are no completions", () => {
    expect(groupByMonth({ a: attempt({ status: "in_progress" }) })).toEqual([]);
  });
});

describe("experience and levels", () => {
  it("rewards difficulty, a clean solve, and a hint-free solve", () => {
    expect(attemptXp(attempt({ difficulty: "easy" }))).toBe(100); // 50 + 25 + 25
    expect(attemptXp(attempt({ difficulty: "hard" }))).toBe(225);
    expect(attemptXp(attempt({ difficulty: "hard", hintsUsed: 3, mistakes: 2 }))).toBe(175);
    expect(attemptXp(attempt({ status: "in_progress" }))).toBe(0);
  });

  it("levels up on a gentle curve", () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(199).level).toBe(1);
    expect(levelForXp(200).level).toBe(2);
    expect(levelForXp(550).level).toBe(3); // 200 + 350
  });
});

describe("stats and achievements", () => {
  it("summarizes only completed attempts", () => {
    const stats = computeStats(
      {
        a: attempt({ puzzleId: "a", elapsedSeconds: 100 }),
        b: attempt({ puzzleId: "b", elapsedSeconds: 200, language: "fr" }),
        c: attempt({ puzzleId: "c", status: "in_progress" }),
      },
      "2026-07-31"
    );
    expect(stats.solved).toBe(2);
    expect(stats.averageSeconds).toBe(150);
    expect(stats.byLanguage.en?.solved).toBe(1);
    expect(stats.byLanguage.fr?.solved).toBe(1);
    expect(stats.bySubject.biology?.solved).toBe(2);
  });

  it("unlocks the trilingual achievement only across all three languages", () => {
    const twoLangs = {
      a: attempt({ puzzleId: "a", language: "en" }),
      b: attempt({ puzzleId: "b", language: "fr" }),
    };
    expect(
      computeAchievements(twoLangs).find((x) => x.slug === "trilingual-topic")?.unlocked
    ).toBe(false);

    const threeLangs = {
      ...twoLangs,
      c: attempt({ puzzleId: "c", language: "ar" }),
    };
    expect(
      computeAchievements(threeLangs).find((x) => x.slug === "trilingual-topic")?.unlocked
    ).toBe(true);
  });

  it("counts daily completions by distinct date", () => {
    const attempts: Record<string, LocalAttempt> = {};
    for (let d = 1; d <= 7; d++) {
      const date = `2026-07-${String(d).padStart(2, "0")}`;
      attempts[`p${d}`] = attempt({ puzzleId: `p${d}`, dailyDate: date });
    }
    expect(
      computeAchievements(attempts).find((x) => x.slug === "seven-dailies")?.unlocked
    ).toBe(true);
  });
});
