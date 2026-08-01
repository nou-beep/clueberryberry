import type { Difficulty } from "@/lib/crossword/types";

/**
 * A rough solve estimate, in minutes, shown on cards so a player can tell a
 * coffee-break puzzle from a sit-down one.
 *
 * Deliberately coarse: roughly half a minute per entry, scaled by difficulty,
 * rounded to the nearest five so it reads as an estimate rather than a promise.
 * Never returns less than five.
 */
const WEIGHT: Record<Difficulty, number> = { easy: 0.4, medium: 0.6, hard: 0.9 };

export function estimateMinutes(entryCount: number, difficulty: Difficulty): number {
  const raw = entryCount * WEIGHT[difficulty];
  return Math.max(5, Math.round(raw / 5) * 5);
}

/** What's left of that estimate, given how much of the grid is filled. */
export function remainingMinutes(
  entryCount: number,
  difficulty: Difficulty,
  completionPercentage: number
): number {
  const left = estimateMinutes(entryCount, difficulty) * (1 - completionPercentage / 100);
  return Math.max(1, Math.round(left));
}
