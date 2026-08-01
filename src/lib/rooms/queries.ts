/**
 * Server-side reads for the Rooms destination and the Home "Live rooms" strip.
 *
 * Every function here returns real rows or an empty array. Nothing invents a
 * room, a participant count, or a host — a caller that gets `[]` must render
 * nothing at all rather than a placeholder (docs/information-architecture.md,
 * "Honesty").
 */

import { prisma } from "@/lib/db/prisma";
import { pickLocalized } from "@/lib/db/serialize";

/** Everything a room card shows. */
export interface RoomCard {
  code: string;
  puzzleTitle: string;
  puzzleSlug: string;
  subjectName: string;
  subjectSlug: string;
  subjectTheme: string;
  language: string;
  difficulty: string;
  participantCount: number;
  participantLimit: number;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  locked: boolean;
  visibility: string;
  hostName: string | null;
}

/**
 * Someone counts as present if their seat is open and the realtime server has
 * heard from them recently. Longer than a heartbeat, shorter than a coffee.
 */
const PRESENCE_WINDOW_MS = 3 * 60 * 1000;

const roomInclude = {
  puzzle: {
    select: {
      title: true,
      slug: true,
      language: true,
      difficulty: true,
      featured: true,
      subject: { select: { slug: true, names: true, theme: true } },
    },
  },
  participants: {
    where: { leftAt: null, blocked: false },
    select: { displayName: true, isHost: true, lastSeenAt: true },
  },
} as const;

type RoomRow = Awaited<
  ReturnType<typeof prisma.multiplayerRoom.findMany<{ include: typeof roomInclude }>>
>[number];

function toCard(room: RoomRow, locale: string): RoomCard {
  return {
    code: room.code,
    puzzleTitle: room.puzzle.title,
    puzzleSlug: room.puzzle.slug,
    subjectName: pickLocalized(room.puzzle.subject.names, locale),
    subjectSlug: room.puzzle.subject.slug,
    subjectTheme: room.puzzle.subject.theme,
    language: room.puzzle.language,
    difficulty: room.puzzle.difficulty,
    participantCount: room.participants.length,
    participantLimit: room.participantLimit,
    chatEnabled: room.chatEnabled,
    voiceEnabled: room.voiceEnabled,
    locked: room.locked,
    visibility: room.visibility,
    hostName: room.participants.find((p) => p.isHost)?.displayName ?? null,
  };
}

function livePredicate(now: Date) {
  return (room: RoomRow) =>
    room.participants.some(
      (p) => now.getTime() - p.lastSeenAt.getTime() < PRESENCE_WINDOW_MS
    );
}

const openRoomWhere = (now: Date) => ({
  endedAt: null,
  expiresAt: { gt: now },
});

/**
 * Public rooms with somebody actually in them right now. This is what Home's
 * strip and the lobby's "Live now" section render; an empty result means the
 * section is not rendered at all.
 */
export async function listLiveRoomCards(limit = 6, locale = "en"): Promise<RoomCard[]> {
  const now = new Date();
  const rooms = await prisma.multiplayerRoom.findMany({
    where: { ...openRoomWhere(now), visibility: "public" },
    include: roomInclude,
    orderBy: { createdAt: "desc" },
    take: limit * 4,
  });
  return rooms.filter(livePredicate(now)).slice(0, limit).map((r) => toCard(r, locale));
}

/** Public rooms playing a puzzle the editors have featured. */
export async function listFeaturedRooms(limit = 4, locale = "en"): Promise<RoomCard[]> {
  const now = new Date();
  const rooms = await prisma.multiplayerRoom.findMany({
    where: {
      ...openRoomWhere(now),
      visibility: "public",
      locked: false,
      puzzle: { featured: true },
    },
    include: roomInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rooms.map((r) => toCard(r, locale));
}

/** Private and invite-only rooms this signed-in player still holds a seat in. */
export async function listMyPrivateRooms(
  userId: string,
  locale = "en"
): Promise<RoomCard[]> {
  const now = new Date();
  const rooms = await prisma.multiplayerRoom.findMany({
    where: {
      ...openRoomWhere(now),
      visibility: { not: "public" },
      participants: { some: { userId, leftAt: null, blocked: false } },
    },
    include: roomInclude,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rooms.map((r) => toCard(r, locale));
}

/**
 * Rooms named by the codes a browser remembers sitting in. Codes that no
 * longer resolve are simply absent from the result.
 */
export async function listRoomsByCode(
  codes: readonly string[],
  locale = "en"
): Promise<RoomCard[]> {
  if (codes.length === 0) return [];
  const now = new Date();
  const rooms = await prisma.multiplayerRoom.findMany({
    where: { ...openRoomWhere(now), code: { in: codes.slice(0, 12) } },
    include: roomInclude,
  });
  const order = new Map(codes.map((code, index) => [code, index]));
  return rooms
    .sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0))
    .map((r) => toCard(r, locale));
}
