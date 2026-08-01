import { describe, expect, it } from "vitest";
import { emptyAttempt } from "@/lib/crossword/attempt";
import { formatTime, shareText } from "@/lib/crossword/share";
import type { Grid } from "@/lib/crossword/types";

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
  });
});

describe("shareText", () => {
  const grid: Grid = [
    ["A", "B", null],
    [null, "C", "D"],
  ];

  it("renders abstract squares without any answer letters", () => {
    const state = emptyAttempt(3, 2);
    state.cells[0][0].letter = "A";
    state.cells[1][2].flags = ["revealed"];
    const text = shareText({
      appName: "Compendium",
      title: "Test Puzzle",
      subjectName: "Biology",
      language: "en",
      difficultyLabel: "Easy",
      timeLabel: "3:20",
      hintsUsed: 1,
      hintsLabel: "hints",
      noHintsLabel: "no hints",
      grid,
      state,
    });
    expect(text).toContain("Compendium — Test Puzzle");
    expect(text).toContain("Biology · Easy · EN");
    expect(text).toContain("3:20 · 1 hints");
    expect(text).toContain("⬛");
    expect(text).toContain("🟩");
    expect(text).toContain("🟨"); // revealed cell
    expect(text).not.toMatch(/[A-D]{2,}/); // no answer letters leak
  });

  it("omits time when the timer is disabled and celebrates no hints", () => {
    const text = shareText({
      appName: "Compendium",
      title: "T",
      subjectName: "S",
      language: "fr",
      difficultyLabel: "Facile",
      timeLabel: null,
      hintsUsed: 0,
      hintsLabel: "aides",
      noHintsLabel: "sans aide",
      grid,
      state: emptyAttempt(3, 2),
    });
    expect(text).not.toContain(":");
    expect(text).toContain("sans aide");
  });
});
