import { describe, expect, it } from "vitest";
import { answerToCells, normalizeAnswer } from "@/lib/crossword/normalize";
import type { Difficulty, PuzzleDef, PuzzleLanguage } from "@/lib/crossword/types";
import { validatePuzzle } from "@/lib/crossword/validate";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import {
  PLAYGROUND_THEMES,
  THEME_META,
  bankFor,
  themesFor,
  type PlaygroundTheme,
} from "@/lib/playground/banks";
import {
  generatePuzzle,
  generatePuzzleResult,
  type PuzzleSize,
} from "@/lib/playground/generate";
import { puzzleFromNotes } from "@/lib/playground/from-notes";

const LANGUAGES: PuzzleLanguage[] = ["en", "fr", "ar"];
const SIZES: PuzzleSize[] = ["small", "medium", "large"];
const FLOORS: Record<PuzzleSize, number> = { small: 7, medium: 9, large: 11 };

/** The validator works on PuzzleDef; a generated puzzle only renames a few fields. */
const asDef = (p: PlayablePuzzle): PuzzleDef => ({
  slug: p.slug,
  title: p.title,
  language: p.language,
  subject: p.subjectSlug,
  topic: p.topicSlug,
  difficulty: p.difficulty,
  width: p.width,
  height: p.height,
  grid: p.grid,
  entries: p.entries,
  author: p.author,
  normalization: p.normalization,
});

describe("playground banks", () => {
  it("covers the promised themes in each language", () => {
    expect(themesFor("en")).toEqual([...PLAYGROUND_THEMES]);
    for (const theme of [
      "cats",
      "dinosaurs",
      "plants",
      "coffee",
      "space",
      "anatomy",
      "games",
      "volcanoes",
      "greek-mythology",
      "world-war-ii",
      "general-knowledge",
    ] as const) {
      expect(themesFor("fr")).toContain(theme);
      expect(themesFor("ar")).toContain(theme);
    }
  });

  it("holds enough crossable words with 2-3 clues each", () => {
    for (const language of LANGUAGES) {
      for (const theme of themesFor(language)) {
        const words = bankFor(language, theme);
        expect(words.length, `${language}/${theme}`).toBeGreaterThanOrEqual(18);
        expect(words.length, `${language}/${theme}`).toBeLessThanOrEqual(34);
        for (const word of words) {
          const cells = answerToCells(word.answer, language);
          expect(cells.length, `${language}/${theme}/${word.answer}`).toBeGreaterThanOrEqual(3);
          expect(cells.length, `${language}/${theme}/${word.answer}`).toBeLessThanOrEqual(9);
          expect(word.clues.length, word.answer).toBeGreaterThanOrEqual(2);
          expect(word.clues.length, word.answer).toBeLessThanOrEqual(3);
          expect(word.difficulty, word.answer).toBeGreaterThanOrEqual(1);
          expect(word.difficulty, word.answer).toBeLessThanOrEqual(5);
          for (const clue of word.clues) {
            expect(clue.trim().length, word.answer).toBeGreaterThan(0);
            expect(clue.split(/\s+/).length, `${word.answer}: ${clue}`).toBeLessThanOrEqual(9);
          }
          for (const variant of word.alternatives ?? []) {
            expect(
              answerToCells(variant, language).length,
              `${word.answer}/${variant}`
            ).toBe(cells.length);
          }
        }
        // A bank of one length cannot interlock; require mixed lengths.
        const lengths = new Set(words.map((word) => answerToCells(word.answer, language).length));
        expect(lengths.size, `${language}/${theme}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("never puts an answer inside its own clue", () => {
    for (const language of LANGUAGES) {
      for (const theme of themesFor(language)) {
        for (const word of bankFor(language, theme)) {
          const answer = normalizeAnswer(word.answer, language);
          for (const clue of word.clues) {
            const tokens = clue
              .split(/[^\p{L}\p{N}]+/u)
              .map((token) => normalizeAnswer(token, language))
              .filter((token) => token.length >= 3);
            expect(tokens, `${word.answer}: ${clue}`).not.toContain(answer);
          }
        }
      }
    }
  });

  it("keeps French answers uppercase and unaccented", () => {
    for (const theme of themesFor("fr")) {
      for (const word of bankFor("fr", theme)) {
        expect(word.answer).toBe(normalizeAnswer(word.answer, "fr"));
      }
    }
  });

  it("keeps Arabic answers free of diacritics and spaces", () => {
    for (const theme of themesFor("ar")) {
      for (const word of bankFor("ar", theme)) {
        expect(word.answer).not.toMatch(/[ً-ْٰـ\s]/);
      }
    }
  });

  it("tags the words the option controls need to filter", () => {
    // Proper nouns, abbreviations and sensitive entries must actually exist,
    // or the filters below would be untested no-ops.
    expect(bankFor("en", "world-war-ii").filter((w) => w.properNoun).length).toBeGreaterThan(5);
    expect(bankFor("en", "world-war-ii").filter((w) => w.sensitive).length).toBeGreaterThan(2);
    expect(bankFor("en", "general-knowledge").filter((w) => w.abbreviation).length).toBeGreaterThan(1);
    for (const language of LANGUAGES) {
      expect(
        bankFor(language, "world-war-ii").filter((w) => w.sensitive).length,
        language
      ).toBeGreaterThan(2);
    }
  });

  it("carries the whole taxonomy metadata for every theme", () => {
    for (const theme of PLAYGROUND_THEMES) {
      const meta = THEME_META[theme];
      expect(meta.subject, theme).toMatch(/^[a-z0-9-]+$/);
      expect(meta.collection, theme).toMatch(/^[a-z0-9-]+$/);
      expect(meta.decor, theme).toMatch(/^[a-z]+$/);
    }
  });
});

describe("generatePuzzle determinism", () => {
  it("rebuilds an identical puzzle from the same seed", () => {
    const opts = { theme: "space", language: "en", size: "medium", seed: 4242 } as const;
    const first = generatePuzzle({ ...opts });
    const second = generatePuzzle({ ...opts });
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });

  it("produces different puzzles from different seeds", () => {
    const shapes = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const puzzle = generatePuzzle({
        theme: "plants",
        language: "en",
        size: "medium",
        seed,
      });
      expect(puzzle).not.toBeNull();
      shapes.add(JSON.stringify(puzzle?.entries));
    }
    expect(shapes.size).toBeGreaterThan(1);
  });

  it("varies the clue for a word across seeds", () => {
    const clues = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const puzzle = generatePuzzle({
        theme: "coffee",
        language: "en",
        size: "small",
        seed: seed * 13,
      });
      for (const entry of puzzle?.entries ?? []) {
        if (entry.answer === "ESPRESSO") clues.add(entry.clue);
      }
    }
    expect(clues.size).toBeGreaterThan(1);
  });
});

describe("generated puzzles are valid", () => {
  it("passes validatePuzzle with zero errors across every combination", () => {
    let generated = 0;
    const failures: string[] = [];

    for (const language of LANGUAGES) {
      for (const theme of themesFor(language)) {
        for (const size of SIZES) {
          for (const seed of [11, 2027, 90210]) {
            for (const options of [
              {},
              { familyFriendly: true },
              { allowProperNouns: false },
              { allowAbbreviations: false },
              { familyFriendly: true, allowProperNouns: false, allowAbbreviations: false },
            ]) {
              const label = `${language}/${theme}/${size}/${seed}/${JSON.stringify(options)}`;
              const result = generatePuzzleResult({ theme, language, size, seed, ...options });
              if (!result.ok) {
                failures.push(`${label}: ${result.reason}`);
                continue;
              }
              generated++;
              const puzzle = result.puzzle;
              const validation = validatePuzzle(asDef(puzzle));
              expect(validation.errors.map((e) => `${e.code}: ${e.message}`), label).toEqual([]);
              expect(puzzle.entries.length, label).toBeGreaterThanOrEqual(FLOORS[size]);
            }
          }
        }
      }
    }

    // 17 + 12 + 12 banks x 3 sizes x 3 seeds x 5 option sets = 1845 requests.
    expect(generated).toBeGreaterThan(1780);
    // The only acceptable failure is a name-heavy theme asked for a large grid
    // with proper nouns switched off — there simply are not enough words left.
    for (const failure of failures) {
      expect(failure, failure).toMatch(/large.*allowProperNouns":false.*not_enough_words/);
    }
  });

  it("respects the difficulty bands it is given", () => {
    for (const difficulty of ["easy", "medium", "hard"] as Difficulty[]) {
      for (const theme of ["anatomy", "volcanoes", "general-knowledge"] as PlaygroundTheme[]) {
        const puzzle = generatePuzzle({
          theme,
          language: "en",
          size: "small",
          difficulty,
          seed: 777,
        });
        expect(puzzle, `${theme}/${difficulty}`).not.toBeNull();
        if (puzzle) {
          expect(validatePuzzle(asDef(puzzle)).errors).toEqual([]);
        }
      }
    }
  });

  it("carries clues, explanations, a title, a topic and an estimate", () => {
    for (const language of LANGUAGES) {
      for (const theme of themesFor(language)) {
        const result = generatePuzzleResult({ theme, language, size: "small", seed: 31 });
        expect(result.ok, `${language}/${theme}`).toBe(true);
        if (!result.ok) continue;
        const puzzle = result.puzzle;
        expect(puzzle.title.trim().length).toBeGreaterThan(0);
        expect(puzzle.topicSlug).toBe(THEME_META[theme].collection);
        expect(puzzle.subjectSlug).toBe(THEME_META[theme].subject);
        expect(puzzle.estimatedSolveTime ?? 0).toBeGreaterThan(0);
        expect(puzzle.status).toBe("draft");
        expect(["easy", "medium", "hard"]).toContain(puzzle.difficulty);
        const numbers = puzzle.entries.map((e) => e.number);
        expect(numbers.every((n) => n >= 1)).toBe(true);
        expect(puzzle.entries.some((e) => e.direction === "across")).toBe(true);
        expect(puzzle.entries.some((e) => e.direction === "down")).toBe(true);
        for (const entry of puzzle.entries) {
          expect(entry.clue.trim().length, entry.answer).toBeGreaterThan(0);
          expect((entry.explanation ?? "").trim().length, entry.answer).toBeGreaterThan(0);
          for (const variant of entry.acceptedAlternatives ?? []) {
            expect(answerToCells(variant, language).length, variant).toBe(
              answerToCells(entry.answer, language).length
            );
          }
        }
      }
    }
  });

  it("offers Arabic ta marbuta spellings as accepted variants", () => {
    const puzzle = generatePuzzle({ theme: "cats", language: "ar", size: "medium", seed: 12 });
    expect(puzzle).not.toBeNull();
    const withTaMarbuta = (puzzle?.entries ?? []).filter((e) => e.answer.endsWith("ة"));
    expect(withTaMarbuta.length).toBeGreaterThan(0);
    for (const entry of withTaMarbuta) {
      expect(entry.acceptedAlternatives).toContain(`${entry.answer.slice(0, -1)}ه`);
    }
  });

  it("trims the grid to its used bounding box", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const puzzle = generatePuzzle({
        theme: "dinosaurs",
        language: "en",
        size: "large",
        seed: seed * 31,
      });
      if (!puzzle) continue;
      const rowUsed = (row: number) => puzzle.grid[row].some((cell) => cell !== null);
      const colUsed = (col: number) => puzzle.grid.some((row) => row[col] !== null);
      expect(rowUsed(0)).toBe(true);
      expect(rowUsed(puzzle.height - 1)).toBe(true);
      expect(colUsed(0)).toBe(true);
      expect(colUsed(puzzle.width - 1)).toBe(true);
    }
  });
});

describe("content option filters", () => {
  const answersOf = (theme: PlaygroundTheme, language: PuzzleLanguage, options: object) => {
    const result = generatePuzzleResult({
      theme,
      language,
      size: "small",
      seed: 5150,
      ...options,
    });
    expect(result.ok, `${language}/${theme}`).toBe(true);
    return result.ok ? result.puzzle.entries.map((e) => e.answer) : [];
  };

  it("excludes proper nouns when they are switched off", () => {
    for (const language of LANGUAGES) {
      const banned = new Set(
        bankFor(language, "world-war-ii")
          .filter((w) => w.properNoun)
          .map((w) => w.answer)
      );
      expect(banned.size, language).toBeGreaterThan(0);
      const answers = answersOf("world-war-ii", language, { allowProperNouns: false });
      for (const answer of answers) expect(banned.has(answer), answer).toBe(false);
      // …and they do turn up when allowed.
      const withNames = answersOf("world-war-ii", language, {});
      expect(withNames.some((answer) => banned.has(answer)), language).toBe(true);
    }
  });

  it("excludes abbreviations when they are switched off", () => {
    const banned = new Set(
      bankFor("en", "general-knowledge")
        .filter((w) => w.abbreviation)
        .map((w) => w.answer)
    );
    for (let seed = 1; seed <= 20; seed++) {
      const result = generatePuzzleResult({
        theme: "general-knowledge",
        language: "en",
        size: "medium",
        seed: seed * 17,
        allowAbbreviations: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      for (const entry of result.puzzle.entries) {
        expect(banned.has(entry.answer), entry.answer).toBe(false);
      }
    }
  });

  it("caps abbreviations even when they are allowed", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const result = generatePuzzleResult({
        theme: "general-knowledge",
        language: "en",
        size: "small",
        seed: seed * 23,
      });
      if (!result.ok) continue;
      const abbreviations = new Set(
        bankFor("en", "general-knowledge")
          .filter((w) => w.abbreviation)
          .map((w) => w.answer)
      );
      const used = result.puzzle.entries.filter((e) => abbreviations.has(e.answer)).length;
      expect(used / result.puzzle.entries.length).toBeLessThanOrEqual(0.15);
    }
  });

  it("respects family-friendly mode", () => {
    for (const language of LANGUAGES) {
      const banned = new Set(
        bankFor(language, "world-war-ii")
          .filter((w) => w.sensitive)
          .map((w) => w.answer)
      );
      for (const size of SIZES) {
        for (const seed of [3, 33, 333]) {
          const result = generatePuzzleResult({
            theme: "world-war-ii",
            language,
            size,
            seed,
            familyFriendly: true,
          });
          expect(result.ok, `${language}/${size}/${seed}`).toBe(true);
          if (!result.ok) continue;
          for (const entry of result.puzzle.entries) {
            expect(banned.has(entry.answer), entry.answer).toBe(false);
          }
        }
      }
    }
  });
});

describe("generator failure handling", () => {
  it("reports the reason when a theme has no bank in that language", () => {
    for (const language of ["fr", "ar"] as PuzzleLanguage[]) {
      const result = generatePuzzleResult({
        theme: "taylor-swift",
        language,
        size: "small",
        seed: 9,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("not_enough_words");
      expect(generatePuzzle({ theme: "taylor-swift", language, size: "small", seed: 9 })).toBeNull();
    }
  });

  it("reports how much repair work it needed", () => {
    const result = generatePuzzleResult({
      theme: "volcanoes",
      language: "en",
      size: "medium",
      seed: 8080,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempts).toBeGreaterThanOrEqual(1);
      expect(result.repairs).toBeGreaterThanOrEqual(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Notes → puzzle                                                             */
/* -------------------------------------------------------------------------- */

const EN_NOTES = `
Photosynthesis happens inside the chloroplast, which contains a green pigment.
The pigment absorbs light and passes energy along a chain of carrier molecules.
Water is split during the light reactions, releasing oxygen as a by-product.
Carbon dioxide enters through small pores in the underside of a leaf.
The Calvin cycle then fixes carbon dioxide into a three-carbon sugar.
Enzyme activity in the cycle depends on temperature and on the supply of light.
A plant stores surplus sugar as starch in the root and in the stem.
Respiration later releases that stored energy for growth and repair.
`;

const FR_NOTES = `
La photosynthese se produit dans le chloroplaste, qui contient un pigment vert.
Le pigment absorbe la lumiere et transmet son energie a une chaine de molecules.
L'eau est separee pendant les reactions claires, ce qui libere de l'oxygene.
Le dioxyde de carbone entre par de petits pores situes sous la feuille.
Le cycle de Calvin fixe ensuite le carbone dans un sucre a trois atomes.
L'activite des enzymes depend de la temperature et de la lumiere disponible.
La plante conserve le sucre en trop sous forme d'amidon dans la racine.
La respiration libere plus tard cette energie pour la croissance.
`;

const AR_NOTES = `
تحدث عملية البناء الضوئي داخل البلاستيدة الخضراء التي تحتوي على صباغ اخضر.
يمتص الصباغ الضوء وينقل الطاقة عبر سلسلة من الجزيئات الناقلة.
ينشطر الماء في التفاعلات الضوئية فينطلق الاوكسجين كناتج ثانوي.
يدخل ثاني اوكسيد الكربون من الثغور الصغيرة في اسفل الورقة.
تثبت دورة كالفن الكربون في سكر ثلاثي الذرات داخل الخلية.
يعتمد نشاط الانزيمات على درجة الحرارة وعلى كمية الضوء المتاحة.
تخزن النبتة السكر الزائد على صورة نشاء في الجذر والساق.
يحرر التنفس هذه الطاقة المخزنة لاحقا من اجل النمو والاصلاح.
`;

describe("notes to puzzle", () => {
  it("builds a valid puzzle from a pasted paragraph in each language", () => {
    const samples: Array<[PuzzleLanguage, string]> = [
      ["en", EN_NOTES],
      ["fr", FR_NOTES],
      ["ar", AR_NOTES],
    ];
    for (const [language, text] of samples) {
      for (const seed of [1, 64, 2048]) {
        const result = puzzleFromNotes({ text, language, size: "small", seed });
        expect(result.ok, `${language}/${seed}`).toBe(true);
        if (!result.ok) continue;
        const puzzle = result.puzzle;
        expect(validatePuzzle(asDef(puzzle)).errors, `${language}/${seed}`).toEqual([]);
        expect(puzzle.entries.length).toBeGreaterThanOrEqual(FLOORS.small);
        for (const entry of puzzle.entries) {
          // Every clue is a fill-in-the-blank from the notes…
          expect(entry.clue, entry.answer).toContain("____");
          // …and never contains its own answer.
          const tokens = entry.clue
            .split(/[^\p{L}\p{N}]+/u)
            .map((token) => normalizeAnswer(token, language));
          expect(tokens, `${entry.answer}: ${entry.clue}`).not.toContain(
            normalizeAnswer(entry.answer, language)
          );
          // The source sentence is kept as the explanation.
          expect((entry.explanation ?? "").length).toBeGreaterThan(entry.clue.length / 2);
        }
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const first = puzzleFromNotes({ text: EN_NOTES, language: "en", size: "small", seed: 5 });
    const second = puzzleFromNotes({ text: EN_NOTES, language: "en", size: "small", seed: 5 });
    expect(first).toEqual(second);
  });

  it("accepts a title from the player", () => {
    const result = puzzleFromNotes({
      text: EN_NOTES,
      language: "en",
      size: "small",
      seed: 5,
      title: "Photosynthesis revision",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.puzzle.title).toBe("Photosynthesis revision");
  });

  it("fails cleanly on text that is too short", () => {
    for (const text of ["", "   ", "Mitochondria make energy.", "one two three four five"]) {
      const result = puzzleFromNotes({ text, language: "en", size: "small", seed: 1 });
      expect(result.ok, text).toBe(false);
      if (!result.ok) expect(result.reason, text).toBe("text_too_short");
    }
  });

  it("fails cleanly when the text has nothing crossable", () => {
    // Long enough, but almost every word is a stopword or too short.
    const text = Array.from({ length: 40 }, () => "it is on to be at we do so no if or an as by my")
      .join(" ")
      .concat(".");
    const result = puzzleFromNotes({ text, language: "en", size: "small", seed: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_enough_words");
  });
});
