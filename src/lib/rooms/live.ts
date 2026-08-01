import { prisma } from "@/lib/db/prisma";

export interface LiveRoom {
  code: string;
  puzzleTitle: string;
  subjectSlug: string;
  subjectTheme: string;
  subjectName: string;
  language: string;
  players: number;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  full: boolean;
}

/**
 * Public rooms that are genuinely joinable right now: not ended, not expired,
 * not locked, and with at least one person who has not left.
 *
 * The participant count only counts participants with no `leftAt`, so an empty
 * room that nobody has cleaned up yet does not appear on the homepage
 * advertising company that isn't there. When there are no live rooms this
 * returns an empty array and the caller renders nothing at all.
 */
export async function listLiveRooms(locale: string, limit = 3): Promise<LiveRoom[]> {
  const rooms = await prisma.multiplayerRoom.findMany({
    where: {
      visibility: "public",
      endedAt: null,
      locked: false,
      expiresAt: { gt: new Date() },
      participants: { some: { leftAt: null } },
    },
    select: {
      code: true,
      chatEnabled: true,
      voiceEnabled: true,
      participantLimit: true,
      puzzle: {
        select: {
          title: true,
          language: true,
          subject: { select: { slug: true, theme: true, names: true } },
        },
      },
      _count: { select: { participants: { where: { leftAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rooms
    .filter((room) => room._count.participants > 0)
    .map((room) => {
      let subjectName = room.puzzle.subject.slug;
      try {
        subjectName =
          (JSON.parse(room.puzzle.subject.names) as Record<string, string>)[locale] ??
          subjectName;
      } catch {
        // Fall back to the slug rather than dropping the room.
      }
      return {
        code: room.code,
        puzzleTitle: room.puzzle.title,
        subjectSlug: room.puzzle.subject.slug,
        subjectTheme: room.puzzle.subject.theme,
        subjectName,
        language: room.puzzle.language,
        players: room._count.participants,
        chatEnabled: room.chatEnabled,
        voiceEnabled: room.voiceEnabled,
        full: room._count.participants >= room.participantLimit,
      };
    });
}
