import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeRoomCode } from "@/lib/multiplayer/room";
import { listRoomsByCode } from "@/lib/rooms/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  codes: z.array(z.string().length(6)).max(12),
  locale: z.enum(["en", "fr", "ar"]),
});

/**
 * Resolve the room codes a browser remembers sitting in. Codes for rooms that
 * ended or expired simply do not come back, so "Recently joined" can never
 * show a room that is no longer there.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    codes: (url.searchParams.get("codes") ?? "")
      .split(",")
      .map(normalizeRoomCode)
      .filter(Boolean),
    locale: url.searchParams.get("locale") ?? "en",
  });
  if (!parsed.success) return NextResponse.json({ rooms: [] });

  const rooms = await listRoomsByCode(parsed.data.codes, parsed.data.locale);
  return NextResponse.json({ rooms });
}
