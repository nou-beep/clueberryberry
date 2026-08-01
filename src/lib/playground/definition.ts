import { z } from "zod";
import { CLUE_STYLES } from "@/lib/crossword/types";
import type { PuzzleDef } from "@/lib/crossword/types";
import type { PlayablePuzzle } from "@/lib/db/serialize";

/**
 * The shape a saved Playground puzzle is stored in.
 *
 * `PlaygroundPuzzle.definition` is a JSON string in the database (SQLite has no
 * JSON column and the schema stays Postgres-portable), so every read goes
 * through this schema. A row written by an older build that no longer parses is
 * reported as unreadable rather than half-rendered.
 */

const entrySchema = z.object({
  number: z.number().int().min(1),
  direction: z.enum(["across", "down"]),
  row: z.number().int().min(0).max(63),
  column: z.number().int().min(0).max(63),
  answer: z.string().min(1).max(64),
  clue: z.string().min(1).max(400),
  clueStyle: z.enum(CLUE_STYLES),
  acceptedAlternatives: z.array(z.string().min(1).max(64)).max(8).optional(),
  explanation: z.string().max(600).optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(),
  isThemeEntry: z.boolean().optional(),
});

export const playgroundDefinitionSchema = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  language: z.enum(["en", "fr", "ar"]),
  subjectSlug: z.string().min(1).max(80),
  subjectName: z.string().min(1).max(120),
  subjectTheme: z.string().min(1).max(40),
  topicSlug: z.string().min(1).max(80),
  topicName: z.string().min(1).max(120),
  difficulty: z.enum(["easy", "medium", "hard"]),
  width: z.number().int().min(3).max(25),
  height: z.number().int().min(3).max(25),
  grid: z.array(z.array(z.string().min(1).max(4).nullable()).max(25)).max(25),
  entries: z.array(entrySchema).min(3).max(60),
  author: z.string().min(1).max(80),
  estimatedSolveTime: z.number().int().min(0).max(100_000).nullable(),
  /** Which curated bank it came from, when it came from one. */
  theme: z.string().max(60).nullable().optional(),
  /** The seed that produced it, so a duplicate can be rebuilt identically. */
  seed: z.number().int().min(0).optional(),
});

export type PlaygroundDefinition = z.infer<typeof playgroundDefinitionSchema>;

/** A saved definition, ready for PlayScreen. */
export function toPlayable(definition: PlaygroundDefinition, id: string): PlayablePuzzle {
  return {
    id,
    slug: definition.slug,
    title: definition.title,
    language: definition.language,
    subjectSlug: definition.subjectSlug,
    subjectName: definition.subjectName,
    subjectTheme: definition.subjectTheme,
    topicSlug: definition.topicSlug,
    topicName: definition.topicName,
    difficulty: definition.difficulty,
    width: definition.width,
    height: definition.height,
    grid: definition.grid,
    entries: definition.entries,
    author: definition.author,
    introduction: null,
    completionMessage: null,
    estimatedSolveTime: definition.estimatedSolveTime,
    normalization: undefined,
    // Never "published": a Playground puzzle has had no editor near it.
    status: "draft",
    factCards: [],
  };
}

/** A generated or edited puzzle, ready to store. */
export function toDefinition(
  puzzle: PlayablePuzzle,
  extra: { theme?: string | null; seed?: number } = {}
): PlaygroundDefinition {
  return {
    slug: puzzle.slug,
    title: puzzle.title,
    language: puzzle.language,
    subjectSlug: puzzle.subjectSlug,
    subjectName: puzzle.subjectName,
    subjectTheme: puzzle.subjectTheme,
    topicSlug: puzzle.topicSlug,
    topicName: puzzle.topicName,
    difficulty: puzzle.difficulty,
    width: puzzle.width,
    height: puzzle.height,
    grid: puzzle.grid,
    entries: puzzle.entries,
    author: puzzle.author,
    estimatedSolveTime: puzzle.estimatedSolveTime,
    theme: extra.theme ?? null,
    seed: extra.seed,
  };
}

/** The definition as the editorial validator wants it. */
export function toPuzzleDef(definition: PlaygroundDefinition): PuzzleDef {
  return {
    slug: definition.slug,
    title: definition.title,
    language: definition.language,
    subject: definition.subjectSlug,
    topic: definition.topicSlug,
    difficulty: definition.difficulty,
    width: definition.width,
    height: definition.height,
    grid: definition.grid,
    entries: definition.entries,
    author: definition.author,
  };
}

/** Parse a stored definition. Returns null when the row cannot be read. */
export function parseDefinition(raw: string): PlaygroundDefinition | null {
  try {
    const parsed = playgroundDefinitionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
