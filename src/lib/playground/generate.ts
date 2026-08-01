import { emptyAttempt, summarizeAttempt } from "@/lib/crossword/attempt";
import { numberAuthoredPuzzle, type AuthoredPuzzle } from "@/lib/crossword/author";
import { entryCells } from "@/lib/crossword/grid";
import { answerToCells } from "@/lib/crossword/normalize";
import type {
  Difficulty,
  Direction,
  EntryDef,
  Grid,
  PuzzleLanguage,
} from "@/lib/crossword/types";
import { cellKey } from "@/lib/crossword/types";
import { validatePuzzle } from "@/lib/crossword/validate";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import {
  bankFor,
  themeTitle,
  THEME_META,
  type BankWord,
  type PlaygroundTheme,
} from "./banks";
import type { StageEvent, StageId } from "./stages";

/**
 * Offline criss-cross generator. Assembles a sparse interlocking puzzle from a
 * word list — the curated banks in ./banks, or words extracted from pasted
 * notes in ./from-notes — then runs it through the editorial validator before
 * handing it to the player.
 *
 * Nothing here talks to a network or to a model, and nothing random happens:
 * every choice comes from the seeded PRNG below, so a seed always rebuilds the
 * same puzzle.
 */

export type PuzzleSize = "small" | "medium" | "large";

/** Shown where a topic name would normally go, since the theme names the subject. */
const PLAYGROUND_LABEL: Record<PuzzleLanguage, string> = {
  en: "Playground",
  fr: "Atelier",
  ar: "الورشة",
};

/** Prefix for the synthesised answer explanation. */
const ALSO_CLUED: Record<PuzzleLanguage, string> = {
  en: "Also clued as: ",
  fr: "Autre définition : ",
  ar: "تعريف آخر: ",
};

/** Title patterns; `{t}` is the theme title in the puzzle's language. */
const TITLE_PATTERNS: Record<PuzzleLanguage, string[]> = {
  en: ["{t}", "{t}: a short round", "{t}, in brief", "{t} practice"],
  fr: ["{t}", "{t} : petite grille", "{t}, en bref", "Exercice : {t}"],
  ar: ["{t}", "{t}: شبكة قصيرة", "{t} باختصار", "تدريب: {t}"],
};

export interface WordFilterOptions {
  /** Drop entries tagged `sensitive`. */
  familyFriendly?: boolean;
  /** When false, drop entries tagged `properNoun`. Defaults to true. */
  allowProperNouns?: boolean;
  /** When false, drop entries tagged `abbreviation`. Defaults to true. */
  allowAbbreviations?: boolean;
}

export interface GenerateOptions extends WordFilterOptions {
  theme: PlaygroundTheme;
  language: PuzzleLanguage;
  size: PuzzleSize;
  /** Biases word selection towards a difficulty band. */
  difficulty?: Difficulty;
  /**
   * Overrides the theme's own register. "archival" drops the dressed-up title
   * pattern and the playful decoration (docs/design-system.md §1).
   */
  tone?: "playful" | "archival";
  /** How many of the longest answers are flagged as theme entries. */
  themeEntries?: number;
  seed: number;
}

export type GenerateFailure =
  /** The bank (or the notes) offered too few usable words. */
  | "not_enough_words"
  /** Words were available but never interlocked into a big enough grid. */
  | "no_interlock"
  /** Every assembled grid failed the guards or the validator. */
  | "validation_failed";

export interface GenerateSuccess {
  ok: true;
  puzzle: PlayablePuzzle;
  /** Assembly passes used, including the successful one. */
  attempts: number;
  /** Clue swaps and entry drops applied before the puzzle passed. */
  repairs: number;
  /** The band the finished fill lands on, and the one that was asked for. */
  difficulty: Difficulty;
  requestedDifficulty?: Difficulty;
}

export interface GenerateFailureResult {
  ok: false;
  reason: GenerateFailure;
  /** The pipeline stage that gave up, for a plain-language explanation. */
  stage?: StageId;
  /** The specific check that failed, e.g. a guard code or a validator code. */
  check?: string;
}

export type GenerateResult = GenerateSuccess | GenerateFailureResult;

interface SizeSpec {
  /** Hard cap on both grid dimensions. */
  maxDimension: number;
  /** Refuse to return a puzzle below this many entries. */
  floor: number;
  /** Stop placing once this many entries are down. */
  target: number;
}

export const SIZE_SPECS: Record<PuzzleSize, SizeSpec> = {
  small: { maxDimension: 11, floor: 7, target: 9 },
  medium: { maxDimension: 13, floor: 9, target: 12 },
  large: { maxDimension: 15, floor: 11, target: 15 },
};

const DIFFICULTY_BANDS: Record<Difficulty, [number, number]> = {
  easy: [1, 2],
  medium: [2, 4],
  hard: [3, 5],
};

/** Seconds per entry used for the estimated solve time. */
const SECONDS_PER_ENTRY: Record<Difficulty, number> = { easy: 20, medium: 30, hard: 40 };

/** Longest answers flagged as theme entries when the player has no preference. */
export const DEFAULT_THEME_ENTRIES = 3;
/** The range the guided form offers. */
export const THEME_ENTRY_RANGE = [1, 2, 3, 4, 5] as const;

/** Assembly passes per call before reporting failure to the UI. */
const MAX_ATTEMPTS = 24;
/** Clue swaps allowed within one assembly pass. */
const MAX_CLUE_REPAIRS = 4;
/** Entries that may be dropped within one assembly pass. */
const MAX_DROPS = 2;

/** Share of entries allowed to be abbreviations. */
const ABBREVIATION_CAP = 0.15;
/** Share of entries allowed to be rated 4–5 (obscure fill). */
const OBSCURE_CAP = 0.3;
/** Share of entries allowed to be rated 5. */
const VERY_OBSCURE_CAP = 0.15;
/**
 * Minimum share of open cells that must be crossed. A criss-cross grid
 * legitimately contains unchecked letters — that is the form — so the guard is
 * a density floor plus the per-entry rule that every entry crosses something.
 */
const MIN_CROSSED_SHARE = 0.14;

/* -------------------------------------------------------------------------- */
/* Seeded PRNG (mulberry32) — the only source of chance in the generator.     */
/* -------------------------------------------------------------------------- */

interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  shuffle<T>(items: T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = (seed | 0) === 0 ? 0x9e3779b9 : seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number) =>
    maxExclusive <= 0 ? 0 : Math.min(maxExclusive - 1, Math.floor(next() * maxExclusive));
  return {
    next,
    int,
    shuffle<T>(items: T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}

/** Derive a fresh seed for a repair or retry pass. */
const deriveSeed = (seed: number, step: number): number =>
  (seed + Math.imul(step + 1, 0x9e3779b1)) >>> 0;

/* -------------------------------------------------------------------------- */
/* Word filtering                                                             */
/* -------------------------------------------------------------------------- */

/** Apply the player's explicit content options to a word list. */
export function filterWords(words: BankWord[], options: WordFilterOptions): BankWord[] {
  const allowProperNouns = options.allowProperNouns ?? true;
  const allowAbbreviations = options.allowAbbreviations ?? true;
  return words.filter((word) => {
    if (options.familyFriendly && word.sensitive) return false;
    if (!allowProperNouns && word.properNoun) return false;
    if (!allowAbbreviations && word.abbreviation) return false;
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

interface Candidate {
  word: BankWord;
  letters: string[];
}

interface Placement {
  candidate: Candidate;
  direction: Direction;
  row: number;
  column: number;
  crossings: number;
}

/** Sparse working board: letters plus which direction already owns a cell. */
class Board {
  private readonly letters = new Map<string, string>();
  private readonly owners = new Map<string, Set<Direction>>();
  readonly placed: Placement[] = [];

  minRow = 0;
  maxRow = 0;
  minCol = 0;
  maxCol = 0;

  letterAt(row: number, column: number): string | undefined {
    return this.letters.get(cellKey(row, column));
  }

  private ownedBy(row: number, column: number, direction: Direction): boolean {
    return this.owners.get(cellKey(row, column))?.has(direction) ?? false;
  }

  private step(direction: Direction, index: number): [number, number] {
    return direction === "across" ? [0, index] : [index, 0];
  }

  /**
   * Every rule the validator enforces, checked before a word goes down:
   * matching crossings, no same-direction overlap, no run extension or
   * end-to-end touching, and no new cell touching a parallel word (which is
   * what would create a phantom slot or parallel adjacency).
   */
  canPlace(
    letters: string[],
    direction: Direction,
    row: number,
    column: number,
    maxDimension: number
  ): number | null {
    const [dr, dc] = this.step(direction, 1);
    const perp: [number, number] = direction === "across" ? [1, 0] : [0, 1];

    // The cell before the start and after the end must be empty, or the runs
    // would merge into one longer slot.
    if (this.letterAt(row - dr, column - dc) !== undefined) return null;
    if (
      this.letterAt(row + dr * letters.length, column + dc * letters.length) !== undefined
    ) {
      return null;
    }

    let crossings = 0;
    for (let i = 0; i < letters.length; i++) {
      const r = row + dr * i;
      const c = column + dc * i;
      const existing = this.letterAt(r, c);
      if (existing === undefined) {
        // A fresh cell must not sit beside a parallel word.
        if (this.letterAt(r - perp[0], c - perp[1]) !== undefined) return null;
        if (this.letterAt(r + perp[0], c + perp[1]) !== undefined) return null;
        continue;
      }
      if (existing !== letters[i]) return null;
      // Sharing a cell with a word running the same way would merge them.
      if (this.ownedBy(r, c, direction)) return null;
      crossings++;
    }

    const endRow = row + dr * (letters.length - 1);
    const endCol = column + dc * (letters.length - 1);
    const height = Math.max(this.maxRow, endRow) - Math.min(this.minRow, row) + 1;
    const width = Math.max(this.maxCol, endCol) - Math.min(this.minCol, column) + 1;
    if (height > maxDimension || width > maxDimension) return null;

    return crossings;
  }

  place(placement: Placement): void {
    const { candidate, direction, row, column } = placement;
    const [dr, dc] = this.step(direction, 1);
    for (let i = 0; i < candidate.letters.length; i++) {
      const r = row + dr * i;
      const c = column + dc * i;
      const key = cellKey(r, c);
      this.letters.set(key, candidate.letters[i]);
      const owners = this.owners.get(key) ?? new Set<Direction>();
      owners.add(direction);
      this.owners.set(key, owners);
      if (this.placed.length === 0 && i === 0) {
        this.minRow = this.maxRow = r;
        this.minCol = this.maxCol = c;
      }
      this.minRow = Math.min(this.minRow, r);
      this.maxRow = Math.max(this.maxRow, r);
      this.minCol = Math.min(this.minCol, c);
      this.maxCol = Math.max(this.maxCol, c);
    }
    this.placed.push(placement);
  }
}

function toCandidates(words: BankWord[], language: PuzzleLanguage): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const word of words) {
    const letters = answerToCells(word.answer, language);
    if (letters.length < 3 || letters.length > 9) continue;
    const key = letters.join("");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, letters });
  }
  return out;
}

function bandCandidates(
  all: Candidate[],
  difficulty: Difficulty | undefined
): Candidate[] {
  if (!difficulty) return all;
  const [low, high] = DIFFICULTY_BANDS[difficulty];
  const banded = all.filter(
    (c) => c.word.difficulty >= low && c.word.difficulty <= high
  );
  // A narrow band can starve the crossing search; fall back to the full list.
  return banded.length >= 14 ? banded : all;
}

/** One placement pass over a shuffled word list. Returns the filled board. */
function assemble(candidates: Candidate[], spec: SizeSpec, rng: Rng): Board {
  const board = new Board();
  const pool = rng.shuffle(candidates);

  // Start from one of the longer words so there is plenty to cross on.
  const longest = pool
    .slice()
    .sort((a, b) => b.letters.length - a.letters.length)
    .slice(0, Math.max(1, Math.min(5, pool.length)));
  const seedWord = longest[rng.int(longest.length)];
  board.place({ candidate: seedWord, direction: "across", row: 0, column: 0, crossings: 0 });

  const remaining = pool.filter((c) => c !== seedWord);
  let progress = true;
  while (progress && board.placed.length < spec.target) {
    progress = false;
    for (let i = 0; i < remaining.length && board.placed.length < spec.target; i++) {
      const candidate = remaining[i];
      const options: Placement[] = [];
      for (const anchor of board.placed) {
        const direction: Direction = anchor.direction === "across" ? "down" : "across";
        const [adr, adc] = anchor.direction === "across" ? [0, 1] : [1, 0];
        for (let a = 0; a < anchor.candidate.letters.length; a++) {
          const anchorRow = anchor.row + adr * a;
          const anchorCol = anchor.column + adc * a;
          const anchorLetter = anchor.candidate.letters[a];
          for (let k = 0; k < candidate.letters.length; k++) {
            if (candidate.letters[k] !== anchorLetter) continue;
            const row = direction === "down" ? anchorRow - k : anchorRow;
            const column = direction === "across" ? anchorCol - k : anchorCol;
            const crossings = board.canPlace(
              candidate.letters,
              direction,
              row,
              column,
              spec.maxDimension
            );
            if (crossings !== null && crossings > 0) {
              options.push({ candidate, direction, row, column, crossings });
            }
          }
        }
      }
      if (options.length === 0) continue;
      // Prefer denser interlock; break ties with the seeded PRNG.
      const best = Math.max(...options.map((o) => o.crossings));
      const shortlist = options.filter((o) => o.crossings === best);
      board.place(shortlist[rng.int(shortlist.length)]);
      remaining.splice(i, 1);
      i--;
      progress = true;
    }
  }
  return board;
}

/* -------------------------------------------------------------------------- */
/* Guards the validator does not cover                                        */
/* -------------------------------------------------------------------------- */

/** Cells of one placement, in order. */
function cellsOf(placement: Placement): Array<[number, number]> {
  const [dr, dc] = placement.direction === "across" ? [0, 1] : [1, 0];
  return placement.candidate.letters.map((_, i) => [
    placement.row + dr * i,
    placement.column + dc * i,
  ]);
}

interface GuardReport {
  ok: boolean;
  /** Index into the placement list of an entry worth dropping, when any. */
  offender: number | null;
  code:
    | "ok"
    | "uncrossed_entry"
    | "too_many_abbreviations"
    | "too_much_obscure_fill"
    | "too_few_crossings"
    | "bad_arabic_answer";
}

const pass: GuardReport = { ok: true, offender: null, code: "ok" };

/**
 * Generator-side rules the editorial validator does not express: an
 * abbreviation cap, an obscure-fill cap, a crossing floor, and per-language
 * answer hygiene.
 */
function runGuards(placements: Placement[], language: PuzzleLanguage): GuardReport {
  const coverage = new Map<string, number>();
  for (const placement of placements) {
    for (const [r, c] of cellsOf(placement)) {
      const key = cellKey(r, c);
      coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
  }

  // Every entry must cross at least one other entry.
  for (let i = 0; i < placements.length; i++) {
    const crossed = cellsOf(placements[i]).some(
      ([r, c]) => (coverage.get(cellKey(r, c)) ?? 0) > 1
    );
    if (!crossed) return { ok: false, offender: i, code: "uncrossed_entry" };
  }

  const crossedCells = [...coverage.values()].filter((n) => n > 1).length;
  if (crossedCells / coverage.size < MIN_CROSSED_SHARE) {
    return { ok: false, offender: null, code: "too_few_crossings" };
  }

  const total = placements.length;
  const abbreviations = placements.filter((p) => p.candidate.word.abbreviation);
  if (abbreviations.length / total > ABBREVIATION_CAP) {
    return {
      ok: false,
      offender: placements.indexOf(abbreviations[abbreviations.length - 1]),
      code: "too_many_abbreviations",
    };
  }

  const obscure = placements.filter((p) => p.candidate.word.difficulty >= 4);
  const veryObscure = placements.filter((p) => p.candidate.word.difficulty === 5);
  if (obscure.length / total > OBSCURE_CAP) {
    return {
      ok: false,
      offender: placements.indexOf(obscure[obscure.length - 1]),
      code: "too_much_obscure_fill",
    };
  }
  if (veryObscure.length / total > VERY_OBSCURE_CAP) {
    return {
      ok: false,
      offender: placements.indexOf(veryObscure[veryObscure.length - 1]),
      code: "too_much_obscure_fill",
    };
  }

  for (let i = 0; i < placements.length; i++) {
    const { answer } = placements[i].candidate.word;
    const cells = answerToCells(answer, language);
    // Normalization must not change the cell count, and Arabic answers must be
    // single words free of diacritics and tatweel.
    if (cells.length !== placements[i].candidate.letters.length) {
      return { ok: false, offender: i, code: "bad_arabic_answer" };
    }
    if (language === "ar" && /[ً-ْٰـ\s]/.test(answer)) {
      return { ok: false, offender: i, code: "bad_arabic_answer" };
    }
  }

  return pass;
}

/* -------------------------------------------------------------------------- */
/* Assembling the authored puzzle                                             */
/* -------------------------------------------------------------------------- */

export interface BuildInput {
  words: BankWord[];
  language: PuzzleLanguage;
  size: PuzzleSize;
  difficulty?: Difficulty;
  seed: number;
  /** Slug stem; the seed and attempt number are appended. */
  slugBase: string;
  /** Base title; the generator dresses it with a deterministic pattern. */
  title: string;
  /** Skip the title patterns (archival subjects keep a plain title). */
  plainTitle?: boolean;
  /** How many of the longest answers are flagged as theme entries. Default 3. */
  themeEntries?: number;
  subject: string;
  topic: string;
  /** Human label shown in the breadcrumb. */
  topicLabel: string;
  /** Decorative accent key. */
  decor: string;
}

/** Accepted spelling variants for one answer, same cell count as the answer. */
function alternativesFor(word: BankWord, language: PuzzleLanguage): string[] {
  const out = new Set(word.alternatives ?? []);
  // Arabic ة/ه are distinct letters, but the ه spelling of a final ta marbuta
  // is a genuine variant and has the same cell count.
  if (language === "ar" && word.answer.endsWith("ة")) {
    out.add(`${word.answer.slice(0, -1)}ه`);
  }
  const letters = answerToCells(word.answer, language).length;
  return [...out].filter(
    (variant) =>
      variant !== word.answer && answerToCells(variant, language).length === letters
  );
}

function explanationFor(
  word: BankWord,
  chosenClue: string,
  language: PuzzleLanguage
): string {
  if (word.note) return word.note;
  const others = word.clues.filter((clue) => clue !== chosenClue && clue.trim().length > 0);
  if (others.length === 0) return `${ALSO_CLUED[language]}${chosenClue}`;
  return `${ALSO_CLUED[language]}${others.join(" · ")}`;
}

function difficultyFromRatings(ratings: number[]): Difficulty {
  const avg = ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length);
  if (avg < 2.2) return "easy";
  if (avg < 3.2) return "medium";
  return "hard";
}

/** One clue per placement, never repeating a clue inside a puzzle. */
function pickClues(placements: Placement[], rng: Rng): string[] {
  const used = new Set<string>();
  return placements.map((placement) => {
    const clues = placement.candidate.word.clues;
    const start = rng.int(clues.length);
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[(start + i) % clues.length];
      if (clue.trim().length > 0 && !used.has(clue.toLowerCase())) {
        used.add(clue.toLowerCase());
        return clue;
      }
    }
    return clues[start];
  });
}

function buildAuthored(
  placements: Placement[],
  clues: string[],
  input: BuildInput,
  attempt: number
): AuthoredPuzzle {
  const rows = placements.flatMap((p) => cellsOf(p).map(([r]) => r));
  const cols = placements.flatMap((p) => cellsOf(p).map(([, c]) => c));
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  // The longest answers carry the theme, so no entry is a lonely theme. The
  // player can ask for more or fewer; the cutoff moves with the request and is
  // always clamped to what was actually placed.
  const wanted = Math.max(1, Math.min(input.themeEntries ?? DEFAULT_THEME_ENTRIES, placements.length));
  const themeCutoff = placements
    .map((p) => p.candidate.letters.length)
    .sort((a, b) => b - a)[wanted - 1];
  let marked = 0;

  const entries = placements.map((placement, index) => {
    const isThemeEntry = placement.candidate.letters.length >= themeCutoff && marked < wanted;
    if (isThemeEntry) marked++;
    const word = placement.candidate.word;
    return {
      direction: placement.direction,
      row: placement.row - minRow,
      column: placement.column - minCol,
      answer: word.answer,
      clue: clues[index],
      clueStyle: "definition" as const,
      explanation: explanationFor(word, clues[index], input.language),
      difficultyRating: word.difficulty,
      isThemeEntry,
      acceptedAlternatives: alternativesFor(word, input.language),
    };
  });

  const difficulty = difficultyFromRatings(entries.map((e) => e.difficultyRating));
  const rng = createRng(deriveSeed(input.seed, attempt));
  const patterns = TITLE_PATTERNS[input.language];
  const pattern = input.plainTitle ? "{t}" : patterns[rng.int(patterns.length)];

  return {
    slug: `${input.slugBase}-${input.seed}-${attempt}`,
    title: pattern.replace("{t}", input.title),
    language: input.language,
    subject: input.subject,
    topic: input.topic,
    difficulty,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
    entries,
    author: PLAYGROUND_LABEL[input.language],
    // Generated puzzles are always playground-origin and never featured; the
    // authoring schema requires both, which keeps them from being mistaken for
    // reviewed editorial content anywhere downstream.
    origin: "playground" as const,
    featured: false,
    status: "draft",
    symmetry: false,
    estimatedSolveTime: entries.length * SECONDS_PER_ENTRY[difficulty],
    factCards: [],
  };
}

function toPlayable(
  entries: EntryDef[],
  authored: AuthoredPuzzle,
  grid: PlayablePuzzle["grid"],
  input: BuildInput
): PlayablePuzzle {
  return {
    id: authored.slug,
    slug: authored.slug,
    title: authored.title,
    language: input.language,
    subjectSlug: authored.subject,
    subjectName: authored.title,
    subjectTheme: input.decor,
    topicSlug: authored.topic,
    topicName: input.topicLabel,
    difficulty: authored.difficulty,
    width: authored.width,
    height: authored.height,
    grid,
    entries,
    author: authored.author,
    introduction: null,
    completionMessage: null,
    estimatedSolveTime: authored.estimatedSolveTime ?? null,
    normalization: undefined,
    status: "draft",
    factCards: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Validate, repair, then return                                              */
/* -------------------------------------------------------------------------- */

/** Entry codes a clue swap can plausibly fix. */
const CLUE_ERROR_CODES = new Set(["duplicate_clue", "answer_in_clue", "missing_clue"]);

/** Swap one clue for another from the same word. Returns false when stuck. */
function swapClue(placement: Placement, clues: string[], index: number): boolean {
  const options = placement.candidate.word.clues.filter(
    (clue) => clue.trim().length > 0 && !clues.includes(clue)
  );
  if (options.length === 0) return false;
  clues[index] = options[0];
  return true;
}

/**
 * Type the answer key into an empty grid and check it solves. This is a real
 * check, not a formality: it is the only thing that proves the stored answers,
 * the derived grid and the per-language normalization all agree, which is
 * exactly where an Arabic spelling variant or a stray separator would show up.
 */
function testSolve(
  grid: Grid,
  entries: EntryDef[],
  language: PuzzleLanguage
): { solved: boolean; cells: number } {
  const state = emptyAttempt(grid[0]?.length ?? 0, grid.length);
  for (const entry of entries) {
    const letters = answerToCells(entry.answer, language);
    const cells = entryCells(entry, letters.length);
    cells.forEach(({ row, column }, index) => {
      const cell = state.cells[row]?.[column];
      if (cell) cell.letter = letters[index];
    });
  }
  const summary = summarizeAttempt(state, grid, entries, language);
  return { solved: summary.solved, cells: summary.open };
}

/** How many cells two entries share, for the crossings readout. */
function countCrossings(placements: Placement[]): number {
  const seen = new Map<string, number>();
  for (const placement of placements) {
    for (const [r, c] of cellsOf(placement)) {
      const key = cellKey(r, c);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  return [...seen.values()].filter((n) => n > 1).length;
}

/**
 * Build one puzzle from a word list: assemble, guard, number, validate,
 * test-solve, and repair or regenerate on failure until the attempt budget runs
 * out.
 *
 * Written as a generator so the pipeline can be driven a stage at a time: each
 * `yield` marks work that has genuinely happened. `buildPuzzle` below runs it
 * straight through for callers that only want the result.
 */
export function* buildPuzzleSteps(
  input: BuildInput
): Generator<StageEvent, GenerateResult, void> {
  const spec = SIZE_SPECS[input.size];
  let pass = 1;

  yield { stage: "planning", status: "running", pass };
  const all = toCandidates(input.words, input.language);
  const candidates = bandCandidates(all, input.difficulty);
  if (candidates.length < spec.floor) {
    yield {
      stage: "planning",
      status: "failed",
      pass,
      detail: { words: candidates.length, check: "not_enough_words" },
    };
    return { ok: false, reason: "not_enough_words", stage: "planning", check: "not_enough_words" };
  }
  yield { stage: "planning", status: "done", pass, detail: { words: candidates.length } };

  let assembled = 0;
  let repairs = 0;
  let lastStage: StageId = "grid";
  let lastCheck: string | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(deriveSeed(input.seed, attempt));
    yield { stage: "grid", status: "running", pass };
    const board = assemble(candidates, spec, rng);
    if (board.placed.length < spec.floor) {
      lastStage = "grid";
      lastCheck = "below_entry_floor";
      yield {
        stage: "grid",
        status: "retrying",
        pass,
        detail: { entries: board.placed.length, check: "below_entry_floor" },
      };
      pass++;
      continue;
    }
    assembled++;
    yield { stage: "grid", status: "done", pass, detail: { entries: board.placed.length } };

    let placements = board.placed.slice();
    let clues = pickClues(placements, rng);
    let drops = 0;
    let clueRepairs = 0;
    /** Set once the clue stage has been reported for this assembly pass. */
    let cluesReported = false;

    // Repair loop: drop an entry the guards object to, or swap a clue the
    // validator objects to, before giving up on this assembly pass.
    for (;;) {
      yield { stage: "crossings", status: "running", pass };
      const guard = runGuards(placements, input.language);
      if (!guard.ok) {
        lastStage = "crossings";
        lastCheck = guard.code;
        if (
          guard.offender === null ||
          drops >= MAX_DROPS ||
          placements.length - 1 < spec.floor
        ) {
          yield { stage: "crossings", status: "retrying", pass, detail: { check: guard.code } };
          break;
        }
        placements = placements.filter((_, i) => i !== guard.offender);
        clues = clues.filter((_, i) => i !== guard.offender);
        drops++;
        repairs++;
        yield {
          stage: "crossings",
          status: "retrying",
          pass,
          detail: { check: guard.code, repairs },
        };
        continue;
      }
      yield {
        stage: "crossings",
        status: "done",
        pass,
        detail: { entries: placements.length, crossings: countCrossings(placements) },
      };

      if (!cluesReported) {
        yield { stage: "clues", status: "running", pass };
        cluesReported = true;
      }

      const authored = buildAuthored(placements, clues, input, attempt);
      let numbered;
      try {
        numbered = numberAuthoredPuzzle(authored);
      } catch {
        lastStage = "validating";
        lastCheck = "numbering_failed";
        yield {
          stage: "validating",
          status: "retrying",
          pass,
          detail: { check: "numbering_failed" },
        };
        break;
      }

      yield { stage: "validating", status: "running", pass };
      const result = validatePuzzle(numbered);
      if (result.valid && result.grid) {
        yield { stage: "clues", status: "done", pass, detail: { entries: clues.length, repairs } };
        yield { stage: "validating", status: "done", pass, detail: { errors: 0 } };

        yield { stage: "test-solving", status: "running", pass };
        const solve = testSolve(result.grid, numbered.entries, input.language);
        if (!solve.solved) {
          // The answer key does not reproduce the grid. Never returned to a
          // player: the pass is thrown away and another one is assembled.
          lastStage = "test-solving";
          lastCheck = "answer_key_mismatch";
          yield {
            stage: "test-solving",
            status: "retrying",
            pass,
            detail: { check: "answer_key_mismatch", cells: solve.cells },
          };
          break;
        }
        yield { stage: "test-solving", status: "done", pass, detail: { cells: solve.cells } };

        yield { stage: "finalising", status: "running", pass };
        const puzzle = toPlayable(numbered.entries, authored, result.grid, input);
        yield {
          stage: "finalising",
          status: "done",
          pass,
          detail: { difficulty: puzzle.difficulty, requested: input.difficulty, repairs },
        };
        return {
          ok: true,
          puzzle,
          attempts: assembled,
          repairs,
          difficulty: puzzle.difficulty,
          requestedDifficulty: input.difficulty,
        };
      }

      lastStage = "validating";
      lastCheck = result.errors[0]?.code ?? "validation_failed";

      // Clue-level errors are repairable in place; anything else needs a new
      // assembly pass with a derived seed.
      const clueError = result.errors.find((issue) => CLUE_ERROR_CODES.has(issue.code));
      if (!clueError?.entry || clueRepairs >= MAX_CLUE_REPAIRS) {
        yield {
          stage: "validating",
          status: "retrying",
          pass,
          detail: { errors: result.errors.length, check: lastCheck },
        };
        break;
      }
      const offender = numbered.entries.find(
        (entry) =>
          entry.number === clueError.entry?.number &&
          entry.direction === clueError.entry?.direction
      );
      const index = offender
        ? placements.findIndex(
            (p) => p.candidate.word.answer === offender.answer && p.direction === offender.direction
          )
        : -1;
      if (index < 0 || !swapClue(placements[index], clues, index)) {
        yield {
          stage: "validating",
          status: "retrying",
          pass,
          detail: { errors: result.errors.length, check: lastCheck },
        };
        break;
      }
      clueRepairs++;
      repairs++;
      yield {
        stage: "clues",
        status: "retrying",
        pass,
        detail: { check: clueError.code, repairs },
      };
    }
    pass++;
  }

  const reason: GenerateFailure = assembled === 0 ? "no_interlock" : "validation_failed";
  yield { stage: lastStage, status: "failed", pass: pass - 1, detail: { check: lastCheck } };
  return { ok: false, reason, stage: lastStage, check: lastCheck };
}

/** Run the pipeline straight through. Same contract as before stages existed. */
export function buildPuzzle(input: BuildInput): GenerateResult {
  const steps = buildPuzzleSteps(input);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
  }
}

/* -------------------------------------------------------------------------- */
/* Theme entry points                                                         */
/* -------------------------------------------------------------------------- */

/** Minutes a player asks for, mapped to a grid size. */
export function sizeForMinutes(minutes: number): PuzzleSize {
  if (minutes <= 6) return "small";
  if (minutes <= 12) return "medium";
  return "large";
}

/** Rough minutes a size takes, for showing the mapping back to the player. */
export function minutesForSize(size: PuzzleSize): number {
  return { small: 5, medium: 10, large: 16 }[size];
}

/** The build input a themed request turns into. Shared by both entry points. */
function themedInput(opts: GenerateOptions): BuildInput {
  const meta = THEME_META[opts.theme];
  const words = filterWords(bankFor(opts.language, opts.theme), opts);
  return {
    words,
    language: opts.language,
    size: opts.size,
    difficulty: opts.difficulty,
    seed: opts.seed,
    slugBase: `playground-${opts.language}-${opts.theme}`,
    title: themeTitle(opts.language, opts.theme),
    plainTitle: (opts.tone ?? meta.tone) === "archival",
    themeEntries: opts.themeEntries,
    subject: meta.subject,
    topic: meta.collection,
    topicLabel: PLAYGROUND_LABEL[opts.language],
    decor: meta.decor,
  };
}

export function generatePuzzleResult(opts: GenerateOptions): GenerateResult {
  return buildPuzzle(themedInput(opts));
}

/** The same generation, yielding one event per real pipeline stage. */
export function generatePuzzleSteps(
  opts: GenerateOptions
): Generator<StageEvent, GenerateResult, void> {
  return buildPuzzleSteps(themedInput(opts));
}

/**
 * Build one themed puzzle. Returns null when the theme cannot produce a valid
 * puzzle at the requested size — the caller shows `playground.failed`.
 */
export function generatePuzzle(opts: GenerateOptions): PlayablePuzzle | null {
  const result = generatePuzzleResult(opts);
  return result.ok ? result.puzzle : null;
}
