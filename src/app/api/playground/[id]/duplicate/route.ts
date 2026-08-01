import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { CREATION_CAP, duplicateCreation } from "@/lib/playground/store";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ title: z.string().trim().min(1).max(120) });

/** Copy a saved puzzle so the original survives a remix. */
export async function POST(request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  const limited = rateLimit(request, "playground-duplicate", {
    max: 30,
    windowMs: 3_600_000,
  });
  if (limited) return limited;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await duplicateCreation(id, userId, parsed.data.title);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, cap: CREATION_CAP },
      { status: result.code === "not_found" ? 404 : 409 }
    );
  }
  return NextResponse.json({ creation: result.record }, { status: 201 });
}
