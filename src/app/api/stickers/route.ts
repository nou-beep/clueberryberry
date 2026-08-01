import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { STICKER_SLUGS, type StickerSlug } from "@/lib/stickers";

/**
 * The signed-in player's sticker sheet, as counted on the server.
 *
 * Stickers are awarded by the attempt writes (`PUT /api/attempts` and the guest
 * merge), never by the browser, so a player cannot earn one twice for the same
 * puzzle and the sheet is the same on every device.
 */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await prisma.userSticker.findMany({
    where: { userId },
    select: { stickerSlug: true, count: true, firstEarnedAt: true },
  });
  const known = new Set<string>(STICKER_SLUGS);
  const stickers = rows
    .filter((row) => known.has(row.stickerSlug))
    .map((row) => ({
      slug: row.stickerSlug as StickerSlug,
      count: row.count,
      firstEarnedAt: row.firstEarnedAt.toISOString(),
    }));
  return NextResponse.json({ stickers });
}
