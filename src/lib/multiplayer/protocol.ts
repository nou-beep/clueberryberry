/**
 * The room wire protocol. One Zod schema per direction, shared by the browser
 * and `server/realtime.ts`, so a message that type-checks on one side is
 * validated the same way on the other. Every inbound frame on the server is
 * parsed through `clientMessageSchema` before it is trusted.
 */

import { z } from "zod";
import { MAX_CHAT_LENGTH, MAX_REPORT_REASON, REACTION_EMOJI } from "./chat";

export const PROTOCOL_VERSION = 1;

const cellFlagSchema = z.enum(["revealed", "checked-wrong", "confirmed"]);

export const cellEditSchema = z.object({
  row: z.number().int().min(0).max(64),
  column: z.number().int().min(0).max(64),
  letter: z.string().max(4),
  flags: z.array(cellFlagSchema).max(3),
});

export const appliedCellEditSchema = cellEditSchema.extend({
  revision: z.number().int().min(0),
  by: z.string().nullable(),
});

const directionSchema = z.enum(["across", "down"]);

/** What a grid-changing action was, so the room can narrate it. */
export const gridEventSchema = z.enum(["type", "check", "reveal", "reset"]);
export type GridEvent = z.infer<typeof gridEventSchema>;

export const HOST_ACTIONS = [
  "remove",
  "mute-participant",
  "unmute-participant",
  "mute-room",
  "unmute-room",
  "lock",
  "unlock",
  "transfer",
  "reset",
  "end",
] as const;
export const hostActionSchema = z.enum(HOST_ACTIONS);
export type HostAction = z.infer<typeof hostActionSchema>;

/* ── client → server ─────────────────────────────────────────────────── */

export const clientMessageSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("ping") }),
  z.object({
    t: z.literal("cursor"),
    row: z.number().int().min(0).max(64),
    column: z.number().int().min(0).max(64),
    direction: directionSchema,
    clue: z.string().max(120).nullable(),
  }),
  z.object({
    t: z.literal("edit"),
    edits: z.array(cellEditSchema).min(1).max(400),
    event: gridEventSchema,
  }),
  z.object({
    /** A reveal that needs the host's blessing before it lands. */
    t: z.literal("reveal-request"),
    edits: z.array(cellEditSchema).min(1).max(400),
    scope: z.enum(["square", "word", "puzzle"]),
  }),
  z.object({
    t: z.literal("reveal-decide"),
    requestId: z.string().min(1).max(64),
    approve: z.boolean(),
  }),
  z.object({ t: z.literal("chat"), body: z.string().min(1).max(MAX_CHAT_LENGTH * 2) }),
  z.object({ t: z.literal("typing"), active: z.boolean() }),
  z.object({
    t: z.literal("react"),
    messageId: z.string().min(1).max(64),
    emoji: z.enum(REACTION_EMOJI),
  }),
  z.object({
    t: z.literal("report"),
    targetId: z.string().min(1).max(64),
    reason: z.string().max(MAX_REPORT_REASON),
  }),
  z.object({
    t: z.literal("host"),
    action: hostActionSchema,
    targetId: z.string().min(1).max(64).optional(),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

/* ── server → client ─────────────────────────────────────────────────── */

export interface RoomSettingsWire {
  code: string;
  puzzleId: string;
  visibility: "public" | "private" | "invite";
  participantLimit: number;
  chatEnabled: boolean;
  allowGuests: boolean;
  hintsNeedApproval: boolean;
  locked: boolean;
  ended: boolean;
  expiresAt: string;
}

export interface ParticipantWire {
  id: string;
  displayName: string;
  colorIndex: number;
  isHost: boolean;
  isGuest: boolean;
  /** Host-set chat mute. */
  muted: boolean;
  online: boolean;
  lastSeenAt: string;
  cursor: { row: number; column: number; direction: "across" | "down"; clue: string | null } | null;
}

export interface ChatMessageWire {
  id: string;
  participantId: string | null;
  /** Denormalized: a participant who left still needs a name on their line. */
  authorName: string | null;
  colorIndex: number | null;
  body: string;
  kind: "chat" | "system";
  /** System lines carry a translation key plus values instead of prose. */
  systemKey?: string;
  systemValues?: Record<string, string>;
  createdAt: string;
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
}

export interface RevealRequestWire {
  id: string;
  participantId: string;
  requesterName: string;
  scope: "square" | "word" | "puzzle";
  cellCount: number;
}

export type ServerMessage =
  | { t: "pong" }
  | {
      t: "snapshot";
      protocol: number;
      you: string;
      room: RoomSettingsWire;
      participants: ParticipantWire[];
      revision: number;
      cells: Array<{
        row: number;
        column: number;
        letter: string;
        flags: Array<"revealed" | "checked-wrong" | "confirmed">;
        revision: number;
        by: string | null;
      }>;
      messages: ChatMessageWire[];
      revealRequests: RevealRequestWire[];
      completed: boolean;
    }
  | {
      t: "patch";
      revision: number;
      cells: Array<{
        row: number;
        column: number;
        letter: string;
        flags: Array<"revealed" | "checked-wrong" | "confirmed">;
        revision: number;
        by: string | null;
      }>;
      event: GridEvent;
      by: string | null;
      completed: boolean;
    }
  | { t: "presence"; participants: ParticipantWire[] }
  | { t: "room"; room: RoomSettingsWire }
  | { t: "chat"; message: ChatMessageWire }
  | { t: "typing"; participantId: string; active: boolean }
  | { t: "reactions"; messageId: string; reactions: ChatMessageWire["reactions"] }
  | { t: "reveal-request"; request: RevealRequestWire }
  | { t: "reveal-resolved"; requestId: string; approved: boolean }
  | { t: "report"; reporterName: string; targetName: string; reason: string }
  | { t: "closed"; reason: "removed" | "ended" | "expired" | "replaced" }
  | { t: "error"; code: string };

/** Narrowing helper: the server never sends anything but `ServerMessage`. */
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    if (!("t" in value) || typeof (value as { t: unknown }).t !== "string") return null;
    return value as ServerMessage;
  } catch {
    return null;
  }
}
