import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import type { Tone } from "@/content/taxonomy/types";
import {
  subjectsFor,
  themeForCollection,
  themesFor,
  themesForSubject,
  THEME_META,
  type PlaygroundTheme,
} from "./banks";
import { DEFAULT_THEME_ENTRIES, sizeForMinutes, type PuzzleSize } from "./generate";
import type { PuzzleRequest } from "./request";

/**
 * The guided form behind the Playground.
 *
 * It is a superset of {@link PuzzleRequest} — everything the free-text request
 * box can set, plus the fields that only the form offers. The request box fills
 * this in rather than bypassing it, so a player always sees what was understood
 * and can correct it before anything is built.
 */
export interface PlaygroundForm extends PuzzleRequest {
  /** Where the words come from: a curated bank, or the player's own notes. */
  source: "bank" | "notes";
  /** A topic the player typed. Matched against known collections; never faked. */
  customTopic: string;
  /** Overrides the theme's own register. null keeps the theme's default. */
  tone: Tone | null;
  /** How many of the longest answers are flagged as theme entries (1–5). */
  themeEntries: number;
  /** Pasted source text, for `source: "notes"`. */
  notes: string;
  /** Player-chosen title. Empty means the generator names it. */
  title: string;
}

export function defaultForm(language: PuzzleLanguage): PlaygroundForm {
  const subject = subjectsFor(language)[0];
  const theme = themesForSubject(language, subject)[0];
  return {
    language,
    subject,
    collection: THEME_META[theme].collection,
    theme,
    difficulty: null,
    size: "small",
    minutes: null,
    familyFriendly: false,
    allowProperNouns: true,
    allowAbbreviations: true,
    source: "bank",
    customTopic: "",
    tone: null,
    themeEntries: DEFAULT_THEME_ENTRIES,
    notes: "",
    title: "",
  };
}

/** Merge a parsed free-text request into the form, keeping the form-only fields. */
export function applyRequest(form: PlaygroundForm, request: PuzzleRequest): PlaygroundForm {
  return { ...form, ...request };
}

/**
 * Keep the form internally consistent after a language or subject change: a
 * theme that has no bank in the chosen language is replaced by one that does,
 * and the collection slug always follows the theme.
 */
export function reconcile(form: PlaygroundForm): PlaygroundForm {
  const available = themesFor(form.language);
  if (available.length === 0) return form;

  const subjects = subjectsFor(form.language);
  const subject =
    form.subject && subjects.includes(form.subject) ? form.subject : subjects[0];
  const inSubject = themesForSubject(form.language, subject);
  const theme =
    form.theme && inSubject.includes(form.theme) ? form.theme : inSubject[0] ?? available[0];

  return {
    ...form,
    subject: THEME_META[theme].subject,
    theme,
    collection: THEME_META[theme].collection,
    themeEntries: Math.max(1, Math.min(5, Math.round(form.themeEntries))),
  };
}

export function withLanguage(form: PlaygroundForm, language: PuzzleLanguage): PlaygroundForm {
  return reconcile({ ...form, language });
}

export function withSubject(form: PlaygroundForm, subject: string): PlaygroundForm {
  const theme = themesForSubject(form.language, subject)[0] ?? form.theme;
  return reconcile({ ...form, subject, theme });
}

export function withTheme(form: PlaygroundForm, theme: PlaygroundTheme): PlaygroundForm {
  return reconcile({ ...form, theme, subject: THEME_META[theme].subject });
}

export function withMinutes(form: PlaygroundForm, minutes: number | null): PlaygroundForm {
  if (minutes === null) return { ...form, minutes: null };
  return { ...form, minutes, size: sizeForMinutes(minutes) };
}

export function withSize(form: PlaygroundForm, size: PuzzleSize): PlaygroundForm {
  return { ...form, size, minutes: null };
}

export function withDifficulty(form: PlaygroundForm, difficulty: Difficulty | null) {
  return { ...form, difficulty };
}

/**
 * What a typed topic resolves to.
 *
 * `matched` means a curated bank exists for it. `unknown` means it does not —
 * and the Playground says so rather than quietly building something else. There
 * is no third option where a topic is invented.
 */
export type TopicResolution =
  | { kind: "empty" }
  | { kind: "matched"; theme: PlaygroundTheme }
  | { kind: "other-language"; theme: PlaygroundTheme; languages: PuzzleLanguage[] }
  | { kind: "unknown" };

const fold = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

/**
 * Resolve a typed topic against the curated collections. Slug-folded exact and
 * prefix matches only — a fuzzy guess here would be a guess presented as a fact.
 */
export function resolveCustomTopic(
  language: PuzzleLanguage,
  raw: string
): TopicResolution {
  const needle = fold(raw);
  if (needle.length < 2) return { kind: "empty" };

  const direct = themeForCollection(language, needle);
  if (direct) return { kind: "matched", theme: direct };

  const candidates = themesFor(language).filter((theme) => {
    const meta = THEME_META[theme];
    return (
      fold(theme).includes(needle) ||
      fold(meta.collection).includes(needle) ||
      fold(meta.subject).includes(needle)
    );
  });
  if (candidates[0]) return { kind: "matched", theme: candidates[0] };

  // The bank may exist in a language the player did not ask for.
  const elsewhere: PuzzleLanguage[] = [];
  let found: PlaygroundTheme | null = null;
  for (const other of ["en", "fr", "ar"] as const) {
    if (other === language) continue;
    const match = themesFor(other).find((theme) => {
      const meta = THEME_META[theme];
      return (
        fold(theme).includes(needle) ||
        fold(meta.collection).includes(needle) ||
        fold(meta.subject).includes(needle)
      );
    });
    if (match) {
      found = found ?? match;
      elsewhere.push(other);
    }
  }
  if (found) return { kind: "other-language", theme: found, languages: elsewhere };

  return { kind: "unknown" };
}
