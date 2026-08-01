import { z } from "zod";
import { CLUE_STYLES, PUZZLE_STATUSES } from "./types";
import type { PuzzleDef } from "./types";

/** Zod schema for the puzzle JSON interchange format (import/export/seeds). */

export const entrySchema = z.object({
  number: z.number().int().positive(),
  direction: z.enum(["across", "down"]),
  row: z.number().int().min(0),
  column: z.number().int().min(0),
  answer: z.string().min(2),
  // Empty clues are allowed in drafts; validation blocks review/publication.
  clue: z.string().default(""),
  clueStyle: z.enum(CLUE_STYLES),
  acceptedAlternatives: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  sourceNotes: z.string().optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(),
  isThemeEntry: z.boolean().default(false),
});

export const factCardSchema = z.object({
  text: z.string().min(1),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  reviewStatus: z.enum(["needs_review", "verified"]).default("needs_review"),
});

export const normalizationSchema = z
  .object({
    foldAlef: z.boolean(),
    foldYa: z.boolean(),
    foldTaMarbuta: z.boolean(),
    foldHamzaWaw: z.boolean(),
    foldHamzaYa: z.boolean(),
    removeTatweel: z.boolean(),
    removeDiacritics: z.boolean(),
  })
  .partial();

export const puzzleFileSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits and dashes"),
  title: z.string().min(1),
  language: z.enum(["en", "fr", "ar"]),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  width: z.number().int().min(3).max(25),
  height: z.number().int().min(3).max(25),
  grid: z.array(z.array(z.string().nullable())).optional(),
  entries: z.array(entrySchema).min(1),
  author: z.string().min(1),
  editor: z.string().optional(),
  status: z.enum(PUZZLE_STATUSES).default("draft"),
  publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedSolveTime: z.number().int().positive().optional(),
  introduction: z.string().optional(),
  completionMessage: z.string().optional(),
  symmetry: z.boolean().default(false),
  normalization: normalizationSchema.optional(),
  factCards: z.array(factCardSchema).default([]),
});

export type PuzzleFile = z.infer<typeof puzzleFileSchema>;

export function parsePuzzleFile(data: unknown): PuzzleDef {
  return puzzleFileSchema.parse(data) as PuzzleDef;
}
