import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import {
  PLAYGROUND_THEMES,
  THEME_META,
  themesFor,
  themesForSubject,
  type PlaygroundTheme,
} from "./banks";
import { sizeForMinutes, type PuzzleSize } from "./generate";

/**
 * The request interpreter.
 *
 * This is a local, deterministic parser — a keyword grammar over the three
 * interface languages. There is no language model in this application, and this
 * file does not pretend otherwise: it recognises the phrases listed below and
 * reports, honestly, whatever it could not place. A subject is never guessed.
 */

export type RequestField =
  | "language"
  | "subject"
  | "collection"
  | "difficulty"
  | "size"
  | "minutes"
  | "familyFriendly"
  | "properNouns"
  | "abbreviations"
  | "repeat";

export interface PuzzleRequest {
  /** Language the puzzle itself is written in. */
  language: PuzzleLanguage;
  subject: string | null;
  collection: string | null;
  /** The bank the generator will draw from, resolved from subject/collection. */
  theme: PlaygroundTheme | null;
  difficulty: Difficulty | null;
  size: PuzzleSize;
  /** Approximate completion time in minutes, when one was asked for. */
  minutes: number | null;
  familyFriendly: boolean;
  allowProperNouns: boolean;
  allowAbbreviations: boolean;
}

export interface MatchedField {
  field: RequestField;
  /** The resolved value, as a slug or flag string. */
  value: string;
  /** The words in the request that produced it. */
  phrase: string;
  /** Which language's phrasing matched. */
  language: PuzzleLanguage;
}

/** Values carried over from the last completed attempt, or the UI controls. */
export interface RequestDefaults {
  language?: PuzzleLanguage;
  subject?: string | null;
  collection?: string | null;
  theme?: PlaygroundTheme | null;
  difficulty?: Difficulty | null;
  size?: PuzzleSize;
  familyFriendly?: boolean;
  allowProperNouns?: boolean;
  allowAbbreviations?: boolean;
}

export interface ParsedRequest {
  request: PuzzleRequest;
  matched: MatchedField[];
  /** Meaningful words the grammar did not recognise. */
  unmatched: string[];
  /** The request asked for another puzzle like the last one. */
  repeatLast: boolean;
  /** A theme was named, but it has no bank in the requested puzzle language. */
  missingBank: PlaygroundTheme | null;
  /** 0–1. The interface asks for confirmation below 0.5. */
  confidence: number;
  /** No topic could be resolved — the interface must ask, not guess. */
  needsTopic: boolean;
}

type Aliases = Partial<Record<PuzzleLanguage, string[]>>;

/* -------------------------------------------------------------------------- */
/* Grammar tables                                                             */
/* -------------------------------------------------------------------------- */

const LANGUAGE_ALIASES: Record<PuzzleLanguage, Aliases> = {
  en: {
    en: ["in english", "english"],
    fr: ["en anglais", "anglais", "anglaise"],
    ar: ["بالانجليزية", "الانجليزية", "انجليزي"],
  },
  fr: {
    en: ["in french", "french"],
    fr: ["en francais", "francais", "francaise"],
    ar: ["بالفرنسية", "الفرنسية", "فرنسي"],
  },
  ar: {
    en: ["in arabic", "arabic"],
    fr: ["en arabe", "arabe"],
    ar: ["بالعربية", "العربية", "عربي"],
  },
};

const DIFFICULTY_ALIASES: Record<Difficulty, Aliases> = {
  easy: {
    en: ["very easy", "easy", "simple", "gentle", "beginner"],
    fr: ["tres facile", "facile", "simple", "debutant", "pour debutants"],
    ar: ["سهلة جدا", "سهل", "سهلة", "بسيط", "بسيطة", "للمبتدئين"],
  },
  medium: {
    en: ["medium", "moderate", "average", "middling"],
    fr: ["moyen", "moyenne", "intermediaire"],
    ar: ["متوسط", "متوسطة"],
  },
  hard: {
    en: ["very hard", "hard", "difficult", "tricky", "challenging", "expert"],
    fr: ["tres difficile", "difficile", "dur", "corse", "expert"],
    ar: ["صعبة جدا", "صعب", "صعبة", "متقدم", "متقدمة", "للخبراء"],
  },
};

const SIZE_ALIASES: Record<PuzzleSize, Aliases> = {
  small: {
    en: ["small grid", "small", "tiny", "little"],
    fr: ["petite grille", "petite", "petit"],
    ar: ["شبكة صغيرة", "صغيرة", "صغير"],
  },
  // A bare "medium" is read as a difficulty, so the medium size needs an
  // explicit mention of the grid or its size.
  medium: {
    en: ["medium grid", "medium sized", "mid sized"],
    fr: ["taille moyenne", "grille de taille moyenne"],
    ar: ["حجم متوسط", "شبكة بحجم متوسط"],
  },
  large: {
    en: ["large grid", "large", "big", "huge"],
    fr: ["grande grille", "grande", "grand"],
    ar: ["شبكة كبيرة", "كبيرة", "كبير"],
  },
};

const SUBJECT_ALIASES: Record<string, Aliases> = {
  biology: {
    en: ["biology", "life science"],
    fr: ["biologie", "sciences de la vie"],
    ar: ["الاحياء", "علم الاحياء", "بيولوجيا"],
  },
  geology: {
    en: ["geology", "earth science"],
    fr: ["geologie", "sciences de la terre"],
    ar: ["علم الارض", "الجيولوجيا", "جيولوجيا"],
  },
  chemistry: { en: ["chemistry"], fr: ["chimie"], ar: ["الكيمياء", "كيمياء"] },
  astronomy: {
    en: ["astronomy", "space"],
    fr: ["astronomie", "espace"],
    ar: ["الفلك", "علم الفلك", "الفضاء"],
  },
  geography: { en: ["geography"], fr: ["geographie"], ar: ["الجغرافيا", "جغرافيا"] },
  mythology: { en: ["mythology"], fr: ["mythologie"], ar: ["الميثولوجيا", "الاساطير"] },
  games: {
    en: ["video games", "gaming", "games"],
    fr: ["jeux video", "jeux"],
    ar: ["العاب الفيديو", "الالعاب"],
  },
  "world-war-ii": {
    en: ["world war ii", "world war 2", "world war two", "wwii", "ww2", "second world war"],
    fr: ["seconde guerre mondiale", "deuxieme guerre mondiale", "39 45"],
    ar: ["الحرب العالمية الثانية", "الحرب الثانية"],
  },
  literature: {
    en: ["literature", "literary studies"],
    fr: ["litterature", "lettres"],
    ar: ["الادب", "الدراسات الادبية"],
  },
  "general-knowledge": {
    en: ["general knowledge", "general trivia", "trivia", "mixed bag"],
    fr: ["culture generale", "connaissances generales"],
    ar: ["معلومات عامة", "ثقافة عامة", "معارف عامة"],
  },
  "taylor-swift": {
    en: ["taylor swift"],
    fr: ["taylor swift"],
    ar: ["تايلور سويفت"],
  },
  "one-direction": {
    en: ["one direction"],
    fr: ["one direction"],
    ar: ["ون دايركشن", "وان دايركشن"],
  },
};

/** Collection-level phrases: these resolve straight to a bank. */
const THEME_ALIASES: Record<PlaygroundTheme, Aliases> = {
  cats: { en: ["cats", "cat"], fr: ["chats", "chat"], ar: ["القطط", "قطط", "قطة"] },
  dinosaurs: {
    en: ["dinosaurs", "dinosaur", "prehistoric life"],
    fr: ["dinosaures", "dinosaure", "vie prehistorique"],
    ar: ["الديناصورات", "ديناصورات"],
  },
  plants: {
    en: ["plants", "plant", "botany"],
    fr: ["plantes", "plante", "botanique"],
    ar: ["النباتات", "نباتات"],
  },
  coffee: { en: ["coffee"], fr: ["cafe"], ar: ["القهوة", "قهوة"] },
  space: {
    en: ["space", "planets", "the solar system", "astronomy"],
    fr: ["espace", "planetes", "systeme solaire"],
    ar: ["الفضاء", "الكواكب", "المجموعة الشمسية"],
  },
  anatomy: {
    en: ["human body", "anatomy", "the body"],
    fr: ["corps humain", "anatomie"],
    ar: ["جسم الانسان", "التشريح"],
  },
  games: {
    en: ["video games", "videogames"],
    fr: ["jeux video"],
    ar: ["العاب الفيديو"],
  },
  weather: {
    en: ["weather", "the weather"],
    fr: ["meteo", "le temps"],
    ar: ["الطقس", "الجو"],
  },
  volcanoes: {
    en: ["volcanoes", "volcanos", "volcano", "volcanic", "lava", "eruptions"],
    fr: ["volcans", "volcan", "lave", "eruptions"],
    ar: ["البراكين", "براكين", "بركان", "الحمم"],
  },
  "greek-mythology": {
    en: ["greek mythology", "greek myths", "greek gods", "greek myth"],
    fr: ["mythologie grecque", "mythes grecs", "dieux grecs"],
    ar: ["الميثولوجيا اليونانية", "الاساطير اليونانية", "الاسطورة اليونانية"],
  },
  "world-war-ii": {
    en: ["world war ii", "world war 2", "world war two", "wwii", "ww2", "second world war"],
    fr: ["seconde guerre mondiale", "deuxieme guerre mondiale"],
    ar: ["الحرب العالمية الثانية", "الحرب الثانية"],
  },
  "general-knowledge": {
    en: ["general knowledge", "trivia"],
    fr: ["culture generale"],
    ar: ["معلومات عامة", "ثقافة عامة"],
  },
  gemstones: {
    en: ["gemstones", "gems", "precious stones"],
    fr: ["pierres precieuses", "gemmes"],
    ar: ["الاحجار الكريمة", "احجار كريمة"],
  },
  oceans: {
    en: ["oceans", "the ocean", "marine biology", "sea life"],
    fr: ["oceans", "biologie marine", "vie marine"],
    ar: ["المحيطات", "الاحياء البحرية", "البحر"],
  },
  literature: {
    en: ["literature", "literary", "books", "novels", "poetry"],
    fr: ["litterature francaise", "litterature", "romans", "poesie", "livres"],
    ar: ["الادب العربي", "الادب", "الشعر", "الرواية", "الكتب"],
  },
  "taylor-swift": { en: ["taylor swift"], fr: ["taylor swift"], ar: ["تايلور سويفت"] },
  "one-direction": {
    en: ["one direction"],
    fr: ["one direction"],
    ar: ["ون دايركشن", "وان دايركشن"],
  },
};

const FAMILY_FRIENDLY: Aliases = {
  en: ["family friendly", "for kids", "for children", "child friendly", "kid safe"],
  fr: ["tout public", "pour enfants", "familial", "adapte aux enfants"],
  ar: ["مناسب للاطفال", "للاطفال", "للعائلة", "عائلي"],
};

const NO_PROPER_NOUNS: Aliases = {
  en: ["no proper nouns", "without proper nouns", "no names", "no proper names"],
  fr: ["sans noms propres", "pas de noms propres"],
  // Arabic aliases are repeated with the "و" conjunction attached, since that
  // is how the second condition in a sentence is normally typed.
  ar: [
    "بدون اسماء اعلام",
    "وبدون اسماء اعلام",
    "دون اسماء اعلام",
    "بلا اسماء اعلام",
    "بدون اسماء",
  ],
};

const YES_PROPER_NOUNS: Aliases = {
  en: ["proper nouns allowed", "with proper nouns", "names allowed"],
  fr: ["avec noms propres", "noms propres autorises"],
  ar: ["مع اسماء الاعلام", "باسماء الاعلام"],
};

const NO_ABBREVIATIONS: Aliases = {
  en: ["no abbreviations", "without abbreviations", "no acronyms"],
  fr: ["sans abreviations", "pas d abreviations", "sans sigles"],
  ar: ["بدون اختصارات", "وبدون اختصارات", "دون اختصارات", "بلا اختصارات"],
};

const YES_ABBREVIATIONS: Aliases = {
  en: ["abbreviations allowed", "with abbreviations"],
  fr: ["avec abreviations", "abreviations autorisees"],
  ar: ["مع الاختصارات", "بالاختصارات"],
};

const REPEAT_LAST: Aliases = {
  en: [
    "another puzzle like the one i just completed",
    "another puzzle like the last one",
    "another one like that",
    "another like the last",
    "same again",
    "one more like that",
    "another puzzle like",
  ],
  fr: [
    "une autre comme celle que je viens de terminer",
    "une autre comme la derniere",
    "encore une comme ca",
    "la meme chose",
    "une autre comme",
  ],
  ar: [
    "شبكة اخرى مثل التي اكملتها",
    "مثل التي اكملتها",
    "واحدة اخرى مثل",
    "مثل السابقة",
    "نفس الشيء",
  ],
};

/** Number words, for "a ten-minute puzzle". */
const NUMBER_WORDS: Record<PuzzleLanguage, Record<string, number>> = {
  en: {
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twelve: 12,
    fifteen: 15,
    twenty: 20,
    thirty: 30,
  },
  fr: {
    trois: 3,
    quatre: 4,
    cinq: 5,
    six: 6,
    sept: 7,
    huit: 8,
    neuf: 9,
    dix: 10,
    douze: 12,
    quinze: 15,
    vingt: 20,
    trente: 30,
  },
  ar: {
    ثلاث: 3,
    اربع: 4,
    خمس: 5,
    ست: 6,
    سبع: 7,
    ثماني: 8,
    تسع: 9,
    عشر: 10,
    عشرة: 10,
    خمسة: 5,
    خمسا: 5,
    ربع: 15,
    عشرين: 20,
    ثلاثين: 30,
  },
};

const MINUTE_WORDS: Aliases = {
  en: ["minute", "minutes", "min", "mins"],
  fr: ["minute", "minutes", "mn"],
  ar: ["دقيقة", "دقائق", "دقيقه"],
};

/** Words that carry no request meaning, so they are not reported as unmatched. */
const STOPWORDS: Record<PuzzleLanguage, string[]> = {
  en: [
    "make", "makes", "made", "create", "build", "give", "get", "want", "would", "like",
    "please", "can", "you", "for", "the", "and", "with", "about", "some", "any", "one",
    "puzzle", "puzzles", "crossword", "crosswords", "grid", "another", "just",
    "completed", "finished", "same", "more", "that", "this", "last", "now", "today",
    "themed", "theme", "topic", "level", "difficulty", "language", "long", "quick",
  ],
  fr: [
    "fais", "faites", "cree", "creer", "construis", "donne", "donnez", "veux", "voudrais",
    "aimerais", "plait", "moi", "nous", "peux", "pour", "les", "des", "une", "grille", "grilles",
    "mots", "croises", "sur", "propos", "avec", "autre", "encore", "meme", "chose",
    "celle", "que", "viens", "terminer", "derniere", "dernier", "niveau", "langue",
    "thematique", "theme", "sujet", "environ",
  ],
  ar: [
    "اعمل", "اصنع", "انشئ", "اعطني", "اريد", "ارجو", "فضلك", "لي", "من", "عن", "حول",
    "شبكة", "شبكات", "كلمات", "متقاطعة", "لغز", "الغاز", "اخرى", "مثل", "التي",
    "اكملتها", "انهيتها", "نفس", "الشيء", "السابقة", "مستوى", "موضوع", "لغة", "حوالي",
    "في", "على", "مع", "الى", "هذه", "تكون", "تقريبا", "لعبة",
  ],
};

/* -------------------------------------------------------------------------- */
/* Normalization and phrase matching                                          */
/* -------------------------------------------------------------------------- */

const ARABIC_MARKS = /[ً-ٰٟـ]/g;

/** Lowercase, de-accent, fold Arabic letter variants, split into tokens. */
function tokenize(text: string): string[] {
  const folded = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  return folded.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0);
}

interface Match {
  start: number;
  end: number;
  phrase: string;
}

/** Find a phrase as a run of whole tokens, preferring the earliest position. */
function findPhrase(tokens: string[], phrase: string): Match | null {
  const needle = tokenize(phrase);
  if (needle.length === 0) return null;
  for (let i = 0; i + needle.length <= tokens.length; i++) {
    let hit = true;
    for (let k = 0; k < needle.length; k++) {
      if (tokens[i + k] !== needle[k]) {
        hit = false;
        break;
      }
    }
    if (hit) return { start: i, end: i + needle.length, phrase: needle.join(" ") };
  }
  return null;
}

/** One scan over an alias table; longest phrases win. */
function matchAliases<T extends string>(
  tokens: string[],
  consumed: boolean[],
  table: Record<string, Aliases>,
  field: RequestField
): { value: T; matched: MatchedField } | null {
  const options: Array<{ value: string; language: PuzzleLanguage; phrase: string }> = [];
  for (const [value, aliases] of Object.entries(table)) {
    for (const language of ["en", "fr", "ar"] as PuzzleLanguage[]) {
      for (const phrase of aliases[language] ?? []) {
        options.push({ value, language, phrase });
      }
    }
  }
  options.sort((a, b) => tokenize(b.phrase).length - tokenize(a.phrase).length);

  for (const option of options) {
    const found = findPhrase(tokens, option.phrase);
    if (!found) continue;
    // A phrase already claimed by a stronger rule must not be reused.
    let free = true;
    for (let i = found.start; i < found.end; i++) if (consumed[i]) free = false;
    if (!free) continue;
    for (let i = found.start; i < found.end; i++) consumed[i] = true;
    return {
      value: option.value as T,
      matched: {
        field,
        value: option.value,
        phrase: found.phrase,
        language: option.language,
      },
    };
  }
  return null;
}

/** A single flag phrase, e.g. "for kids". */
function matchFlag(
  tokens: string[],
  consumed: boolean[],
  aliases: Aliases,
  field: RequestField,
  value: string
): MatchedField | null {
  const result = matchAliases(tokens, consumed, { [value]: aliases }, field);
  return result?.matched ?? null;
}

/** "ten minutes", "10 min", "١٠ دقائق". */
function matchMinutes(
  tokens: string[],
  consumed: boolean[]
): { minutes: number; matched: MatchedField } | null {
  // Both sides of every comparison go through the same folding.
  const minuteWords = new Set(
    (["en", "fr", "ar"] as PuzzleLanguage[]).flatMap((l) =>
      (MINUTE_WORDS[l] ?? []).flatMap(tokenize)
    )
  );
  const numbers = new Map<string, { minutes: number; language: PuzzleLanguage }>();
  for (const language of ["en", "fr", "ar"] as PuzzleLanguage[]) {
    for (const [word, minutes] of Object.entries(NUMBER_WORDS[language])) {
      for (const folded of tokenize(word)) {
        if (!numbers.has(folded)) numbers.set(folded, { minutes, language });
      }
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    if (!minuteWords.has(tokens[i]) || consumed[i]) continue;
    for (const back of [1, 2]) {
      const j = i - back;
      if (j < 0 || consumed[j]) continue;
      const digits = /^\d+$/.test(tokens[j]) ? Number(tokens[j]) : undefined;
      const word = numbers.get(tokens[j]);
      const language = word?.language;
      const minutes = digits ?? word?.minutes;
      if (minutes === undefined || minutes <= 0 || minutes > 180) continue;
      consumed[i] = true;
      consumed[j] = true;
      return {
        minutes,
        matched: {
          field: "minutes",
          value: String(minutes),
          phrase: `${tokens[j]} ${tokens[i]}`,
          language: language ?? "en",
        },
      };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* The interpreter                                                            */
/* -------------------------------------------------------------------------- */

const DEFAULT_SIZE: PuzzleSize = "small";

/**
 * Read a typed request. `locale` is the interface language, used only as the
 * fallback puzzle language; `defaults` carries the current option controls, or
 * the subject/topic/difficulty of the last completed attempt when the player
 * asks for "another one like that".
 */
export function parseRequest(
  text: string,
  locale: PuzzleLanguage,
  defaults: RequestDefaults = {}
): ParsedRequest {
  const tokens = tokenize(text);
  const consumed = tokens.map(() => false);
  const matched: MatchedField[] = [];

  const repeat = matchFlag(tokens, consumed, REPEAT_LAST, "repeat", "last");
  if (repeat) matched.push(repeat);

  const language = matchAliases<PuzzleLanguage>(
    tokens,
    consumed,
    LANGUAGE_ALIASES,
    "language"
  );
  if (language) matched.push(language.matched);
  const puzzleLanguage = language?.value ?? defaults.language ?? locale;

  // Collection phrases are more specific than subject phrases, so they run
  // first and claim their tokens.
  const collection = matchAliases<PlaygroundTheme>(
    tokens,
    consumed,
    THEME_ALIASES,
    "collection"
  );
  const subject = matchAliases<string>(tokens, consumed, SUBJECT_ALIASES, "subject");
  if (collection) matched.push(collection.matched);
  if (subject) matched.push(subject.matched);

  // "medium grid" is a size; a bare "medium" is a difficulty, so the size
  // phrases (which are all explicit about the grid) get first refusal.
  const size = matchAliases<PuzzleSize>(tokens, consumed, SIZE_ALIASES, "size");
  if (size) matched.push(size.matched);

  const difficulty = matchAliases<Difficulty>(
    tokens,
    consumed,
    DIFFICULTY_ALIASES,
    "difficulty"
  );
  if (difficulty) matched.push(difficulty.matched);

  const minutes = matchMinutes(tokens, consumed);
  if (minutes) matched.push(minutes.matched);

  const family = matchFlag(tokens, consumed, FAMILY_FRIENDLY, "familyFriendly", "true");
  if (family) matched.push(family);

  const noProper = matchFlag(tokens, consumed, NO_PROPER_NOUNS, "properNouns", "false");
  const yesProper = noProper
    ? null
    : matchFlag(tokens, consumed, YES_PROPER_NOUNS, "properNouns", "true");
  if (noProper) matched.push(noProper);
  if (yesProper) matched.push(yesProper);

  const noAbbrev = matchFlag(tokens, consumed, NO_ABBREVIATIONS, "abbreviations", "false");
  const yesAbbrev = noAbbrev
    ? null
    : matchFlag(tokens, consumed, YES_ABBREVIATIONS, "abbreviations", "true");
  if (noAbbrev) matched.push(noAbbrev);
  if (yesAbbrev) matched.push(yesAbbrev);

  // Resolve the bank. A collection phrase wins; a bare subject falls back to
  // that subject's first theme with a bank in this language.
  const available = themesFor(puzzleLanguage);
  let theme: PlaygroundTheme | null = collection?.value ?? null;
  let missingBank: PlaygroundTheme | null = null;
  if (theme && !available.includes(theme)) {
    missingBank = theme;
    theme = null;
  }
  if (!theme && subject) {
    theme = themesForSubject(puzzleLanguage, subject.value)[0] ?? null;
    if (!theme) {
      const anyTheme = PLAYGROUND_THEMES.find(
        (candidate) => THEME_META[candidate].subject === subject.value
      );
      missingBank = anyTheme ?? null;
    }
  }
  const repeatLast = repeat !== null;
  if (!theme && repeatLast && defaults.theme && available.includes(defaults.theme)) {
    theme = defaults.theme;
  }

  const resolvedSize =
    size?.value ??
    (minutes ? sizeForMinutes(minutes.minutes) : undefined) ??
    defaults.size ??
    DEFAULT_SIZE;

  const request: PuzzleRequest = {
    language: puzzleLanguage,
    subject: subject?.value ?? (theme ? THEME_META[theme].subject : defaults.subject ?? null),
    collection: theme ? THEME_META[theme].collection : defaults.collection ?? null,
    theme,
    difficulty: difficulty?.value ?? defaults.difficulty ?? null,
    size: resolvedSize,
    minutes: minutes?.minutes ?? null,
    familyFriendly: family ? true : defaults.familyFriendly ?? false,
    allowProperNouns: noProper ? false : yesProper ? true : defaults.allowProperNouns ?? true,
    allowAbbreviations: noAbbrev
      ? false
      : yesAbbrev
        ? true
        : defaults.allowAbbreviations ?? true,
  };

  // Stopwords go through the same folding as the input.
  const stop = new Set(
    (["en", "fr", "ar"] as PuzzleLanguage[]).flatMap((l) => STOPWORDS[l].flatMap(tokenize))
  );
  const unmatched = tokens.filter(
    (token, i) =>
      !consumed[i] &&
      !stop.has(token) &&
      !/^\d+$/.test(token) &&
      token.length >= (/[؀-ۿ]/.test(token) ? 2 : 3)
  );

  let confidence = 0;
  if (collection) confidence += 0.55;
  else if (subject && theme) confidence += 0.45;
  else if (theme && repeatLast) confidence += 0.4;
  const others = matched.filter(
    (m) => m.field !== "collection" && m.field !== "subject"
  ).length;
  confidence += Math.min(0.3, others * 0.08);
  confidence -= unmatched.length * 0.08;
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  return {
    request,
    matched,
    unmatched,
    repeatLast,
    missingBank,
    confidence,
    needsTopic: theme === null,
  };
}
