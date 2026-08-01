/** Chat rules. Pure, so the server and the composer agree on every limit. */

export const MAX_CHAT_LENGTH = 400;
/** Messages allowed per participant inside the window. */
export const CHAT_RATE = { max: 6, windowMs: 10_000 } as const;
/** How long a "typing" flag stays alive without a refresh. */
export const TYPING_TTL_MS = 4_000;
/** How much history a joining client receives. */
export const CHAT_HISTORY_LIMIT = 100;

export function normalizeChatBody(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type ChatRejection = "empty" | "too_long";

export function validateChatBody(
  raw: string
): { ok: true; body: string } | { ok: false; reason: ChatRejection } {
  const body = normalizeChatBody(raw);
  if (body.length === 0) return { ok: false, reason: "empty" };
  if (Array.from(body).length > MAX_CHAT_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, body };
}

export interface RateDecision {
  allowed: boolean;
  retryAfterMs: number;
  /** Timestamps to keep for the next check. */
  next: number[];
}

/**
 * Sliding-window rate check. `recent` is the participant's send timestamps;
 * the caller stores whatever comes back in `next`.
 */
export function chatRateCheck(
  recent: readonly number[],
  now: number,
  rate: { max: number; windowMs: number } = CHAT_RATE
): RateDecision {
  const live = recent.filter((t) => now - t < rate.windowMs);
  if (live.length >= rate.max) {
    const oldest = Math.min(...live);
    return {
      allowed: false,
      retryAfterMs: Math.max(0, rate.windowMs - (now - oldest)),
      next: live,
    };
  }
  return { allowed: true, retryAfterMs: 0, next: [...live, now] };
}

/** A short, deliberately boring set — reactions are punctuation, not a feature. */
export const REACTION_EMOJI = ["👍", "🎉", "😂", "🤔", "❤️"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}

export const MAX_REPORT_REASON = 300;
