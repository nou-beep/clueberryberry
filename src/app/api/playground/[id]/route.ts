import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { playgroundDefinitionSchema, toPuzzleDef } from "@/lib/playground/definition";
import { validatePuzzle } from "@/lib/crossword/validate";
import { deleteCreation, getOwned, updateCreation } from "@/lib/playground/store";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    definition: playgroundDefinitionSchema.optional(),
    visibility: z.enum(["private", "link", "public"]).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.definition !== undefined ||
      value.visibility !== undefined,
    { message: "nothing_to_update" }
  );

export async function GET(_request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const { id } = await params;
  const record = await getOwned(id, userId);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ creation: record });
}

/**
 * Save an edit. A stored puzzle is always playable, so a definition that no
 * longer validates is refused with the checks that failed rather than written
 * and discovered later by whoever opens the link.
 */
export async function PATCH(request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  const limited = rateLimit(request, "playground-update", { max: 120, windowMs: 3_600_000 });
  if (limited) return limited;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.definition) {
    const result = validatePuzzle(toPuzzleDef(parsed.data.definition));
    if (!result.valid) {
      return NextResponse.json(
        { error: "validation_failed", checks: result.errors.map((issue) => issue.code) },
        { status: 422 }
      );
    }
  }

  const saved = await updateCreation(id, userId, parsed.data);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.code }, {
      status: saved.code === "not_found" ? 404 : 400,
    });
  }
  return NextResponse.json({ creation: saved.record });
}

export async function DELETE(request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  const limited = rateLimit(request, "playground-delete", { max: 60, windowMs: 3_600_000 });
  if (limited) return limited;

  const { id } = await params;
  const removed = await deleteCreation(id, userId);
  if (!removed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
