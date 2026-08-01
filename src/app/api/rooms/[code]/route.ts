import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isExpired, normalizeRoomCode } from "@/lib/multiplayer/room";

export const dynamic = "force-dynamic";

const codeSchema = z.string().length(6);

/**
 * A summary the lobby can show before anyone takes a seat: enough to say
 * "this room is full" or "this room has ended" without joining it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const raw = await params;
  const parsed = codeSchema.safeParse(normalizeRoomCode(raw.code));
  if (!parsed.success) return NextResponse.json({ error: "bad_code" }, { status: 400 });

  const room = await prisma.multiplayerRoom.findUnique({
    where: { code: parsed.data },
    include: {
      puzzle: { select: { title: true, slug: true, language: true, difficulty: true } },
      participants: { where: { leftAt: null, blocked: false }, select: { id: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    room: {
      code: room.code,
      puzzleTitle: room.puzzle.title,
      language: room.puzzle.language,
      difficulty: room.puzzle.difficulty,
      visibility: room.visibility,
      participantCount: room.participants.length,
      participantLimit: room.participantLimit,
      allowGuests: room.allowGuests,
      locked: room.locked,
      ended: room.endedAt !== null || isExpired(room.expiresAt, new Date()),
    },
  });
}
