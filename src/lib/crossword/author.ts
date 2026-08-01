import { z } from "zod";
import { buildGridFromEntries, numberGrid } from "./grid";
import { entrySchema, factCardSchema, normalizationSchema } from "./schema";
import type { PuzzleDef } from "./types";
import { PUZZLE_STATUSES } from "./types";
import { cellKey } from "./types";

/**
 * Authoring format: like the interchange format, but entry numbers are
 * derived from the grid (standard numbering scan) instead of hand-assigned.
 */
export const authoredEntrySchema = entrySchema.omit({ number: true });

export const authoredPuzzleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  language: z.enum(["en", "fr", "ar"]),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  width: z.number().int().min(3).max(25),
  height: z.number().int().min(3).max(25),
  entries: z.array(authoredEntrySchema).min(1),
  author: z.string().min(1),
  editor: z.string().optional(),
  status: z.enum(PUZZLE_STATUSES).default("published"),
  /** official (human-reviewed) | user (player-made) | playground (generated). */
  origin: z.enum(["official", "user", "playground"]).default("official"),
  /** Highlighted in the library and on the front page. */
  featured: z.boolean().default(false),
  /** Season tag for rotations, e.g. "winter" or "back-to-school". */
  season: z.string().min(2).max(40).optional(),
  estimatedSolveTime: z.number().int().positive().optional(),
  introduction: z.string().optional(),
  completionMessage: z.string().optional(),
  symmetry: z.boolean().default(false),
  normalization: normalizationSchema.optional(),
  factCards: z.array(factCardSchema).default([]),
});

export type AuthoredPuzzle = z.infer<typeof authoredPuzzleSchema>;

/** Assign standard grid numbers to authored entries. Throws when an entry
 * does not start a slot (which validatePuzzle would also catch, less kindly). */
export function numberAuthoredPuzzle(authored: AuthoredPuzzle): PuzzleDef {
  const partial: PuzzleDef = {
    ...authored,
    entries: authored.entries.map((e) => ({ ...e, number: 0 })),
  };
  const grid = buildGridFromEntries(partial);
  const { numbers } = numberGrid(grid);
  const entries = partial.entries.map((e) => {
    const n = numbers.get(cellKey(e.row, e.column));
    if (n === undefined) {
      throw new Error(
        `Entry "${e.answer}" (${e.direction} at r${e.row},c${e.column}) does not start a numbered slot`
      );
    }
    return { ...e, number: n };
  });
  entries.sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction));
  return { ...partial, entries, grid };
}
