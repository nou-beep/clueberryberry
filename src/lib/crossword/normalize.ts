import type { NormalizationRules, PuzzleLanguage } from "./types";

export const DEFAULT_ARABIC_RULES: NormalizationRules = {
  foldAlef: true,
  foldYa: true,
  foldTaMarbuta: false,
  // ؤ and ئ are distinct letters, not decorated variants: never folded
  // unless a puzzle (or the player) explicitly asks for it.
  foldHamzaWaw: false,
  foldHamzaYa: false,
  removeTatweel: true,
  removeDiacritics: true,
};

export const DEFAULT_LATIN_RULES: NormalizationRules = {
  foldAlef: false,
  foldYa: false,
  foldTaMarbuta: false,
  foldHamzaWaw: false,
  foldHamzaYa: false,
  removeTatweel: false,
  removeDiacritics: true,
};

export function rulesFor(
  language: PuzzleLanguage,
  overrides?: Partial<NormalizationRules>
): NormalizationRules {
  const base = language === "ar" ? DEFAULT_ARABIC_RULES : DEFAULT_LATIN_RULES;
  return { ...base, ...overrides };
}

const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

export function isArabicChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f);
}

/**
 * Normalize a single letter or a whole answer for comparison.
 * Latin: uppercase, strip accents/diacritics (French crossword convention:
 * É and E share a square). Arabic: apply configurable folds; never require
 * diacritics from the solver.
 */
export function normalizeAnswer(
  raw: string,
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): string {
  const r = rulesFor(language, rules);
  let s = raw.trim();

  if (language === "ar") {
    if (r.removeDiacritics) s = s.replace(HARAKAT, "");
    if (r.removeTatweel) s = s.replace(TATWEEL, "");
    if (r.foldAlef) s = s.replace(/[أإآ]/g, "ا"); // أ إ آ → ا
    if (r.foldYa) s = s.replace(/ى/g, "ي"); // ى → ي
    if (r.foldTaMarbuta) s = s.replace(/ة/g, "ه"); // ة → ه
    // Hamza on waw/ya are distinct letters and are NOT folded by default.
    if (r.foldHamzaWaw) s = s.replace(/ؤ/g, "و"); // ؤ → و
    if (r.foldHamzaYa) s = s.replace(/ئ/g, "ي"); // ئ → ي
    s = s.replace(/\s+/g, "");
    return s;
  }

  // Latin scripts (en, fr)
  s = s.toUpperCase();
  if (r.removeDiacritics) {
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  s = s.replace(/Œ/g, "OE").replace(/Æ/g, "AE").replace(/ß/gi, "SS");
  s = s.replace(/[^A-Z0-9]/g, "");
  return s;
}

/** Normalize a single typed character for cell comparison. */
export function normalizeLetter(
  ch: string,
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): string {
  return normalizeAnswer(ch, language, rules);
}

/**
 * Check a full guess against an answer and its accepted alternatives.
 * Alternatives are stored raw and normalized here so per-answer rule
 * overrides (e.g. accepting ة/ه for one word) behave consistently.
 */
export function answerMatches(
  guess: string,
  answer: string,
  language: PuzzleLanguage,
  acceptedAlternatives: string[] = [],
  rules?: Partial<NormalizationRules>
): boolean {
  const g = normalizeAnswer(guess, language, rules);
  if (g.length === 0) return false;
  if (g === normalizeAnswer(answer, language, rules)) return true;
  return acceptedAlternatives.some(
    (alt) => normalizeAnswer(alt, language, rules) === g
  );
}

/** Split an answer into grid letters (one code point per cell, combining marks stripped). */
export function answerToCells(
  answer: string,
  language: PuzzleLanguage,
  rules?: Partial<NormalizationRules>
): string[] {
  return Array.from(normalizeAnswer(answer, language, rules));
}
