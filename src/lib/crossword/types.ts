export type PuzzleLanguage = "en" | "fr" | "ar";

export type Direction = "across" | "down";

export type Difficulty = "easy" | "medium" | "hard";

export const CLUE_STYLES = [
  "definition",
  "wordplay",
  "misdirection",
  "fill_in_blank",
  "cultural",
  "historical",
  "scientific",
  "abbreviation",
  "phrase",
  "pun",
  "trivia",
  "everyday",
  "cross_language",
  "quotation",
  "proper_noun",
] as const;

export type ClueStyle = (typeof CLUE_STYLES)[number];

export const PUZZLE_STATUSES = [
  "draft",
  "needs_review",
  "in_review",
  "revisions_requested",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;

export type PuzzleStatus = (typeof PUZZLE_STATUSES)[number];

/** Solution letter for an open cell, or null for a block. */
export type GridCell = string | null;

/** Row-major solution grid. For RTL languages column 0 is still the first
 * letter of an across entry; rendering mirrors the grid horizontally. */
export type Grid = GridCell[][];

export interface EntryDef {
  number: number;
  direction: Direction;
  row: number;
  column: number;
  answer: string;
  clue: string;
  clueStyle: ClueStyle;
  acceptedAlternatives?: string[];
  explanation?: string;
  sourceNotes?: string;
  difficultyRating?: number;
  isThemeEntry?: boolean;
}

export interface NormalizationRules {
  /** Fold hamza/madda alef variants (أ إ آ) to bare alef. Default true for Arabic. */
  foldAlef: boolean;
  /** Fold alef maqsura (ى) to ya (ي). Default true for Arabic. */
  foldYa: boolean;
  /** Fold ta marbuta (ة) to ha (ه). Default false — only when explicitly accepted per answer. */
  foldTaMarbuta: boolean;
  /** Fold hamza on waw (ؤ) to waw (و). Default false — ؤ is its own letter. */
  foldHamzaWaw: boolean;
  /** Fold hamza on ya (ئ) to ya (ي). Default false — ئ is its own letter. */
  foldHamzaYa: boolean;
  /** Strip tatweel (ـ). Default true. */
  removeTatweel: boolean;
  /** Strip harakat/diacritics. Default true. */
  removeDiacritics: boolean;
}

export interface PuzzleDef {
  slug: string;
  title: string;
  language: PuzzleLanguage;
  subject: string; // subject slug
  topic: string; // topic slug
  difficulty: Difficulty;
  width: number;
  height: number;
  /** Optional: derived from entries when omitted. */
  grid?: Grid;
  entries: EntryDef[];
  author: string;
  editor?: string;
  status?: PuzzleStatus;
  publicationDate?: string; // ISO date
  estimatedSolveTime?: number; // seconds
  introduction?: string;
  completionMessage?: string;
  symmetry?: boolean;
  normalization?: Partial<NormalizationRules>;
  factCards?: FactCardDef[];
}

export interface FactCardDef {
  text: string;
  sourceTitle?: string;
  sourceUrl?: string;
  reviewStatus?: "needs_review" | "verified";
}

/** A numbered slot found in the grid (before matching against entries). */
export interface Slot {
  number: number;
  direction: Direction;
  row: number;
  column: number;
  length: number;
}

export interface NumberedGrid {
  /** Cell number for cells that start a slot, keyed by "row,col". */
  numbers: Map<string, number>;
  slots: Slot[];
}

export type CellFlag = "revealed" | "checked-wrong" | "confirmed";

export interface AttemptCellState {
  letter: string; // as typed (pre-normalization), "" when empty
  flags: CellFlag[];
}

export interface AttemptGridState {
  cells: AttemptCellState[][]; // same dimensions as grid; block cells carry empty state
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  entry?: { number: number; direction: Direction };
  cell?: { row: number; column: number };
}

export const cellKey = (row: number, column: number) => `${row},${column}`;
