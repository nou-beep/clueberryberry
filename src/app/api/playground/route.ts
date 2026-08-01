import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { playgroundDefinitionSchema } from "@/lib/playground/definition";
import {
  CREATION_CAP,
  countCreations,
  createCreation,
  listCreations,
} from "@/lib/playground/store";

/**
 * Saved Playground puzzles for the signed-in account.
 *
 * Generation happens entirely in the browser, so the server never builds a
 * puzzle; these endpoints only store what the player decided to keep. That is
 * also why the abuse cap is on saves rather than on generation.
 */

const saveSchema = z.object({
  title: z.string().trim().min(1).max(120),
  language: z.enum(["en", "fr", "ar"]),
  subject: z.string().min(1).max(80),
  topic: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
  size: z.enum(["small", "medium", "large"]),
  seed: z.number().int().min(0).max(0xffffffff),
  definition: playgroundDefinitionSchema,
});

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const creations = await listCreations(userId);
  return NextResponse.json({ creations, cap: CREATION_CAP });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  const limited = rateLimit(request, "playground-save", { max: 40, windowMs: 3_600_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createCreation(userId, parsed.data);
  if (!result.ok) {
    const status = result.code === "cap_reached" ? 409 : 400;
    return NextResponse.json(
      { error: result.code, cap: CREATION_CAP, saved: await countCreations(userId) },
      { status }
    );
  }
  return NextResponse.json({ creation: result.record }, { status: 201 });
}
