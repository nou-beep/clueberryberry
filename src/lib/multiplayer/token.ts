import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Seat tokens.
 *
 * The realtime server is a separate process and cannot read an Auth.js
 * session cookie, so the REST join route hands out a short signed token
 * naming the seat. Both sides sign with `AUTH_SECRET`; nothing secret travels
 * inside the token, and a forged one cannot be produced without the key.
 *
 * Server-only: this module imports node:crypto and must never reach a client
 * bundle.
 */

const SEPARATOR = ".";
/** A seat token outlives a long solving session but not a shared laptop. */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is required to sign multiplayer seat tokens");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signParticipantToken(
  participantId: string,
  roomId: string,
  now: Date = new Date(),
  ttlMs: number = TOKEN_TTL_MS
): string {
  const payload = [participantId, roomId, String(now.getTime() + ttlMs)].join(SEPARATOR);
  return `${Buffer.from(payload).toString("base64url")}${SEPARATOR}${sign(payload)}`;
}

export interface SeatClaim {
  participantId: string;
  roomId: string;
  expiresAt: number;
}

export function verifyParticipantToken(
  token: string,
  now: Date = new Date()
): SeatClaim | null {
  const index = token.lastIndexOf(SEPARATOR);
  if (index <= 0) return null;
  const encoded = token.slice(0, index);
  const signature = token.slice(index + 1);

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const [participantId, roomId, expiresAt] = payload.split(SEPARATOR);
  if (!participantId || !roomId || !expiresAt) return null;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) return null;

  return { participantId, roomId, expiresAt: expiry };
}
