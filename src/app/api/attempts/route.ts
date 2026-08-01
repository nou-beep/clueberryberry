import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { stickerForSlug } from "@/lib/stickers";
import { attemptFromRow, type AttemptRow } from "@/lib/progress/reconcile";

const cellSchema = z.object({
  letter: z.string().max(8),
  flags: z.array(z.enum(["revealed", "checked-wrong", "confirmed"])).max(3),
});

const gridStateSchema = z.object({
  cells: z.array(z.array(cellSchema).max(64)).max(64),
});

const attemptSchema = z.object({
  puzzleId: z.string().min(1),
  state: gridStateSchema,
  elapsedSeconds: z.number().int().min(0).max(1_000_000),
  mistakes: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  checksUsed: z.number().int().min(0),
  completionPercentage: z.number().int().min(0).max(100),
  status: z.enum(["in_progress", "completed"]),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  selectedRow: z.number().int().min(0).max(63).nullable(),
  selectedColumn: z.number().int().min(0).max(63).nullable(),
  direction: z.enum(["across", "down"]),
  timerVisible: z.boolean(),
  notes: z.string().max(4_000).nullable(),
  clientUpdatedAt: z.string().min(1),
});

const writeSchema = z.object({
  baseRevision: z.number().int().min(0),
  attempt: attemptSchema,
});

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

interface PuzzleFacts {
  slug: string;
  title: string;
  language: string;
  difficulty: string;
  subject: { slug: string };
  topic: { slug: string };
}

const puzzleSelect = {
  slug: true,
  title: true,
  language: true,
  difficulty: true,
  subject: { select: { slug: true } },
  topic: { select: { slug: true } },
} as const;

interface StoredAttempt {
  puzzleId: string;
  currentGridState: string;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  checksUsed: number;
  completionPercentage: number;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  selectedRow: number | null;
  selectedColumn: number | null;
  direction: string;
  timerVisible: boolean;
  notes: string | null;
  revision: number;
  updatedAt: Date;
}

function rowFor(
  attempt: StoredAttempt,
  puzzle: PuzzleFacts,
  dailyDate: string | null
): AttemptRow {
  return {
    puzzleId: attempt.puzzleId,
    slug: puzzle.slug,
    title: puzzle.title,
    language: puzzle.language,
    subjectSlug: puzzle.subject.slug,
    topicSlug: puzzle.topic.slug,
    difficulty: puzzle.difficulty,
    currentGridState: attempt.currentGridState,
    elapsedSeconds: attempt.elapsedSeconds,
    mistakes: attempt.mistakes,
    hintsUsed: attempt.hintsUsed,
    checksUsed: attempt.checksUsed,
    completionPercentage: attempt.completionPercentage,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    selectedRow: attempt.selectedRow,
    selectedColumn: attempt.selectedColumn,
    direction: attempt.direction,
    timerVisible: attempt.timerVisible,
    notes: attempt.notes,
    revision: attempt.revision,
    updatedAt: attempt.updatedAt,
    dailyDate,
  };
}

/** Award the puzzle's sticker exactly once per completion, server-side. */
async function awardSticker(userId: string, puzzleSlug: string) {
  const slug = stickerForSlug(puzzleSlug);
  await prisma.userSticker.upsert({
    where: { userId_stickerSlug: { userId, stickerSlug: slug } },
    create: { userId, stickerSlug: slug, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/**
 * Upsert the signed-in user's attempt for a puzzle.
 *
 * Writes carry the revision they were based on. If the stored row has moved on
 * — another device saved in the meantime — the write is refused with 409 and
 * the authoritative row, so the client can reconcile instead of clobbering.
 */
export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = writeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { baseRevision, attempt: a } = parsed.data;

  const puzzle = await prisma.puzzle.findUnique({
    where: { id: a.puzzleId },
    select: puzzleSelect,
  });
  if (!puzzle) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const daily = await prisma.dailyPuzzle.findFirst({
    where: { puzzleId: a.puzzleId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const dailyDate = daily?.date ?? null;

  const existing = await prisma.puzzleAttempt.findUnique({
    where: { userId_puzzleId: { userId, puzzleId: a.puzzleId } },
  });

  if (existing && existing.revision !== baseRevision) {
    return NextResponse.json(
      { attempt: attemptFromRow(rowFor(existing, puzzle, dailyDate)) },
      { status: 409 }
    );
  }

  const completedAt = parseDate(a.completedAt) ?? null;
  const data = {
    currentGridState: JSON.stringify(a.state),
    elapsedSeconds: a.elapsedSeconds,
    mistakes: a.mistakes,
    hintsUsed: a.hintsUsed,
    checksUsed: a.checksUsed,
    completionPercentage: a.completionPercentage,
    status: a.status,
    completedAt,
    selectedRow: a.selectedRow,
    selectedColumn: a.selectedColumn,
    direction: a.direction,
    timerVisible: a.timerVisible,
    notes: a.notes,
  };

  const saved = existing
    ? await prisma.puzzleAttempt.update({
        where: { userId_puzzleId: { userId, puzzleId: a.puzzleId } },
        data: { ...data, revision: existing.revision + 1 },
      })
    : await prisma.puzzleAttempt.create({
        data: {
          ...data,
          userId,
          puzzleId: a.puzzleId,
          startedAt: parseDate(a.startedAt) ?? new Date(),
          revision: 1,
        },
      });

  // Only the transition into "completed" earns a sticker, so re-saving a
  // finished puzzle (or a retry of the same write) cannot double-count.
  const wasCompleted = existing?.status === "completed";
  if (!wasCompleted && saved.status === "completed") {
    await awardSticker(userId, puzzle.slug);
  }

  return NextResponse.json({ attempt: attemptFromRow(rowFor(saved, puzzle, dailyDate)) });
}

/**
 * `navigator.sendBeacon` can only POST, and a page closing on a finished solve
 * is exactly when the write matters most — so POST is the same operation.
 */
export const POST = PUT;

/** The signed-in user's attempts, in the shape the journal already reads. */
export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const puzzleId = new URL(request.url).searchParams.get("puzzleId");
  const attempts = await prisma.puzzleAttempt.findMany({
    where: { userId, ...(puzzleId ? { puzzleId } : {}) },
    include: { puzzle: { select: puzzleSelect } },
  });
  const dailies = await prisma.dailyPuzzle.findMany({
    where: { puzzleId: { in: attempts.map((a) => a.puzzleId) } },
    select: { puzzleId: true, date: true },
  });
  const dailyByPuzzle = new Map(dailies.map((d) => [d.puzzleId, d.date]));

  return NextResponse.json({
    attempts: attempts.map((a) =>
      attemptFromRow(rowFor(a, a.puzzle, dailyByPuzzle.get(a.puzzleId) ?? null))
    ),
  });
}
