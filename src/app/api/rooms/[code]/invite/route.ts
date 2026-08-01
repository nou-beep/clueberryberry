import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateRoomCode, normalizeRoomCode } from "@/lib/multiplayer/room";
import { verifyParticipantToken } from "@/lib/multiplayer/token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** The seat token proves the caller is actually in this room. */
  token: z.string().min(1).max(512),
});

const INVITE_USES = 20;
const INVITE_TTL_MS = 12 * 60 * 60 * 1000;

/** Mint an invite link. Only the host may create one. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const limited = rateLimit(request, "room-invite", { max: 20, windowMs: 600_000 });
  if (limited) return limited;

  const { code } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const claim = verifyParticipantToken(parsed.data.token);
  if (!claim) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const room = await prisma.multiplayerRoom.findUnique({
    where: { code: normalizeRoomCode(code) },
    select: { id: true, endedAt: true },
  });
  if (!room || room.id !== claim.roomId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (room.endedAt) return NextResponse.json({ error: "ended" }, { status: 410 });

  const participant = await prisma.roomParticipant.findUnique({
    where: { id: claim.participantId },
    select: { isHost: true, roomId: true, blocked: true },
  });
  if (!participant || participant.roomId !== room.id || participant.blocked) {
    return NextResponse.json({ error: "no_seat" }, { status: 403 });
  }
  if (!participant.isHost) {
    return NextResponse.json({ error: "not_host" }, { status: 403 });
  }

  const now = new Date();
  const invite = await prisma.roomInvite.create({
    data: {
      roomId: room.id,
      code: `${generateRoomCode()}${generateRoomCode()}`,
      createdBy: claim.participantId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      usesRemaining: INVITE_USES,
    },
  });

  return NextResponse.json({
    invite: {
      code: invite.code,
      expiresAt: invite.expiresAt.toISOString(),
      usesRemaining: invite.usesRemaining,
    },
  });
}
