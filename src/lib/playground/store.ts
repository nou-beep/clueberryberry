import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { PuzzleLanguage } from "@/lib/crossword/types";
import {
  parseDefinition,
  playgroundDefinitionSchema,
  type PlaygroundDefinition,
} from "./definition";

/**
 * Storage for saved Playground puzzles.
 *
 * These are never mixed with the reviewed library: they live in their own table
 * and are only ever read through the functions here, which always carry the
 * owner check. Nothing in this file can return another player's private puzzle.
 */

export type Visibility = "private" | "link" | "public";

/**
 * Saved puzzles per account. Generation itself is offline and costs the server
 * nothing, so the cap is on what gets stored — the only thing a script could
 * actually fill up.
 */
export const CREATION_CAP = 60;

export interface PlaygroundSummary {
  id: string;
  title: string;
  language: PuzzleLanguage;
  subject: string;
  topic: string;
  difficulty: string;
  size: string;
  visibility: Visibility;
  shareSlug: string | null;
  entryCount: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  /** False when the stored JSON no longer parses; the card says so. */
  readable: boolean;
}

export interface PlaygroundRecord extends PlaygroundSummary {
  definition: PlaygroundDefinition;
  seed: number;
  ownerId: string;
}

const asVisibility = (value: string): Visibility =>
  value === "link" || value === "public" ? value : "private";

const asLanguage = (value: string): PuzzleLanguage =>
  value === "fr" || value === "ar" ? value : "en";

interface Row {
  id: string;
  ownerId: string;
  title: string;
  language: string;
  subject: string;
  topic: string;
  difficulty: string;
  size: string;
  seed: number;
  definition: string;
  visibility: string;
  shareSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toSummary(row: Row, definition: PlaygroundDefinition | null): PlaygroundSummary {
  return {
    id: row.id,
    title: row.title,
    language: asLanguage(row.language),
    subject: row.subject,
    topic: row.topic,
    difficulty: row.difficulty,
    size: row.size,
    visibility: asVisibility(row.visibility),
    shareSlug: row.shareSlug,
    entryCount: definition?.entries.length ?? 0,
    width: definition?.width ?? 0,
    height: definition?.height ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    readable: definition !== null,
  };
}

function toRecord(row: Row, definition: PlaygroundDefinition): PlaygroundRecord {
  return { ...toSummary(row, definition), definition, seed: row.seed, ownerId: row.ownerId };
}

/** Everything one player has saved, newest first. */
export async function listCreations(ownerId: string): Promise<PlaygroundSummary[]> {
  const rows = await prisma.playgroundPuzzle.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => toSummary(row, parseDefinition(row.definition)));
}

export async function countCreations(ownerId: string): Promise<number> {
  return prisma.playgroundPuzzle.count({ where: { ownerId } });
}

/** One saved puzzle, only if this account owns it. */
export async function getOwned(
  id: string,
  ownerId: string
): Promise<PlaygroundRecord | null> {
  const row = await prisma.playgroundPuzzle.findFirst({ where: { id, ownerId } });
  if (!row) return null;
  const definition = parseDefinition(row.definition);
  return definition ? toRecord(row, definition) : null;
}

/**
 * A puzzle shared by link. `link` and `public` are both reachable with the
 * slug; `private` never is, even if the slug is guessed.
 */
export async function getShared(shareSlug: string): Promise<PlaygroundRecord | null> {
  const row = await prisma.playgroundPuzzle.findFirst({
    where: { shareSlug, visibility: { in: ["link", "public"] } },
  });
  if (!row) return null;
  const definition = parseDefinition(row.definition);
  return definition ? toRecord(row, definition) : null;
}

/** Unguessable share slug. Not seeded: this must not be reproducible. */
function mintShareSlug(): string {
  return randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface SaveInput {
  title: string;
  language: PuzzleLanguage;
  subject: string;
  topic: string;
  difficulty: string;
  size: string;
  seed: number;
  definition: PlaygroundDefinition;
}

export type SaveResult =
  | { ok: true; record: PlaygroundRecord }
  | { ok: false; code: "cap_reached" | "not_found" | "invalid_definition" };

export async function createCreation(
  ownerId: string,
  input: SaveInput
): Promise<SaveResult> {
  if ((await countCreations(ownerId)) >= CREATION_CAP) {
    return { ok: false, code: "cap_reached" };
  }
  const parsed = playgroundDefinitionSchema.safeParse(input.definition);
  if (!parsed.success) return { ok: false, code: "invalid_definition" };

  const row = await prisma.playgroundPuzzle.create({
    data: {
      ownerId,
      title: input.title,
      language: input.language,
      subject: input.subject,
      topic: input.topic,
      difficulty: input.difficulty,
      size: input.size,
      seed: input.seed,
      definition: JSON.stringify(parsed.data),
      visibility: "private",
    },
  });
  return { ok: true, record: toRecord(row, parsed.data) };
}

export interface UpdateInput {
  title?: string;
  difficulty?: string;
  definition?: PlaygroundDefinition;
  visibility?: Visibility;
}

export async function updateCreation(
  id: string,
  ownerId: string,
  patch: UpdateInput
): Promise<SaveResult> {
  const existing = await prisma.playgroundPuzzle.findFirst({ where: { id, ownerId } });
  if (!existing) return { ok: false, code: "not_found" };

  let definition = parseDefinition(existing.definition);
  if (patch.definition) {
    const parsed = playgroundDefinitionSchema.safeParse(patch.definition);
    if (!parsed.success) return { ok: false, code: "invalid_definition" };
    definition = parsed.data;
  }
  if (!definition) return { ok: false, code: "invalid_definition" };

  // Sharing needs a slug; it is minted once and kept, so a link that has been
  // given out keeps working after a puzzle is unshared and shared again.
  const visibility = patch.visibility ?? asVisibility(existing.visibility);
  const shareSlug =
    visibility === "private"
      ? existing.shareSlug
      : existing.shareSlug ?? mintShareSlug();

  const row = await prisma.playgroundPuzzle.update({
    where: { id },
    data: {
      title: patch.title ?? definition.title,
      difficulty: patch.difficulty ?? definition.difficulty,
      definition: JSON.stringify(definition),
      visibility,
      shareSlug,
    },
  });
  return { ok: true, record: toRecord(row, definition) };
}

export async function deleteCreation(id: string, ownerId: string): Promise<boolean> {
  const result = await prisma.playgroundPuzzle.deleteMany({ where: { id, ownerId } });
  return result.count > 0;
}

/** Copy a puzzle this account owns, so the original can be kept intact. */
export async function duplicateCreation(
  id: string,
  ownerId: string,
  title: string
): Promise<SaveResult> {
  const source = await getOwned(id, ownerId);
  if (!source) return { ok: false, code: "not_found" };
  return createCreation(ownerId, {
    title,
    language: source.language,
    subject: source.subject,
    topic: source.topic,
    difficulty: source.difficulty,
    size: source.size,
    seed: source.seed,
    definition: { ...source.definition, title },
  });
}

/**
 * Puzzles other people have shared publicly. Link-only puzzles are deliberately
 * excluded: "shared with me" is not a directory of everything ever shared.
 */
export async function listSharedWithMe(
  excludeOwnerId: string | null,
  limit = 12
): Promise<PlaygroundSummary[]> {
  const rows = await prisma.playgroundPuzzle.findMany({
    where: {
      visibility: "public",
      shareSlug: { not: null },
      ...(excludeOwnerId ? { NOT: { ownerId: excludeOwnerId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map((row) => toSummary(row, parseDefinition(row.definition)));
}
