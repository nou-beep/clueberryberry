/**
 * Database-facing room operations shared by the REST routes. Kept out of the
 * route files so creating, joining and sweeping have one implementation.
 *
 * Server-only: imports Prisma and the seat-token signer.
 */

import { prisma } from "@/lib/db/prisma";
import { emptyAttempt } from "@/lib/crossword/attempt";
import {
  assignColorIndex,
  computeExpiry,
  generateRoomCode,
  isSweepable,
  validateDisplayName,
  validateJoin,
  type JoinRejection,
  type RoomVisibility,
} from "./room";
import { signParticipantToken } from "./token";

export interface SeatResult {
  roomId: string;
  code: string;
  participantId: string;
  displayName: string;
  colorIndex: number;
  isHost: boolean;
  token: string;
  expiresAt: number;
}

/** Retry on the (vanishingly unlikely) code collision rather than throw. */
async function reserveCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateRoomCode();
    const clash = await prisma.multiplayerRoom.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  throw new Error("could not allocate a free room code");
}

/** The name a signed-in player appears under, without asking them again. */
export async function resolveMemberName(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { multiplayerName: true, displayName: true },
  });
  if (profile?.multiplayerName) return profile.multiplayerName;
  if (profile?.displayName) return profile.displayName;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name?.trim() || "Player";
}

function seatFor(
  room: { id: string; code: string },
  participant: {
    id: string;
    displayName: string;
    colorIndex: number;
    isHost: boolean;
  }
): SeatResult {
  const now = new Date();
  return {
    roomId: room.id,
    code: room.code,
    participantId: participant.id,
    displayName: participant.displayName,
    colorIndex: participant.colorIndex,
    isHost: participant.isHost,
    token: signParticipantToken(participant.id, room.id, now),
    expiresAt: now.getTime() + 24 * 60 * 60 * 1000,
  };
}

export interface CreateRoomInput {
  puzzleId: string;
  visibility: RoomVisibility;
  participantLimit: number;
  chatEnabled: boolean;
  allowGuests: boolean;
  hintsNeedApproval: boolean;
  hostUserId: string | null;
  hostName: string;
}

export async function createRoom(input: CreateRoomInput): Promise<SeatResult> {
  const puzzle = await prisma.puzzle.findUnique({
    where: { id: input.puzzleId },
    select: { gridWidth: true, gridHeight: true },
  });
  if (!puzzle) throw new Error("puzzle not found");
  const code = await reserveCode();
  const now = new Date();
  const room = await prisma.multiplayerRoom.create({
    data: {
      code,
      hostId: input.hostUserId,
      puzzleId: input.puzzleId,
      visibility: input.visibility,
      participantLimit: input.participantLimit,
      chatEnabled: input.chatEnabled,
      voiceEnabled: false,
      allowGuests: input.allowGuests,
      hintsNeedApproval: input.hintsNeedApproval,
      expiresAt: computeExpiry(now),
      participants: {
        create: {
          userId: input.hostUserId,
          guestName: input.hostUserId ? null : input.hostName,
          displayName: input.hostName,
          colorIndex: 0,
          isHost: true,
        },
      },
      state: {
        create: {
          gridState: JSON.stringify(
            emptyAttempt(puzzle.gridWidth, puzzle.gridHeight)
          ),
          revision: 0,
        },
      },
    },
    include: { participants: true },
  });
  const host = room.participants[0];
  return seatFor(room, host);
}

export type JoinFailure = JoinRejection | "not_found" | "bad_name" | "bad_invite";

export type JoinOutcome =
  | { ok: true; seat: SeatResult }
  | { ok: false; reason: JoinFailure };

export interface JoinInput {
  code: string;
  userId: string | null;
  /** Required for guests, ignored for signed-in players. */
  guestName?: string;
  /** Invite code from a shared link; lets an invite-only room accept you. */
  invite?: string;
}

export async function joinRoom(input: JoinInput): Promise<JoinOutcome> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { code: input.code },
    include: { participants: true },
  });
  if (!room) return { ok: false, reason: "not_found" };

  const now = new Date();
  const existing = input.userId
    ? room.participants.find((p) => p.userId === input.userId)
    : undefined;

  if (room.visibility === "invite" && !existing) {
    const invite = input.invite
      ? await prisma.roomInvite.findUnique({ where: { code: input.invite } })
      : null;
    const usable =
      invite &&
      invite.roomId === room.id &&
      invite.usesRemaining > 0 &&
      invite.expiresAt.getTime() > now.getTime();
    if (!usable) return { ok: false, reason: "bad_invite" };
  }

  const activeCount = room.participants.filter(
    (p) => p.leftAt === null && !p.blocked && p.id !== existing?.id
  ).length;

  const decision = validateJoin({
    room: {
      locked: room.locked,
      endedAt: room.endedAt,
      expiresAt: room.expiresAt,
      allowGuests: room.allowGuests,
      participantLimit: room.participantLimit,
    },
    activeCount,
    isGuest: input.userId === null,
    returning: existing ? { blocked: existing.blocked } : null,
    now,
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };

  if (existing) {
    const refreshed = await prisma.roomParticipant.update({
      where: { id: existing.id },
      data: { leftAt: null, lastSeenAt: now },
    });
    return { ok: true, seat: seatFor(room, refreshed) };
  }

  const nameSource = input.userId
    ? await resolveMemberName(input.userId)
    : (input.guestName ?? "");
  const named = validateDisplayName(nameSource);
  if (!named.ok) return { ok: false, reason: "bad_name" };

  const participant = await prisma.roomParticipant.create({
    data: {
      roomId: room.id,
      userId: input.userId,
      guestName: input.userId ? null : named.name,
      displayName: named.name,
      colorIndex: assignColorIndex(room.participants.map((p) => p.colorIndex)),
      isHost: room.participants.length === 0,
    },
  });

  if (input.invite) {
    await prisma.roomInvite
      .update({
        where: { code: input.invite },
        data: { usesRemaining: { decrement: 1 } },
      })
      .catch(() => undefined);
  }

  return { ok: true, seat: seatFor(room, participant) };
}

/**
 * Remove rooms nobody can use any more. Called from the lobby listing, which
 * is the only page that reads across rooms — no cron process to keep alive.
 */
export async function sweepStaleRooms(now: Date = new Date()): Promise<number> {
  const candidates = await prisma.multiplayerRoom.findMany({
    select: { id: true, expiresAt: true, endedAt: true },
  });
  const doomed = candidates.filter((room) => isSweepable(room, now)).map((r) => r.id);
  if (doomed.length === 0) return 0;
  const result = await prisma.multiplayerRoom.deleteMany({
    where: { id: { in: doomed } },
  });
  return result.count;
}

