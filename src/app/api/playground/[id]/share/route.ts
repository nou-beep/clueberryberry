import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { updateCreation } from "@/lib/playground/store";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ visibility: z.enum(["private", "link", "public"]) });

/**
 * Turn sharing on or off. The response carries the share path so the interface
 * shows a link that exists rather than one it assembled hopefully.
 */
export async function POST(request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  const limited = rateLimit(request, "playground-share", { max: 60, windowMs: 3_600_000 });
  if (limited) return limited;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const saved = await updateCreation(id, userId, { visibility: parsed.data.visibility });
  if (!saved.ok) {
    return NextResponse.json({ error: saved.code }, {
      status: saved.code === "not_found" ? 404 : 400,
    });
  }

  const { visibility, shareSlug } = saved.record;
  return NextResponse.json({
    visibility,
    shareSlug,
    sharePath: visibility === "private" || !shareSlug ? null : `/playground/shared/${shareSlug}`,
  });
}
