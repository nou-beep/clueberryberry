import type {
  AttemptGridState,
  Difficulty,
  Direction,
  PuzzleLanguage,
} from "@/lib/crossword/types";
import { currentStreak } from "@/lib/crossword/streak";

/** Guest progress lives in localStorage and can later be merged into an account. */

export interface LocalAttempt {
  puzzleId: string;
  slug: string;
  title: string;
  language: PuzzleLanguage;
  subjectSlug: string;
  topicSlug: string;
  difficulty: Difficulty;
  state: AttemptGridState;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  checksUsed: number;
  completionPercentage: number;
  status: "in_progress" | "completed";
  startedAt: string;
  completedAt?: string;
  /** Set when the attempt was played as that day's daily puzzle. */
  dailyDate?: string;
  /**
   * Where the cursor sat when the attempt was last written. Optional so
   * attempts saved by older builds still parse.
   */
  selectedRow?: number | null;
  selectedColumn?: number | null;
  /** Typing direction at the cursor. */
  direction?: Direction;
  /** Whether the clock was on show for this puzzle. */
  timerVisible?: boolean;
  /** Free-text solver notes. Persisted even though nothing writes them yet. */
  notes?: string | null;
  /**
   * The server revision this snapshot is based on. 0 means "never synced".
   * The server increments it on every accepted write.
   */
  revision?: number;
  /** Client clock: when this attempt was last touched (ISO 8601). */
  updatedAt?: string;
}

/** Filled squares in an attempt — the primary measure of "further along". */
export function countFilledCells(state: AttemptGridState): number {
  let filled = 0;
  for (const row of state.cells) {
    for (const cell of row) {
      if (cell.letter !== "") filled++;
    }
  }
  return filled;
}

/** The cursor an attempt should reopen at, when one was stored. */
export function attemptCursor(
  attempt: LocalAttempt
): { row: number; column: number; direction: Direction } | null {
  if (
    typeof attempt.selectedRow !== "number" ||
    typeof attempt.selectedColumn !== "number"
  ) {
    return null;
  }
  return {
    row: attempt.selectedRow,
    column: attempt.selectedColumn,
    direction: attempt.direction === "down" ? "down" : "across",
  };
}

const KEY = "compendium.attempts";

export function loadAttempts(): Record<string, LocalAttempt> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      LocalAttempt
    >;
  } catch {
    return {};
  }
}

export function loadAttempt(puzzleId: string): LocalAttempt | null {
  return loadAttempts()[puzzleId] ?? null;
}

export function saveAttempt(attempt: LocalAttempt) {
  if (typeof window === "undefined") return;
  const all = loadAttempts();
  all[attempt.puzzleId] = attempt;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable — play continues without persistence.
  }
}

export function clearAttempt(puzzleId: string) {
  const all = loadAttempts();
  delete all[puzzleId];
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 175,
};

export function attemptXp(a: LocalAttempt): number {
  if (a.status !== "completed") return 0;
  let xp = XP_BY_DIFFICULTY[a.difficulty];
  if (a.hintsUsed === 0) xp += 25;
  if (a.mistakes === 0) xp += 25;
  return xp;
}

export function levelForXp(xp: number): { level: number; into: number; next: number } {
  // Gentle curve: each level needs 150 more XP than the last.
  let level = 1;
  let threshold = 200;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    threshold += 150;
    level++;
  }
  return { level, into: remaining, next: threshold };
}

/**
 * The sticker collection: which stickers have been earned, how many times, and
 * where the player has stuck them on journal pages. Derived from completed
 * attempts (a puzzle's sticker is deterministic), plus optional placements.
 */
export interface StickerCollection {
  /** slug → times earned */
  counts: Record<string, number>;
  /** puzzleSlug → sticker slug, so a journal entry can show its own sticker */
  bySource: Record<string, string>;
}

export function collectStickers(
  attempts: Record<string, LocalAttempt>,
  stickerFor: (puzzleSlug: string) => string
): StickerCollection {
  const counts: Record<string, number> = {};
  const bySource: Record<string, string> = {};
  for (const a of Object.values(attempts)) {
    if (a.status !== "completed") continue;
    const sticker = stickerFor(a.slug);
    counts[sticker] = (counts[sticker] ?? 0) + 1;
    bySource[a.slug] = sticker;
  }
  return { counts, bySource };
}

/** Completed attempts grouped by calendar month, newest month first. */
export function groupByMonth(
  attempts: Record<string, LocalAttempt>
): Array<{ month: string; attempts: LocalAttempt[] }> {
  const groups = new Map<string, LocalAttempt[]>();
  for (const a of Object.values(attempts)) {
    if (a.status !== "completed") continue;
    const month = (a.completedAt ?? a.startedAt).slice(0, 7); // YYYY-MM
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month)!.push(a);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({
      month,
      attempts: list.sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      ),
    }));
}

export interface ProgressStats {
  totalXp: number;
  level: number;
  solved: number;
  averageSeconds: number | null;
  totalHints: number;
  hintsPerPuzzle: number | null;
  accuracy: number | null; // 1 - mistakes/(cells attempted) approximated per puzzle
  streak: number;
  byLanguage: Record<string, { solved: number }>;
  byDifficulty: Record<string, { solved: number }>;
  bySubject: Record<string, { solved: number }>;
  completedDailyDates: string[];
  recent: LocalAttempt[];
}

export function computeStats(
  attempts: Record<string, LocalAttempt>,
  today: string
): ProgressStats {
  const list = Object.values(attempts);
  const done = list.filter((a) => a.status === "completed");
  const byLanguage: ProgressStats["byLanguage"] = {};
  const byDifficulty: ProgressStats["byDifficulty"] = {};
  const bySubject: ProgressStats["bySubject"] = {};
  let seconds = 0;
  let hints = 0;
  let mistakeFreeCount = 0;
  for (const a of done) {
    byLanguage[a.language] = { solved: (byLanguage[a.language]?.solved ?? 0) + 1 };
    byDifficulty[a.difficulty] = {
      solved: (byDifficulty[a.difficulty]?.solved ?? 0) + 1,
    };
    bySubject[a.subjectSlug] = { solved: (bySubject[a.subjectSlug]?.solved ?? 0) + 1 };
    seconds += a.elapsedSeconds;
    hints += a.hintsUsed;
    if (a.mistakes === 0) mistakeFreeCount++;
  }
  const dailyDates = done
    .filter((a) => a.dailyDate)
    .map((a) => a.dailyDate as string);
  const totalXp = done.reduce((sum, a) => sum + attemptXp(a), 0);
  return {
    totalXp,
    level: levelForXp(totalXp).level,
    solved: done.length,
    averageSeconds: done.length ? Math.round(seconds / done.length) : null,
    totalHints: hints,
    hintsPerPuzzle: done.length ? Math.round((hints / done.length) * 10) / 10 : null,
    accuracy: done.length ? Math.round((mistakeFreeCount / done.length) * 100) : null,
    streak: currentStreak(dailyDates, today),
    byLanguage,
    byDifficulty,
    bySubject,
    completedDailyDates: dailyDates,
    recent: done
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 6),
  };
}

export interface AchievementCheck {
  slug: string;
  unlocked: boolean;
}

export function computeAchievements(
  attempts: Record<string, LocalAttempt>
): AchievementCheck[] {
  const done = Object.values(attempts).filter((a) => a.status === "completed");
  const topicsByLang = new Map<string, Set<string>>();
  for (const a of done) {
    const key = `${a.subjectSlug}/${a.topicSlug}`;
    if (!topicsByLang.has(key)) topicsByLang.set(key, new Set());
    topicsByLang.get(key)!.add(a.language);
  }
  const trilingual = [...topicsByLang.values()].some((langs) => langs.size >= 3);
  return [
    { slug: "first-solve", unlocked: done.length >= 1 },
    { slug: "no-hints", unlocked: done.some((a) => a.hintsUsed === 0) },
    {
      slug: "five-biology",
      unlocked: done.filter((a) => a.subjectSlug === "biology").length >= 5,
    },
    { slug: "trilingual-topic", unlocked: trilingual },
    { slug: "hard-solve", unlocked: done.some((a) => a.difficulty === "hard") },
    {
      slug: "seven-dailies",
      unlocked: new Set(done.filter((a) => a.dailyDate).map((a) => a.dailyDate)).size >= 7,
    },
    { slug: "clean-solve", unlocked: done.some((a) => a.mistakes === 0) },
  ];
}
