/**
 * Where the room server lives, and whether this build has one at all.
 *
 * Deliberately not a client module: the Rooms pages are server components and
 * need to answer "is multiplayer configured?" before rendering anything.
 * `useRoomSocket` re-exports both for client callers.
 */

/** Only a sensible guess when the app is being served from this machine. */
const DEFAULT_URL = "ws://localhost:3106";

export function realtimeUrl(): string {
  return process.env.NEXT_PUBLIC_REALTIME_URL || DEFAULT_URL;
}

/**
 * Whether this deployment has a room server at all.
 *
 * The realtime process is a long-lived WebSocket host, so a serverless
 * platform cannot run it and `NEXT_PUBLIC_REALTIME_URL` is simply left unset.
 * The `ws://localhost:3106` default would then point at the visitor's own
 * machine and the room view would report "unreachable" — which reads as "our
 * server is broken" when the truth is "this build has no room server". The two
 * states are told apart here, and worded differently in the interface.
 *
 * The development fallback keys off `NODE_ENV` rather than the hostname on
 * purpose: the server render and the browser must agree, or the page would
 * hydrate differently from how it was sent.
 */
export function realtimeConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) return true;
  return process.env.NODE_ENV !== "production";
}
