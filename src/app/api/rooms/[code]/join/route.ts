import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_DISPLAY_NAME, normalizeRoomCode } from "@/lib/multiplayer/room";
import { joinRoom, type JoinFailure } from "@/lib/multiplayer/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  displayName: z.string().max(MAX_DISPLAY_NAME * 2).optional(),
  invite: z.string().min(1).max(64).optional(),
});

/** Rejections the caller can fix are 409; a missing room is 404. */
const STATUS: Record<JoinFailure, number> = {
  not_found: 404,
  bad_name: 400,
  bad_invite: 403,
  blocked: 403,
  guests_disabled: 403,
  locked: 409,
  full: 409,
  ended: 410,
  expired: 410,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const limited = rateLimit(request, "room-join", { max: 30, windowMs: 300_000 });
  if (limited) return limited;

  const { code } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = await currentUserId();
  const outcome = await joinRoom({
    code: normalizeRoomCode(code),
    userId,
    guestName: parsed.data.displayName,
    invite: parsed.data.invite,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.reason },
      { status: STATUS[outcome.reason] }
    );
  }
  return NextResponse.json({ seat: outcome.seat });
}
