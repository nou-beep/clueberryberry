/**
 * Pure room rules: codes, colours, join validation, host succession, expiry.
 *
 * Nothing here touches the database or the socket, so every rule the room
 * depends on can be tested without a server running.
 */

/** No I, L, O, 0 or 1: a code is read aloud and typed by hand. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.floor(random() * ROOM_CODE_ALPHABET.length);
    // A random() of exactly 1 would index past the end.
    code += ROOM_CODE_ALPHABET[Math.min(index, ROOM_CODE_ALPHABET.length - 1)];
  }
  return code;
}

/** Accepts the canonical uppercase form only; normalize before checking. */
export function isRoomCode(value: string): boolean {
  if (value.length !== ROOM_CODE_LENGTH) return false;
  return Array.from(value).every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}

/** Typed lowercase, or with stray spaces, is still a valid attempt. */
export function normalizeRoomCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Cursor colours, in assignment order. Chosen from the palette accents so a
 * marker reads clearly against the white grid; every marker also carries the
 * participant's initial, so colour is never the only signal.
 */
export const PARTICIPANT_COLORS = [
  "#C62E68", // pink-deep
  "#2F7FB8", // sky, darkened for contrast on white
  "#2E8B62", // mint, darkened
  "#7A5AD1", // lavender, darkened
  "#B4630F", // orange, darkened
  "#8A6E2F", // sage-brown
  "#B23A2E", // coral, darkened
  "#4A6B2F", // olive
] as const;

export function participantColor(colorIndex: number): string {
  const list = PARTICIPANT_COLORS;
  return list[((colorIndex % list.length) + list.length) % list.length];
}

/** Lowest colour not already in use, so a small room never repeats a colour. */
export function assignColorIndex(taken: readonly number[]): number {
  const used = new Set(taken.map((n) => ((n % PARTICIPANT_COLORS.length) + PARTICIPANT_COLORS.length) % PARTICIPANT_COLORS.length));
  for (let i = 0; i < PARTICIPANT_COLORS.length; i++) {
    if (!used.has(i)) return i;
  }
  return taken.length % PARTICIPANT_COLORS.length;
}

export const ROOM_VISIBILITIES = ["public", "private", "invite"] as const;
export type RoomVisibility = (typeof ROOM_VISIBILITIES)[number];

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 12;
export const DEFAULT_PARTICIPANTS = 6;

/** How long a fresh room lives before the sweep may remove it. */
export const ROOM_LIFETIME_HOURS = 12;
/** How long an ended room lingers so late arrivals get "this room ended". */
export const ENDED_ROOM_GRACE_MS = 30 * 60 * 1000;

export function computeExpiry(now: Date, hours: number = ROOM_LIFETIME_HOURS): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** A room the sweep may delete: expired, or ended long enough ago. */
export function isSweepable(
  room: { expiresAt: Date; endedAt: Date | null },
  now: Date
): boolean {
  if (isExpired(room.expiresAt, now)) return true;
  if (!room.endedAt) return false;
  return now.getTime() - room.endedAt.getTime() > ENDED_ROOM_GRACE_MS;
}

export interface JoinableRoom {
  locked: boolean;
  endedAt: Date | null;
  expiresAt: Date;
  allowGuests: boolean;
  participantLimit: number;
}

export type JoinRejection =
  | "ended"
  | "expired"
  | "locked"
  | "full"
  | "guests_disabled"
  | "blocked";

export type JoinDecision = { ok: true } | { ok: false; reason: JoinRejection };

export interface JoinRequest {
  room: JoinableRoom;
  /** Active seats currently held, excluding the returning participant. */
  activeCount: number;
  isGuest: boolean;
  /** Set when this person already holds a seat and is coming back. */
  returning?: { blocked: boolean } | null;
  now: Date;
}

/**
 * Whether someone may take a seat. A returning participant is exempt from the
 * lock and the participant limit — locking a room must not evict the people
 * already in it when their connection drops.
 */
export function validateJoin({
  room,
  activeCount,
  isGuest,
  returning,
  now,
}: JoinRequest): JoinDecision {
  if (room.endedAt) return { ok: false, reason: "ended" };
  if (isExpired(room.expiresAt, now)) return { ok: false, reason: "expired" };
  if (returning) {
    return returning.blocked ? { ok: false, reason: "blocked" } : { ok: true };
  }
  if (isGuest && !room.allowGuests) return { ok: false, reason: "guests_disabled" };
  if (room.locked) return { ok: false, reason: "locked" };
  if (activeCount >= room.participantLimit) return { ok: false, reason: "full" };
  return { ok: true };
}

export interface HostCandidate {
  id: string;
  isHost: boolean;
  blocked: boolean;
  leftAt: Date | null;
  joinedAt: Date;
}

/** Only the current host may hand the room over, and only to an active seat. */
export function canTransferHost(
  actorId: string,
  target: HostCandidate | undefined,
  participants: readonly HostCandidate[]
): boolean {
  const actor = participants.find((p) => p.id === actorId);
  if (!actor?.isHost) return false;
  if (!target || target.id === actorId) return false;
  if (target.blocked || target.leftAt !== null) return false;
  return participants.some((p) => p.id === target.id);
}

/**
 * Who inherits the room when the host leaves: the longest-present active
 * participant. Null means nobody is left and the room can be closed.
 */
export function nextHostAfterLeave(
  leavingId: string,
  participants: readonly HostCandidate[]
): string | null {
  const eligible = participants
    .filter((p) => p.id !== leavingId && !p.blocked && p.leftAt === null)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  return eligible[0]?.id ?? null;
}

export const MIN_DISPLAY_NAME = 2;
export const MAX_DISPLAY_NAME = 24;

export function validateDisplayName(
  raw: string
): { ok: true; name: string } | { ok: false; reason: "too_short" | "too_long" } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (Array.from(name).length < MIN_DISPLAY_NAME) return { ok: false, reason: "too_short" };
  if (Array.from(name).length > MAX_DISPLAY_NAME) return { ok: false, reason: "too_long" };
  return { ok: true, name };
}

/** Two people called "Sam" need telling apart without showing raw ids. */
export function disambiguateNames<T extends { id: string; displayName: string }>(
  participants: readonly T[]
): Map<string, string> {
  const counts = new Map<string, number>();
  for (const p of participants) {
    const key = p.displayName.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const p of participants) {
    const key = p.displayName.toLowerCase();
    if ((counts.get(key) ?? 0) < 2) {
      out.set(p.id, p.displayName);
      continue;
    }
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    out.set(p.id, `${p.displayName} ${n}`);
  }
  return out;
}
