import { describe, expect, it } from "vitest";
import type { PuzzleLanguage } from "@/lib/crossword/types";
import { validatePuzzle } from "@/lib/crossword/validate";
import { emptyAttempt, summarizeAttempt } from "@/lib/crossword/attempt";
import { answerToCells } from "@/lib/crossword/normalize";
import { entryCells } from "@/lib/crossword/grid";
import { themesFor } from "@/lib/playground/banks";
import {
  buildPuzzleSteps,
  generatePuzzleResult,
  generatePuzzleSteps,
} from "@/lib/playground/generate";
import { STAGE_IDS, foldStages, type StageEvent } from "@/lib/playground/stages";
import { PRESET_IDS, applyPreset, presetsFor } from "@/lib/playground/presets";
import { defaultForm, resolveCustomTopic, withLanguage } from "@/lib/playground/form";
import {
  playgroundDefinitionSchema,
  toDefinition,
  toPlayable,
  toPuzzleDef,
} from "@/lib/playground/definition";
import {
  answerPattern,
  regenerateClue,
  regenerateSection,
  rename,
  setAnswer,
  setClue,
} from "@/lib/playground/edit";

const LANGUAGES: PuzzleLanguage[] = ["en", "fr", "ar"];

/** Run the stage generator to completion, collecting what it reported. */
function run(steps: Generator<StageEvent, unknown, void>) {
  const events: StageEvent[] = [];
  for (;;) {
    const step = steps.next();
    if (step.done) return { events, result: step.value };
    events.push(step.value);
  }
}

describe("the generator reports real stages", () => {
  it("passes through every stage of the pipeline on a successful build", () => {
    const { events, result } = run(
      generatePuzzleSteps({ theme: "plants", language: "en", size: "small", seed: 7 })
    );
    expect((result as { ok: boolean }).ok).toBe(true);

    // Every declared stage was actually reported, and each one completed.
    for (const id of STAGE_IDS) {
      const done = events.filter((e) => e.stage === id && e.status === "done");
      expect(done.length, id).toBeGreaterThan(0);
    }
    expect(events.at(-1)).toMatchObject({ stage: "finalising", status: "done" });
  });

  it("reports counts that match the puzzle it produced", () => {
    const { events, result } = run(
      generatePuzzleSteps({ theme: "space", language: "en", size: "medium", seed: 99 })
    );
    const built = result as { ok: true; puzzle: { entries: unknown[] } };
    const crossings = events.filter((e) => e.stage === "crossings" && e.status === "done").at(-1);
    expect(crossings?.detail?.entries).toBe(built.puzzle.entries.length);
    expect(crossings?.detail?.crossings).toBeGreaterThan(0);
  });

  it("names the stage and the check that failed, in plain codes", () => {
    // A theme with no bank in this language cannot get past planning.
    const { events, result } = run(
      buildPuzzleSteps({
        words: [],
        language: "en",
        size: "small",
        seed: 1,
        slugBase: "test",
        title: "Test",
        subject: "test",
        topic: "test",
        topicLabel: "Test",
        decor: "literature",
      })
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "not_enough_words",
      stage: "planning",
    });
    expect(events.at(-1)).toMatchObject({ stage: "planning", status: "failed" });
  });

  it("gives the same puzzle whether driven stage by stage or run straight through", () => {
    const options = { theme: "cats", language: "en", size: "small", seed: 2024 } as const;
    const stepped = run(generatePuzzleSteps({ ...options })).result;
    const direct = generatePuzzleResult({ ...options });
    expect(stepped).toEqual(direct);
  });

  it("folds a stream of events into one row per stage", () => {
    let log = {};
    log = foldStages(log, { stage: "grid", status: "running", pass: 1 });
    log = foldStages(log, { stage: "grid", status: "done", pass: 1 });
    // A stale running event from the same pass must not undo a completion.
    log = foldStages(log, { stage: "grid", status: "running", pass: 1 });
    expect(log).toMatchObject({ grid: { status: "done" } });
    // A later pass does replace it.
    log = foldStages(log, { stage: "grid", status: "running", pass: 2 });
    expect(log).toMatchObject({ grid: { status: "running", pass: 2 } });
  });
});

describe("the test-solve stage means what it says", () => {
  it("every generated puzzle is solved by its own answer key", () => {
    for (const language of LANGUAGES) {
      for (const theme of themesFor(language).slice(0, 6)) {
        const result = generatePuzzleResult({ theme, language, size: "small", seed: 31 });
        if (!result.ok) continue;
        const { puzzle } = result;
        const state = emptyAttempt(puzzle.width, puzzle.height);
        for (const entry of puzzle.entries) {
          const letters = answerToCells(entry.answer, language);
          entryCells(entry, letters.length).forEach(({ row, column }, index) => {
            state.cells[row][column].letter = letters[index];
          });
        }
        const summary = summarizeAttempt(state, puzzle.grid, puzzle.entries, language);
        expect(summary.solved, `${language}/${theme}`).toBe(true);
      }
    }
  });
});

describe("presets", () => {
  it("only offers a template whose word bank exists in that language", () => {
    for (const language of LANGUAGES) {
      const offered = presetsFor(language);
      for (const id of offered) {
        const form = applyPreset(defaultForm(language), id);
        if (form.source === "notes") continue;
        expect(form.theme, id).not.toBeNull();
        expect(themesFor(form.language), `${id}/${form.language}`).toContain(form.theme);
      }
    }
  });

  it("every named template builds a valid puzzle", () => {
    for (const id of PRESET_IDS) {
      const form = applyPreset(defaultForm("en"), id);
      if (form.source === "notes" || !form.theme) continue;
      const result = generatePuzzleResult({
        theme: form.theme,
        language: form.language,
        size: form.size,
        difficulty: form.difficulty ?? undefined,
        seed: 4242,
      });
      expect(result.ok, id).toBe(true);
      if (!result.ok) continue;
      const validation = validatePuzzle(toPuzzleDef(toDefinition(result.puzzle)));
      expect(validation.errors.map((issue) => issue.code), id).toEqual([]);
    }
  });

  it("keeps the form consistent when the language changes", () => {
    const form = withLanguage(applyPreset(defaultForm("en"), "hard-music"), "ar");
    expect(themesFor("ar")).toContain(form.theme);
  });
});

describe("typed topics are matched, never invented", () => {
  it("resolves a collection the builder has words for", () => {
    expect(resolveCustomTopic("en", "volcanoes")).toMatchObject({
      kind: "matched",
      theme: "volcanoes",
    });
  });

  it("says so when there is no bank at all", () => {
    expect(resolveCustomTopic("en", "quantum basket weaving")).toEqual({ kind: "unknown" });
  });

  it("points at the languages a bank does exist in", () => {
    const resolved = resolveCustomTopic("fr", "gemstones");
    expect(resolved.kind).toBe("other-language");
    if (resolved.kind === "other-language") expect(resolved.languages).toContain("en");
  });

  it("ignores a fragment too short to mean anything", () => {
    expect(resolveCustomTopic("en", "a")).toEqual({ kind: "empty" });
  });
});

describe("saved definitions round-trip", () => {
  it("parses back into a playable puzzle", () => {
    const result = generatePuzzleResult({
      theme: "anatomy",
      language: "en",
      size: "small",
      seed: 5150,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const definition = toDefinition(result.puzzle, { theme: "anatomy", seed: 5150 });
    const parsed = playgroundDefinitionSchema.safeParse(
      JSON.parse(JSON.stringify(definition))
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const playable = toPlayable(parsed.data, "saved-id");
    expect(playable.entries).toEqual(result.puzzle.entries);
    // A saved Playground puzzle is never marked as reviewed content.
    expect(playable.status).toBe("draft");
  });
});

describe("post-generation editing", () => {
  const built = generatePuzzleResult({
    theme: "coffee",
    language: "en",
    size: "small",
    seed: 606,
  });
  if (!built.ok) throw new Error("fixture puzzle failed to generate");
  const definition = toDefinition(built.puzzle, { theme: "coffee", seed: 606 });
  const first = definition.entries[0];
  const ref = { number: first.number, direction: first.direction };

  it("renames without touching the grid", () => {
    const result = rename(definition, "  My puzzle  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.title).toBe("My puzzle");
      expect(result.definition.grid).toEqual(definition.grid);
    }
  });

  it("refuses an empty clue", () => {
    expect(setClue(definition, ref, "   ")).toMatchObject({ ok: false, code: "empty_clue" });
  });

  it("accepts a rewritten clue and revalidates", () => {
    const result = setClue(definition, ref, "A freshly written definition");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const validation = validatePuzzle(toPuzzleDef(result.definition));
      expect(validation.errors).toEqual([]);
    }
  });

  it("refuses a replacement answer of the wrong length", () => {
    expect(setAnswer(definition, ref, `${first.answer}XY`)).toMatchObject({
      ok: false,
      code: "wrong_length",
    });
  });

  it("refuses a replacement that contradicts a crossing letter", () => {
    const crossed = definition.entries.find((entry) =>
      answerPattern(definition, {
        number: entry.number,
        direction: entry.direction,
      }).some((letter) => letter !== null)
    );
    expect(crossed).toBeDefined();
    if (!crossed) return;
    const target = { number: crossed.number, direction: crossed.direction };
    const pattern = answerPattern(definition, target);
    const index = pattern.findIndex((letter) => letter !== null);
    const letters = crossed.answer.split("");
    // Pick any letter that is not the one the crossing fixes.
    letters[index] = letters[index] === "Z" ? "Q" : "Z";
    expect(setAnswer(definition, target, letters.join(""))).toMatchObject({
      ok: false,
      code: "crossing_conflict",
    });
  });

  it("shows which letters the crossings already fix", () => {
    const pattern = answerPattern(definition, ref);
    expect(pattern).toHaveLength(first.answer.length);
    pattern.forEach((letter, index) => {
      if (letter !== null) expect(letter).toBe(first.answer[index]);
    });
  });

  it("regenerates a clue from the same word bank, or says it cannot", () => {
    const result = regenerateClue(definition, ref, "coffee", 11);
    if (result.ok) {
      const changed = result.definition.entries.find(
        (entry) => entry.number === ref.number && entry.direction === ref.direction
      );
      expect(changed?.clue).not.toBe(first.clue);
      expect(validatePuzzle(toPuzzleDef(result.definition)).errors).toEqual([]);
    } else {
      expect(result.code).toBe("no_other_clue");
    }
  });

  it("will not regenerate clues without a bank to draw from", () => {
    expect(regenerateClue(definition, ref, null, 3)).toMatchObject({
      ok: false,
      code: "no_other_clue",
    });
  });

  it("re-clues a whole direction and reports how many actually changed", () => {
    const result = regenerateSection(definition, "across", "coffee", 77);
    if (result.ok) {
      expect(result.changed).toBeGreaterThan(0);
      expect(validatePuzzle(toPuzzleDef(result.definition)).errors).toEqual([]);
    } else {
      expect(result.code).toBe("no_other_clue");
    }
  });
});
