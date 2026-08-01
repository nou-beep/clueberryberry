/** Daily-streak math. Dates are YYYY-MM-DD strings in the player's timezone. */

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toDateString(dt);
}

/**
 * Current streak given the set of completed daily-puzzle dates.
 * A streak counts consecutive days ending today or yesterday — missing
 * today doesn't zero the streak until the day is actually over.
 */
export function currentStreak(completedDates: Iterable<string>, today: string): number {
  const set = new Set(completedDates);
  let anchor: string;
  if (set.has(today)) anchor = today;
  else if (set.has(addDays(today, -1))) anchor = addDays(today, -1);
  else return 0;

  let streak = 0;
  let cursor = anchor;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(completedDates: Iterable<string>): number {
  const dates = [...new Set(completedDates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
