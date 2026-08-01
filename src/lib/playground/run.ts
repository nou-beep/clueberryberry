import type { Difficulty } from "@/lib/crossword/types";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import type { PlaygroundTheme } from "./banks";
import type { PlaygroundForm } from "./form";
import {
  generatePuzzleSteps,
  type GenerateFailure,
  type PuzzleSize,
} from "./generate";
import { puzzleFromNotesSteps, type NotesFailure } from "./from-notes";
import type { StageEvent, StageId } from "./stages";

/**
 * Drives the generator one real stage at a time.
 *
 * The pipeline itself is synchronous; this yields to the browser between the
 * events it emits so each transition is painted. Nothing is padded — a stage
 * that takes a fraction of a millisecond is shown completing in a fraction of a
 * millisecond. See ./stages for what each id actually does.
 */

export type BuildOutcome =
  | {
      ok: true;
      puzzle: PlayablePuzzle;
      theme: PlaygroundTheme | null;
      seed: number;
      /** The band the finished fill lands on. */
      difficulty: Difficulty;
      /** The band that was asked for, when the two differ. */
      requestedDifficulty?: Difficulty;
      passes: number;
      repairs: number;
    }
  | {
      ok: false;
      reason: GenerateFailure | NotesFailure;
      stage?: StageId;
      check?: string;
    };

/** Seeds come from the clock and a build counter — never Math.random. */
export function nextSeed(builds: number): number {
  return (Date.now() ^ Math.imul(builds + 1, 0x9e3779b1)) >>> 0;
}

const frame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

export interface RunOptions {
  form: PlaygroundForm;
  seed: number;
  onEvent: (event: StageEvent) => void;
}

export async function runGeneration({
  form,
  seed,
  onEvent,
}: RunOptions): Promise<BuildOutcome> {
  const size: PuzzleSize = form.size;

  if (form.source === "notes") {
    const steps = puzzleFromNotesSteps({
      text: form.notes,
      language: form.language,
      size,
      difficulty: form.difficulty ?? undefined,
      seed,
      title: form.title,
    });
    for (;;) {
      const step = steps.next();
      if (step.done) {
        const result = step.value;
        return result.ok
          ? {
              ok: true,
              puzzle: result.puzzle,
              theme: null,
              seed,
              difficulty: result.difficulty,
              requestedDifficulty: result.requestedDifficulty,
              passes: result.attempts,
              repairs: result.repairs,
            }
          : { ok: false, reason: result.reason, stage: result.stage, check: result.check };
      }
      onEvent(step.value);
      await frame();
    }
  }

  if (!form.theme) {
    return { ok: false, reason: "not_enough_words", stage: "planning", check: "no_theme" };
  }

  const steps = generatePuzzleSteps({
    theme: form.theme,
    language: form.language,
    size,
    difficulty: form.difficulty ?? undefined,
    tone: form.tone ?? undefined,
    themeEntries: form.themeEntries,
    familyFriendly: form.familyFriendly,
    allowProperNouns: form.allowProperNouns,
    allowAbbreviations: form.allowAbbreviations,
    seed,
  });
  for (;;) {
    const step = steps.next();
    if (step.done) {
      const result = step.value;
      return result.ok
        ? {
            ok: true,
            puzzle: result.puzzle,
            theme: form.theme,
            seed,
            difficulty: result.difficulty,
            requestedDifficulty: result.requestedDifficulty,
            passes: result.attempts,
            repairs: result.repairs,
          }
        : { ok: false, reason: result.reason, stage: result.stage, check: result.check };
    }
    onEvent(step.value);
    await frame();
  }
}
