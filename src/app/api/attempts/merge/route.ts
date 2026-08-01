import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { stickerForSlug } from "@/lib/stickers";
import {
  attemptFromRow,
  planMerge,
  toDifficulty,
  toPuzzleLanguage,
} from "@/lib/progress/reconcile";
import type { LocalAttempt } from "@/lib/progress/local";

const cellSchema = z.object({
  letter: z.string().max(8),
  flags: z.array(z.enum(["revealed", "checked-wrong", "confirmed"])).max(3),
});

const gridStateSchema = z.object({
  cells: z.array(z.array(cellSchema).max(64)).max(64),
});

const localAttemptSchema = z.object({
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
  selectedRow: z.number().int().min(0).max(63).nullable().optional(),
  selectedColumn: z.number().int().min(0).max(63).nullable().optional(),
  direction: z.enum(["across", "down"]).optional(),
  timerVisible: z.boolean().optional(),
  notes: z.string().max(4_000).nullable().optional(),
  revision: z.number().int().min(0).optional(),
  updatedAt: z.string().min(1).optional(),
});

const mergeSchema = z.object({ attempts: z.array(localAttemptSchema).max(500) });

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Merge guest (browser-local) progress into the signed-in account.
 *
 * Uses exactly the same reconcile rules as live syncing, so a stale local copy
 * can never demote server progress. Idempotent: after the first pass the server
 * row carries the higher revision, so a second run decides "skip" every time.
 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let merged = 0;
  let skipped = 0;
  for (const incoming of parsed.data.attempts) {
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: incoming.puzzleId },
      select: {
        slug: true,
        title: true,
        language: true,
        difficulty: true,
        subject: { select: { slug: true } },
        topic: { select: { slug: true } },
      },
    });
    if (!puzzle) continue;

    const existing = await prisma.puzzleAttempt.findUnique({
      where: { userId_puzzleId: { userId, puzzleId: incoming.puzzleId } },
    });

    const local: LocalAttempt = {
      puzzleId: incoming.puzzleId,
      slug: puzzle.slug,
      title: puzzle.title,
      language: toPuzzleLanguage(puzzle.language),
      subjectSlug: puzzle.subject.slug,
      topicSlug: puzzle.topic.slug,
      difficulty: toDifficulty(puzzle.difficulty),
      state: incoming.state,
      elapsedSeconds: incoming.elapsedSeconds,
      mistakes: incoming.mistakes,
      hintsUsed: incoming.hintsUsed,
      checksUsed: incoming.checksUsed,
      completionPercentage: incoming.completionPercentage,
      status: incoming.status,
      startedAt: incoming.startedAt,
      completedAt: incoming.completedAt,
      selectedRow: incoming.selectedRow ?? null,
      selectedColumn: incoming.selectedColumn ?? null,
      direction: incoming.direction ?? "across",
      timerVisible: incoming.timerVisible ?? true,
      notes: incoming.notes ?? null,
      revision: incoming.revision ?? 0,
      updatedAt: incoming.updatedAt ?? incoming.completedAt ?? incoming.startedAt,
    };

    const server: LocalAttempt | null = existing
      ? attemptFromRow({
          puzzleId: existing.puzzleId,
          slug: puzzle.slug,
          title: puzzle.title,
          language: puzzle.language,
          subjectSlug: puzzle.subject.slug,
          topicSlug: puzzle.topic.slug,
          difficulty: puzzle.difficulty,
          currentGridState: existing.currentGridState,
          elapsedSeconds: existing.elapsedSeconds,
          mistakes: existing.mistakes,
          hintsUsed: existing.hintsUsed,
          checksUsed: existing.checksUsed,
          completionPercentage: existing.completionPercentage,
          status: existing.status,
          startedAt: existing.startedAt,
          completedAt: existing.completedAt,
          selectedRow: existing.selectedRow,
          selectedColumn: existing.selectedColumn,
          direction: existing.direction,
          timerVisible: existing.timerVisible,
          notes: existing.notes,
          revision: existing.revision,
          updatedAt: existing.updatedAt,
        })
      : null;

    const plan = planMerge(local, server);
    if (plan.action === "skip") {
      skipped++;
      continue;
    }

    const winner = plan.attempt;
    const data = {
      currentGridState: JSON.stringify(winner.state),
      elapsedSeconds: winner.elapsedSeconds,
      mistakes: winner.mistakes,
      hintsUsed: winner.hintsUsed,
      checksUsed: winner.checksUsed,
      completionPercentage: winner.completionPercentage,
      status: winner.status,
      completedAt: parseDate(winner.completedAt) ?? null,
      selectedRow: winner.selectedRow ?? null,
      selectedColumn: winner.selectedColumn ?? null,
      direction: winner.direction ?? "across",
      timerVisible: winner.timerVisible ?? true,
      notes: winner.notes ?? null,
    };

    if (plan.action === "create") {
      await prisma.puzzleAttempt.create({
        data: {
          ...data,
          userId,
          puzzleId: incoming.puzzleId,
          startedAt: parseDate(winner.startedAt) ?? new Date(),
          revision: 1,
        },
      });
    } else {
      await prisma.puzzleAttempt.update({
        where: { userId_puzzleId: { userId, puzzleId: incoming.puzzleId } },
        data: { ...data, revision: (existing?.revision ?? 0) + 1 },
      });
    }

    // Stickers are server-side truth; award only when this merge is what first
    // marked the puzzle finished.
    if (winner.status === "completed" && existing?.status !== "completed") {
      const slug = stickerForSlug(puzzle.slug);
      await prisma.userSticker.upsert({
        where: { userId_stickerSlug: { userId, stickerSlug: slug } },
        create: { userId, stickerSlug: slug, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
    merged++;
  }
  return NextResponse.json({ merged, skipped });
}
