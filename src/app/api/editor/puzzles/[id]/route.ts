import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { exportPuzzleDef, savePuzzleDef } from "@/lib/db/puzzle-io";
import { puzzleFileSchema } from "@/lib/crossword/schema";
import { validatePuzzle } from "@/lib/crossword/validate";
import type { PuzzleDef } from "@/lib/crossword/types";
import { requireConstructor } from "@/lib/auth/constructors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const { id } = await params;
  const def = await exportPuzzleDef(id);
  if (!def) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(def);
}

/** Full content save from the editor. Structure must parse; validation
 * errors are reported but only block non-draft statuses. */
export async function PUT(request: Request, { params }: Params) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.puzzle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = puzzleFileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const def = parsed.data as PuzzleDef;

  const slugOwner = await prisma.puzzle.findUnique({ where: { slug: def.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  const result = validatePuzzle(def);
  const keepDraft = existing.status === "draft" || existing.status === "revisions_requested";
  if (!result.valid && !keepDraft) {
    return NextResponse.json(
      { error: "validation_failed", issues: result.issues },
      { status: 422 }
    );
  }

  try {
    await savePuzzleDef({ ...def, status: def.status ?? (existing.status as PuzzleDef["status"]) }, { id });
  } catch (e) {
    return NextResponse.json(
      { error: "save_failed", message: (e as Error).message },
      { status: 422 }
    );
  }
  return NextResponse.json({ ok: true, issues: result.issues });
}

const statusSchema = z.object({
  status: z.enum([
    "draft",
    "needs_review",
    "in_review",
    "revisions_requested",
    "approved",
    "scheduled",
    "published",
    "archived",
  ]),
  editor: z.string().max(80).optional(),
  revisionNotes: z.string().max(4000).optional(),
  publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Editorial workflow transition. Publishing requires a fully valid puzzle. */
export async function PATCH(request: Request, { params }: Params) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { status, editor, revisionNotes, publicationDate } = parsed.data;

  if (status === "published" || status === "scheduled" || status === "approved") {
    const def = await exportPuzzleDef(id);
    if (!def) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = validatePuzzle(def);
    if (!result.valid) {
      return NextResponse.json(
        { error: "validation_failed", issues: result.issues },
        { status: 422 }
      );
    }
  }

  await prisma.puzzle.update({
    where: { id },
    data: {
      status,
      editor,
      revisionNotes,
      lastReviewedAt:
        status === "in_review" || status === "approved" || status === "revisions_requested"
          ? new Date()
          : undefined,
      publicationDate: publicationDate ? new Date(publicationDate) : undefined,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.puzzle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.status === "published") {
    return NextResponse.json({ error: "cannot_delete_published" }, { status: 409 });
  }
  await prisma.puzzle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
