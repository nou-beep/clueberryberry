import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const inviteSchema = z.string().min(6).max(64);

/** Resolve an invite link to the room code it unlocks. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invite: string }> }
) {
  const { invite: raw } = await params;
  const parsed = inviteSchema.safeParse(raw.toUpperCase());
  if (!parsed.success) return NextResponse.json({ error: "bad_invite" }, { status: 400 });

  const invite = await prisma.roomInvite.findUnique({
    where: { code: parsed.data },
    include: { room: { select: { code: true, endedAt: true, expiresAt: true } } },
  });
  const now = new Date();
  if (
    !invite ||
    invite.usesRemaining <= 0 ||
    invite.expiresAt.getTime() <= now.getTime() ||
    invite.room.endedAt !== null ||
    invite.room.expiresAt.getTime() <= now.getTime()
  ) {
    return NextResponse.json({ error: "bad_invite" }, { status: 404 });
  }
  return NextResponse.json({ code: invite.room.code });
}
