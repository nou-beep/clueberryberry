import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  DEFAULT_PARTICIPANTS,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  ROOM_VISIBILITIES,
  validateDisplayName,
} from "@/lib/multiplayer/room";
import { createRoom, resolveMemberName } from "@/lib/multiplayer/service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  puzzleId: z.string().min(1).max(64),
  visibility: z.enum(ROOM_VISIBILITIES),
  participantLimit: z.number().int().min(MIN_PARTICIPANTS).max(MAX_PARTICIPANTS),
  chatEnabled: z.boolean(),
  allowGuests: z.boolean(),
  hintsNeedApproval: z.boolean(),
  /** Required when creating a room without an account. */
  displayName: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "room-create", { max: 10, windowMs: 600_000 });
  if (limited) return limited;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const puzzle = await prisma.puzzle.findUnique({
    where: { id: input.puzzleId },
    select: { id: true, status: true },
  });
  if (!puzzle || puzzle.status !== "published") {
    return NextResponse.json({ error: "puzzle_not_found" }, { status: 404 });
  }

  const userId = await currentUserId();
  const hostName = userId
    ? await resolveMemberName(userId)
    : (input.displayName ?? "");
  const named = validateDisplayName(hostName);
  if (!named.ok) {
    return NextResponse.json({ error: "bad_name", reason: named.reason }, { status: 400 });
  }

  const seat = await createRoom({
    puzzleId: puzzle.id,
    visibility: input.visibility,
    participantLimit: input.participantLimit || DEFAULT_PARTICIPANTS,
    chatEnabled: input.chatEnabled,
    allowGuests: input.allowGuests,
    hintsNeedApproval: input.hintsNeedApproval,
    hostUserId: userId,
    hostName: named.name,
  });

  return NextResponse.json({ seat }, { status: 201 });
}
