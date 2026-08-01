/**
 * Attempt reconciliation and wire shapes.
 *
 * Deliberately free of React and of the browser: the same rules must run in
 * the client (resolving a 409) and on the server (migrating guest progress),
 * so this module holds the pure half of `sync.ts` and is re-exported from it.
 */

import type {
  AttemptCellState,
  AttemptGridState,
  CellFlag,
  Difficulty,
  Direction,
  PuzzleLanguage,
} from "@/lib/crossword/types";
import { countFilledCells, type LocalAttempt } from "@/lib/progress/local";

/** The minimum an attempt must expose to be compared with another. */
export interface ReconcilableAttempt {
  status: "in_progress" | "completed";
  completionPercentage: number;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  checksUsed: number;
  revision?: number;
  updatedAt?: string;
}

export type ReconcileWinner = "local" | "server";

export type ReconcileReason =
  | "completed"
  | "filled-cells"
  | "completion-percentage"
  | "revision"
  | "updated-at"
  | "server-authoritative";

export interface ReconcileResult<T> {
  winner: ReconcileWinner;
  reason: ReconcileReason;
  /** The record to keep: the winner, with monotonic counters carried across. */
  attempt: T;
}

function filledOf(attempt: ReconcilableAttempt & { state?: AttemptGridState }): number {
  return attempt.state ? countFilledCells(attempt.state) : 0;
}

/**
 * Decide which of two versions of the same attempt to keep.
 *
 * Ordered so that progress is never thrown away: a finished solve always beats
 * an unfinished one, then more filled squares, then a higher completion
 * percentage, then the higher revision, then the newer client clock. A true tie
 * goes to the server, because the server is the copy other devices can see.
 *
 * Counters that can only go up (time played, mistakes, hints, checks) are taken
 * as the maximum of both sides regardless of who wins, so a losing copy cannot
 * silently erase them.
 */
export function reconcileAttempts<T extends ReconcilableAttempt & { state?: AttemptGridState }>(
  local: T,
  server: T
): ReconcileResult<T> {
  const decide = (): { winner: ReconcileWinner; reason: ReconcileReason } => {
    const localDone = local.status === "completed";
    const serverDone = server.status === "completed";
    if (localDone !== serverDone) {
      return { winner: localDone ? "local" : "server", reason: "completed" };
    }
    const localFilled = filledOf(local);
    const serverFilled = filledOf(server);
    if (localFilled !== serverFilled) {
      return {
        winner: localFilled > serverFilled ? "local" : "server",
        reason: "filled-cells",
      };
    }
    if (local.completionPercentage !== server.completionPercentage) {
      return {
        winner:
          local.completionPercentage > server.completionPercentage ? "local" : "server",
        reason: "completion-percentage",
      };
    }
    const localRev = local.revision ?? 0;
    const serverRev = server.revision ?? 0;
    if (localRev !== serverRev) {
      return { winner: localRev > serverRev ? "local" : "server", reason: "revision" };
    }
    const localAt = local.updatedAt ?? "";
    const serverAt = server.updatedAt ?? "";
    if (localAt !== serverAt) {
      return { winner: localAt > serverAt ? "local" : "server", reason: "updated-at" };
    }
    return { winner: "server", reason: "server-authoritative" };
  };

  const { winner, reason } = decide();
  const kept = winner === "local" ? local : server;
  return {
    winner,
    reason,
    attempt: {
      ...kept,
      elapsedSeconds: Math.max(local.elapsedSeconds, server.elapsedSeconds),
      mistakes: Math.max(local.mistakes, server.mistakes),
      hintsUsed: Math.max(local.hintsUsed, server.hintsUsed),
      checksUsed: Math.max(local.checksUsed, server.checksUsed),
      revision: Math.max(local.revision ?? 0, server.revision ?? 0),
    },
  };
}

/* -------------------------------------------------------- guest migration */

export interface MergePlan {
  action: "create" | "update" | "skip";
  attempt: LocalAttempt;
}

/**
 * What migrating one guest attempt into an account should do. Uses exactly the
 * same reconcile rules as live syncing, so registration can never demote server
 * progress — and running it twice is a no-op, because after the first pass the
 * server copy carries the higher revision and wins the tie-break.
 */
export function planMerge(local: LocalAttempt, server: LocalAttempt | null): MergePlan {
  if (!server) return { action: "create", attempt: local };
  const result = reconcileAttempts(local, server);
  if (result.winner === "server") {
    const unchanged =
      result.attempt.elapsedSeconds === server.elapsedSeconds &&
      result.attempt.mistakes === server.mistakes &&
      result.attempt.hintsUsed === server.hintsUsed &&
      result.attempt.checksUsed === server.checksUsed;
    return { action: unchanged ? "skip" : "update", attempt: result.attempt };
  }
  return { action: "update", attempt: result.attempt };
}

/* ---------------------------------------------------------- serialization */

/** A `PuzzleAttempt` row plus the puzzle columns the UI needs to label it. */
export interface AttemptRow {
  puzzleId: string;
  slug: string;
  title: string;
  language: string;
  subjectSlug: string;
  topicSlug: string;
  difficulty: string;
  currentGridState: string;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  checksUsed: number;
  completionPercentage: number;
  status: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
  selectedRow: number | null;
  selectedColumn: number | null;
  direction: string;
  timerVisible: boolean;
  notes: string | null;
  revision: number;
  updatedAt: Date | string;
  dailyDate?: string | null;
}

function iso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

const LANGUAGES: readonly string[] = ["en", "fr", "ar"];
const DIFFICULTIES: readonly string[] = ["easy", "medium", "hard"];

/** Narrow a stored language string; unknown values fall back to English. */
export function toPuzzleLanguage(value: string): PuzzleLanguage {
  return (LANGUAGES.includes(value) ? value : "en") as PuzzleLanguage;
}

/** Narrow a stored difficulty string; unknown values fall back to easy. */
export function toDifficulty(value: string): Difficulty {
  return (DIFFICULTIES.includes(value) ? value : "easy") as Difficulty;
}

/** Parse a stored grid-state JSON string, rejecting anything malformed. */
export function parseGridState(raw: string): AttemptGridState {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { cells: [] };
  }
  if (typeof value !== "object" || value === null) return { cells: [] };
  const cells = (value as { cells?: unknown }).cells;
  if (!Array.isArray(cells)) return { cells: [] };
  const rows: AttemptCellState[][] = [];
  for (const row of cells) {
    if (!Array.isArray(row)) return { cells: [] };
    const parsedRow: AttemptCellState[] = [];
    for (const cell of row) {
      if (typeof cell !== "object" || cell === null) return { cells: [] };
      const letter = (cell as { letter?: unknown }).letter;
      const flags = (cell as { flags?: unknown }).flags;
      parsedRow.push({
        letter: typeof letter === "string" ? letter : "",
        flags: Array.isArray(flags)
          ? flags.filter((f): f is CellFlag =>
              f === "revealed" || f === "checked-wrong" || f === "confirmed"
            )
          : [],
      });
    }
    rows.push(parsedRow);
  }
  return { cells: rows };
}

/** Turn a database row into the shape the client and journal already speak. */
export function attemptFromRow(row: AttemptRow): LocalAttempt {
  return {
    puzzleId: row.puzzleId,
    slug: row.slug,
    title: row.title,
    language: toPuzzleLanguage(row.language),
    subjectSlug: row.subjectSlug,
    topicSlug: row.topicSlug,
    difficulty: toDifficulty(row.difficulty),
    state: parseGridState(row.currentGridState),
    elapsedSeconds: row.elapsedSeconds,
    mistakes: row.mistakes,
    hintsUsed: row.hintsUsed,
    checksUsed: row.checksUsed,
    completionPercentage: row.completionPercentage,
    status: row.status === "completed" ? "completed" : "in_progress",
    startedAt: iso(row.startedAt),
    completedAt: row.completedAt ? iso(row.completedAt) : undefined,
    dailyDate: row.dailyDate ?? undefined,
    selectedRow: row.selectedRow,
    selectedColumn: row.selectedColumn,
    direction: row.direction === "down" ? "down" : "across",
    timerVisible: row.timerVisible,
    notes: row.notes,
    revision: row.revision,
    updatedAt: iso(row.updatedAt),
  };
}

/** The body of a `PUT /api/attempts`. */
export interface AttemptWrite {
  baseRevision: number;
  attempt: {
    puzzleId: string;
    state: AttemptGridState;
    elapsedSeconds: number;
    mistakes: number;
    hintsUsed: number;
    checksUsed: number;
    completionPercentage: number;
    status: "in_progress" | "completed";
    startedAt: string;
    completedAt?: string;
    selectedRow: number | null;
    selectedColumn: number | null;
    direction: Direction;
    timerVisible: boolean;
    notes: string | null;
    clientUpdatedAt: string;
  };
}

export function writeBodyFor(attempt: LocalAttempt, baseRevision: number): AttemptWrite {
  return {
    baseRevision,
    attempt: {
      puzzleId: attempt.puzzleId,
      state: attempt.state,
      elapsedSeconds: attempt.elapsedSeconds,
      mistakes: attempt.mistakes,
      hintsUsed: attempt.hintsUsed,
      checksUsed: attempt.checksUsed,
      completionPercentage: attempt.completionPercentage,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      selectedRow: attempt.selectedRow ?? null,
      selectedColumn: attempt.selectedColumn ?? null,
      direction: attempt.direction === "down" ? "down" : "across",
      timerVisible: attempt.timerVisible ?? true,
      notes: attempt.notes ?? null,
      clientUpdatedAt: attempt.updatedAt ?? new Date().toISOString(),
    },
  };
}

/** Loosely validate an attempt that came back from our own API. */
export function parseServerAttempt(value: unknown): LocalAttempt | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.puzzleId !== "string" || typeof v.slug !== "string") return null;
  if (typeof v.revision !== "number") return null;
  const state = v.state;
  const cells =
    typeof state === "object" && state !== null && Array.isArray((state as { cells?: unknown }).cells)
      ? parseGridState(JSON.stringify(state))
      : { cells: [] };
  return {
    puzzleId: v.puzzleId,
    slug: v.slug,
    title: typeof v.title === "string" ? v.title : v.slug,
    language: toPuzzleLanguage(typeof v.language === "string" ? v.language : "en"),
    subjectSlug: typeof v.subjectSlug === "string" ? v.subjectSlug : "",
    topicSlug: typeof v.topicSlug === "string" ? v.topicSlug : "",
    difficulty: toDifficulty(typeof v.difficulty === "string" ? v.difficulty : "easy"),
    state: cells,
    elapsedSeconds: typeof v.elapsedSeconds === "number" ? v.elapsedSeconds : 0,
    mistakes: typeof v.mistakes === "number" ? v.mistakes : 0,
    hintsUsed: typeof v.hintsUsed === "number" ? v.hintsUsed : 0,
    checksUsed: typeof v.checksUsed === "number" ? v.checksUsed : 0,
    completionPercentage:
      typeof v.completionPercentage === "number" ? v.completionPercentage : 0,
    status: v.status === "completed" ? "completed" : "in_progress",
    startedAt: typeof v.startedAt === "string" ? v.startedAt : new Date().toISOString(),
    completedAt: typeof v.completedAt === "string" ? v.completedAt : undefined,
    dailyDate: typeof v.dailyDate === "string" ? v.dailyDate : undefined,
    selectedRow: typeof v.selectedRow === "number" ? v.selectedRow : null,
    selectedColumn: typeof v.selectedColumn === "number" ? v.selectedColumn : null,
    direction: v.direction === "down" ? "down" : "across",
    timerVisible: typeof v.timerVisible === "boolean" ? v.timerVisible : true,
    notes: typeof v.notes === "string" ? v.notes : null,
    revision: v.revision,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
  };
}
