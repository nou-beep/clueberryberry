import { answerToCells, normalizeAnswer } from "@/lib/crossword/normalize";
import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import {
  buildPuzzle,
  buildPuzzleSteps,
  type BuildInput,
  type GenerateFailure,
  type GenerateSuccess,
  type PuzzleSize,
} from "./generate";
import type { BankWord, WordDifficulty } from "./banks";
import type { StageEvent } from "./stages";

/**
 * Notes → puzzle.
 *
 * Paste a page of revision notes and get a crossword whose clues are
 * fill-in-the-blank sentences taken from the notes themselves, with the answer
 * blanked out. No model is involved: this is frequency counting, stop-wording
 * and sentence slicing, which is exactly why it works offline and is honest
 * about what it is.
 */

export interface NotesOptions {
  text: string;
  language: PuzzleLanguage;
  size: PuzzleSize;
  difficulty?: Difficulty;
  seed: number;
  /** Title for the puzzle; a localized default is used when omitted. */
  title?: string;
}

export type NotesFailure =
  /** Fewer than the minimum characters or words to work with. */
  | "text_too_short"
  /** Enough text, but too few words that could carry a clue. */
  | "not_enough_words"
  | GenerateFailure;

export type NotesResult =
  | (GenerateSuccess & { words: number })
  | { ok: false; reason: NotesFailure; stage?: StageEvent["stage"]; check?: string };

/** Below these, there is nothing to build a grid from. */
const MIN_CHARACTERS = 150;
const MIN_WORDS = 30;
/** Words needed before an interlocking grid is even plausible. */
const MIN_CANDIDATES = 12;
/** How many candidates to hand the generator. */
const MAX_CANDIDATES = 40;
/** Clue window, in words either side of the blank. */
const CLUE_CONTEXT = 7;
/** The blank that replaces the answer in its own sentence. */
const BLANK = "____";

const DEFAULT_TITLE: Record<PuzzleLanguage, string> = {
  en: "From your notes",
  fr: "D'après vos notes",
  ar: "من ملاحظاتك",
};

const SOURCE_PREFIX: Record<PuzzleLanguage, string> = {
  en: "From your notes: ",
  fr: "D'après vos notes : ",
  ar: "من ملاحظاتك: ",
};

/** Function words that must never become answers. */
const STOPWORDS: Record<PuzzleLanguage, string[]> = {
  en: [
    "the", "and", "but", "for", "not", "with", "that", "this", "these", "those", "from",
    "have", "has", "had", "was", "were", "are", "been", "being", "which", "when", "where",
    "what", "who", "whom", "whose", "how", "why", "then", "than", "them", "they", "their",
    "there", "here", "into", "onto", "over", "under", "also", "some", "any", "all", "each",
    "both", "such", "very", "more", "most", "other", "others", "same", "can", "could",
    "would", "should", "will", "shall", "may", "might", "must", "does", "did", "doing",
    "because", "while", "about", "after", "before", "between", "during", "through",
    "however", "therefore", "thus", "example", "called", "known", "using", "used", "use",
  ],
  fr: [
    "les", "des", "une", "aux", "avec", "dans", "pour", "par", "sur", "sous", "entre",
    "mais", "donc", "car", "que", "qui", "quoi", "dont", "cette", "cet", "ces", "son",
    "sat", "ses", "leur", "leurs", "nos", "vos", "notre", "votre", "est", "sont", "etre",
    "etait", "etaient", "ont", "avait", "avaient", "avoir", "fait", "font", "faire",
    "plus", "moins", "tres", "tout", "tous", "toute", "toutes", "aussi", "meme", "memes",
    "comme", "quand", "alors", "ainsi", "cependant", "toutefois", "exemple", "appele",
    "appelee", "utilise", "utilisee", "peut", "peuvent", "doit", "doivent", "elle",
    "elles", "ils", "lui", "nous", "vous", "chaque", "certains", "autre", "autres",
  ],
  ar: [
    "من", "الى", "على", "عن", "في", "مع", "بين", "بعد", "قبل", "عند", "لكن", "لان",
    "التي", "الذي", "الذين", "هذا", "هذه", "ذلك", "تلك", "هناك", "كان", "كانت", "يكون",
    "تكون", "هو", "هي", "هم", "كل", "بعض", "غير", "ايضا", "ايضاً", "كما", "حيث", "عندما",
    "ثم", "قد", "لقد", "ولا", "الا", "اما", "اذا", "حتى", "منها", "منه", "به", "بها",
    "له", "لها", "عليه", "عليها", "فيه", "فيها", "مثل", "مثلا", "يسمى", "تسمى", "يستخدم",
    "تستخدم", "يمكن", "لكي", "او", "ان", "انه", "انها", "وهو", "وهي", "التى",
  ],
};

interface Candidate {
  /** Normalized answer, as it will appear in the grid. */
  answer: string;
  /** Raw form as it appeared, used to blank it out of its sentence. */
  surface: string;
  frequency: number;
  sentence: string;
}

/** Split into sentences on terminal punctuation and line breaks. */
function sentencesOf(text: string): string[] {
  return text
    .split(/[.!?؟…؛;\n\r]+/u)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 0);
}

function wordsOf(sentence: string): string[] {
  return sentence.split(/[^\p{L}\p{N}'’-]+/u).filter((word) => word.length > 0);
}

/**
 * Frequency- and length-filtered candidate answers, each tied to the shortest
 * sentence it appeared in (short sentences make tighter clues).
 */
function collectCandidates(text: string, language: PuzzleLanguage): Candidate[] {
  const stop = new Set(STOPWORDS[language].map((word) => normalizeAnswer(word, language)));
  const found = new Map<string, Candidate>();

  for (const sentence of sentencesOf(text)) {
    const words = wordsOf(sentence);
    if (words.length < 4) continue;
    for (const word of words) {
      const answer = normalizeAnswer(word, language);
      if (stop.has(answer)) continue;
      const cells = answerToCells(answer, language);
      if (cells.length < 3 || cells.length > 9) continue;
      if (/^\d+$/.test(answer)) continue;
      const existing = found.get(answer);
      if (!existing) {
        found.set(answer, { answer, surface: word, frequency: 1, sentence });
        continue;
      }
      existing.frequency++;
      if (sentence.length < existing.sentence.length) existing.sentence = sentence;
    }
  }

  return [...found.values()].sort(
    (a, b) =>
      b.frequency - a.frequency ||
      Math.abs(6 - a.answer.length) - Math.abs(6 - b.answer.length) ||
      a.answer.localeCompare(b.answer)
  );
}

/** True when a clue still gives the answer away. */
function clueLeaks(clue: string, answer: string, language: PuzzleLanguage): boolean {
  const target = normalizeAnswer(answer, language);
  if (target.length < 3) return false;
  for (const word of wordsOf(clue)) {
    const token = normalizeAnswer(word, language);
    if (token.length < 3) continue;
    if (token === target) return true;
    // Same rule the validator uses: a shared five-character stem counts.
    if (
      target.length >= 5 &&
      (token.startsWith(target.slice(0, 5)) || target.startsWith(token.slice(0, 5))) &&
      (token.includes(target) || target.includes(token))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Blank the answer out of its sentence and trim the sentence to a window around
 * the blank, so the clue reads as a fill-in-the-blank rather than a paragraph.
 */
function clueFor(
  candidate: Candidate,
  language: PuzzleLanguage
): { clue: string; source: string } | null {
  const words = wordsOf(candidate.sentence);
  const target = normalizeAnswer(candidate.answer, language);
  const blanked = words.map((word) =>
    normalizeAnswer(word, language) === target ? BLANK : word
  );
  const first = blanked.indexOf(BLANK);
  if (first < 0) return null;

  const start = Math.max(0, first - CLUE_CONTEXT);
  const end = Math.min(blanked.length, first + CLUE_CONTEXT + 1);
  const window = blanked.slice(start, end);
  if (window.filter((word) => word !== BLANK).length < 3) return null;

  const clue = `${start > 0 ? "… " : ""}${window.join(" ")}${
    end < blanked.length ? " …" : ""
  }`;
  if (clueLeaks(clue, candidate.answer, language)) return null;
  return { clue, source: candidate.sentence };
}

/** Rarer and longer words are rated harder; common short ones easier. */
function ratingFor(candidate: Candidate): WordDifficulty {
  const long = candidate.answer.length >= 8;
  if (candidate.frequency >= 3) return long ? 2 : 1;
  if (candidate.frequency === 2) return long ? 3 : 2;
  return long ? 4 : 3;
}

/**
 * Build a puzzle from pasted notes. Fails cleanly and specifically: too short,
 * nothing crossable, or no valid grid after the generator's repair attempts.
 */
export function puzzleFromNotes(options: NotesOptions): NotesResult {
  const prepared = prepareNotes(options);
  if (!prepared.ok) return prepared;
  const result = buildPuzzle(prepared.input);
  return result.ok ? { ...result, words: prepared.words } : result;
}

/**
 * The same build, yielding one event per real pipeline stage. Word extraction
 * happens before the generator starts, so a text that is too short fails here
 * rather than reporting a stage that never ran.
 */
export function* puzzleFromNotesSteps(
  options: NotesOptions
): Generator<StageEvent, NotesResult, void> {
  const prepared = prepareNotes(options);
  if (!prepared.ok) return prepared;
  const result = yield* buildPuzzleSteps(prepared.input);
  return result.ok ? { ...result, words: prepared.words } : result;
}

type PreparedNotes =
  | { ok: true; input: BuildInput; words: number }
  | { ok: false; reason: NotesFailure };

/** Extract candidate answers and clues from the pasted text. */
function prepareNotes(options: NotesOptions): PreparedNotes {
  const text = options.text.trim();
  if (text.length < MIN_CHARACTERS || wordsOf(text).length < MIN_WORDS) {
    return { ok: false, reason: "text_too_short" };
  }

  const words: BankWord[] = [];
  const usedClues = new Set<string>();
  for (const candidate of collectCandidates(text, options.language)) {
    if (words.length >= MAX_CANDIDATES) break;
    const built = clueFor(candidate, options.language);
    if (!built) continue;
    const key = built.clue.toLowerCase();
    if (usedClues.has(key)) continue;
    usedClues.add(key);
    words.push({
      answer: candidate.answer,
      clues: [built.clue],
      difficulty: ratingFor(candidate),
      note: `${SOURCE_PREFIX[options.language]}${built.source}`,
    });
  }

  if (words.length < MIN_CANDIDATES) return { ok: false, reason: "not_enough_words" };

  return {
    ok: true,
    words: words.length,
    input: {
      words,
      language: options.language,
      size: options.size,
      difficulty: options.difficulty,
      seed: options.seed,
      slugBase: `playground-notes-${options.language}`,
      title: options.title?.trim() || DEFAULT_TITLE[options.language],
      plainTitle: true,
      subject: "notes",
      topic: "notes",
      topicLabel: DEFAULT_TITLE[options.language],
      decor: "literature",
    },
  };
}
