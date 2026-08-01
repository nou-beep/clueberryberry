import type { Difficulty } from "@/lib/crossword/types";

/**
 * The generator's pipeline, named.
 *
 * Every id below corresponds to work the generator actually performs — there is
 * no decorative step here. `buildPuzzleSteps` in ./generate yields one event per
 * transition as it runs, and the Playground drives that generator one event at a
 * time so the interface shows the pass the builder is genuinely in.
 *
 *  planning      candidate answers are collected, filtered and difficulty-banded
 *  grid          words are placed on the sparse board (one assembly pass)
 *  crossings     the crossing guards run: every entry crossed, density floor,
 *                abbreviation and obscure-fill caps, Arabic answer hygiene
 *  clues         one clue per entry, no repeats, swapped when the validator objects
 *  validating    numbering plus the full editorial validator
 *  test-solving  the answer key is typed into an empty grid and must solve
 *  finalising    difficulty band, estimated time, title
 */
export const STAGE_IDS = [
  "planning",
  "grid",
  "crossings",
  "clues",
  "validating",
  "test-solving",
  "finalising",
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export type StageStatus =
  /** The stage is being worked on right now. */
  | "running"
  /** The stage passed. */
  | "done"
  /** The stage found a problem the generator can repair; another pass follows. */
  | "retrying"
  /** The stage found a problem no repair fixed. Generation stops. */
  | "failed";

/** Real counts read off the pipeline. Nothing here is estimated. */
export interface StageDetail {
  /** Usable candidate answers after filtering and banding. */
  words?: number;
  /** Entries placed on the board. */
  entries?: number;
  /** Cells shared by two entries. */
  crossings?: number;
  /** Clue swaps and entry drops applied so far. */
  repairs?: number;
  /** Validator errors found. */
  errors?: number;
  /** Open (non-block) cells the test solve filled. */
  cells?: number;
  /** Difficulty the finished fill actually lands on. */
  difficulty?: Difficulty;
  /** Difficulty that was asked for, when one was. */
  requested?: Difficulty;
  /** Machine-readable reason a stage retried or failed. */
  check?: string;
}

export interface StageEvent {
  stage: StageId;
  status: StageStatus;
  /** 1-based assembly pass this event belongs to. */
  pass: number;
  detail?: StageDetail;
}

/** The furthest-progressed status seen for each stage, for rendering a list. */
export type StageLog = Partial<Record<StageId, StageEvent>>;

const RANK: Record<StageStatus, number> = {
  running: 0,
  retrying: 1,
  done: 2,
  failed: 3,
};

/**
 * Fold a stream of events into one row per stage. A later pass overwrites an
 * earlier one, and a terminal status is never replaced by a running one from
 * the same pass, so the list reads as the builder's current position.
 */
export function foldStages(log: StageLog, event: StageEvent): StageLog {
  const existing = log[event.stage];
  if (existing && existing.pass === event.pass && RANK[existing.status] > RANK[event.status]) {
    return log;
  }
  return { ...log, [event.stage]: event };
}
