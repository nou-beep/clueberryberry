import { prisma } from "./prisma";
import { buildGridFromEntries } from "@/lib/crossword/grid";
import { answerToCells } from "@/lib/crossword/normalize";
import type { PuzzleDef } from "@/lib/crossword/types";
import type { Prisma, Puzzle } from "@prisma/client";

/**
 * Persist a full puzzle definition (entries + fact cards + derived grid).
 * Used by the seed pipeline, the editor save endpoint, and JSON import.
 * Throws if the grid cannot be built from the entries.
 */
export async function savePuzzleDef(
  def: PuzzleDef,
  options: { id?: string } = {}
): Promise<Puzzle> {
  const grid = buildGridFromEntries(def);
  const subject = await prisma.subject.findUnique({ where: { slug: def.subject } });
  if (!subject) throw new Error(`Unknown subject slug "${def.subject}"`);
  const topic = await prisma.topic.findFirst({
    where: { slug: def.topic, subjectId: subject.id },
  });
  if (!topic) throw new Error(`Unknown topic slug "${def.topic}" in ${def.subject}`);

  const data = {
    slug: def.slug,
    title: def.title,
    language: def.language,
    subjectId: subject.id,
    topicId: topic.id,
    difficulty: def.difficulty,
    status: def.status ?? "draft",
    publicationDate: def.publicationDate ? new Date(def.publicationDate) : null,
    gridWidth: def.width,
    gridHeight: def.height,
    gridData: JSON.stringify(grid),
    author: def.author,
    editor: def.editor ?? null,
    estimatedSolveTime: def.estimatedSolveTime ?? null,
    introduction: def.introduction ?? null,
    completionMessage: def.completionMessage ?? null,
    symmetry: def.symmetry ?? false,
    normalization: def.normalization ? JSON.stringify(def.normalization) : null,
  } satisfies Prisma.PuzzleUncheckedCreateInput;

  const entryRows = def.entries.map((e) => ({
    number: e.number,
    direction: e.direction,
    row: e.row,
    column: e.column,
    length: answerToCells(e.answer, def.language, def.normalization).length,
    answer: e.answer,
    normalizedAnswer: answerToCells(e.answer, def.language, def.normalization).join(""),
    acceptedAlternatives: JSON.stringify(e.acceptedAlternatives ?? []),
    clue: e.clue,
    clueStyle: e.clueStyle,
    explanation: e.explanation ?? null,
    sourceNotes: e.sourceNotes ?? null,
    difficultyRating: e.difficultyRating ?? null,
    isThemeEntry: e.isThemeEntry ?? false,
  }));

  const factRows = (def.factCards ?? []).map((f, i) => ({
    text: f.text,
    sourceTitle: f.sourceTitle ?? null,
    sourceUrl: f.sourceUrl ?? null,
    reviewStatus: f.reviewStatus ?? "needs_review",
    order: i,
  }));

  if (options.id) {
    const [, , , puzzle] = await prisma.$transaction([
      prisma.entry.deleteMany({ where: { puzzleId: options.id } }),
      prisma.factCard.deleteMany({ where: { puzzleId: options.id } }),
      prisma.puzzle.update({ where: { id: options.id }, data }),
      prisma.puzzle.update({
        where: { id: options.id },
        data: {
          entries: { create: entryRows },
          factCards: { create: factRows },
        },
      }),
    ]);
    return puzzle;
  }

  return prisma.puzzle.create({
    data: {
      ...data,
      entries: { create: entryRows },
      factCards: { create: factRows },
    },
  });
}

/** Serialize a stored puzzle back into the JSON interchange format. */
export async function exportPuzzleDef(id: string): Promise<PuzzleDef | null> {
  const p = await prisma.puzzle.findUnique({
    where: { id },
    include: { entries: true, subject: true, topic: true, factCards: true },
  });
  if (!p) return null;
  return {
    slug: p.slug,
    title: p.title,
    language: p.language as PuzzleDef["language"],
    subject: p.subject.slug,
    topic: p.topic.slug,
    difficulty: p.difficulty as PuzzleDef["difficulty"],
    width: p.gridWidth,
    height: p.gridHeight,
    grid: JSON.parse(p.gridData),
    entries: p.entries
      .sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction))
      .map((e) => ({
        number: e.number,
        direction: e.direction as "across" | "down",
        row: e.row,
        column: e.column,
        answer: e.answer,
        clue: e.clue,
        clueStyle: e.clueStyle as PuzzleDef["entries"][number]["clueStyle"],
        acceptedAlternatives: JSON.parse(e.acceptedAlternatives) as string[],
        explanation: e.explanation ?? undefined,
        sourceNotes: e.sourceNotes ?? undefined,
        difficultyRating: e.difficultyRating ?? undefined,
        isThemeEntry: e.isThemeEntry,
      })),
    author: p.author,
    editor: p.editor ?? undefined,
    status: p.status as PuzzleDef["status"],
    publicationDate: p.publicationDate?.toISOString().slice(0, 10),
    estimatedSolveTime: p.estimatedSolveTime ?? undefined,
    introduction: p.introduction ?? undefined,
    completionMessage: p.completionMessage ?? undefined,
    symmetry: p.symmetry,
    normalization: p.normalization ? JSON.parse(p.normalization) : undefined,
    factCards: p.factCards
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
        text: f.text,
        sourceTitle: f.sourceTitle ?? undefined,
        sourceUrl: f.sourceUrl ?? undefined,
        reviewStatus: f.reviewStatus as "needs_review" | "verified",
      })),
  };
}
