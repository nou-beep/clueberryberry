/**
 * Clueberry realtime server.
 *
 * A standalone `ws` process (see docs/product-audit.md §4). It owns nothing
 * permanent: every room's grid, participants and chat live in the database
 * through Prisma, and this process is a cache plus a fan-out. Restarting it
 * loses no room — clients reconnect and receive a snapshot rebuilt from the
 * tables.
 *
 *   npm run dev:realtime        # listens on REALTIME_PORT (default 3106)
 *
 * Authentication: the Next REST route `/api/rooms/[code]/join` hands the
 * browser an HMAC-signed seat token; this process verifies it with the same
 * AUTH_SECRET. No cookie parsing, no shared session store.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import {
  applyEdits,
  emptyCellRecords,
  recordsFromAttempt,
  recordsToAttempt,
  type CellEdit,
  type CellRecordGrid,
} from "@/lib/multiplayer/merge";
import {
  clientMessageSchema,
  PROTOCOL_VERSION,
  type ChatMessageWire,
  type GridEvent,
  type ParticipantWire,
  type RevealRequestWire,
  type RoomSettingsWire,
  type ServerMessage,
} from "@/lib/multiplayer/protocol";
import {
  CHAT_HISTORY_LIMIT,
  chatRateCheck,
  isReactionEmoji,
  MAX_REPORT_REASON,
  validateChatBody,
} from "@/lib/multiplayer/chat";
import {
  isExpired,
  nextHostAfterLeave,
  type HostCandidate,
} from "@/lib/multiplayer/room";
import { verifyParticipantToken } from "@/lib/multiplayer/token";
import { summarizeAttempt } from "@/lib/crossword/attempt";
import type {
  AttemptGridState,
  Direction,
  EntryDef,
  Grid,
  NormalizationRules,
  PuzzleLanguage,
} from "@/lib/crossword/types";

/* ── environment ─────────────────────────────────────────────────────── */

/**
 * This process is not started by Next, so nothing has loaded `.env` for it.
 * A tiny reader keeps the repo free of another dependency.
 */
function loadEnvFile(file: string): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const PORT = Number(process.env.REALTIME_PORT ?? 3106);

const prisma = new PrismaClient();

/* ── runtime state ───────────────────────────────────────────────────── */

interface Cursor {
  row: number;
  column: number;
  direction: Direction;
  clue: string | null;
}

interface ParticipantState {
  id: string;
  displayName: string;
  colorIndex: number;
  isHost: boolean;
  isGuest: boolean;
  muted: boolean;
  blocked: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  leftAt: Date | null;
}

interface PendingReveal {
  id: string;
  participantId: string;
  requesterName: string;
  scope: "square" | "word" | "puzzle";
  edits: CellEdit[];
}

interface PuzzleRuntime {
  grid: Grid;
  entries: EntryDef[];
  language: PuzzleLanguage;
  normalization: Partial<NormalizationRules> | undefined;
  width: number;
  height: number;
}

interface RoomRuntime {
  id: string;
  code: string;
  puzzleId: string;
  puzzle: PuzzleRuntime;
  visibility: "public" | "private" | "invite";
  participantLimit: number;
  chatEnabled: boolean;
  allowGuests: boolean;
  hintsNeedApproval: boolean;
  locked: boolean;
  ended: boolean;
  expiresAt: Date;
  records: CellRecordGrid;
  revision: number;
  completed: boolean;
  participants: Map<string, ParticipantState>;
  sockets: Map<string, WebSocket>;
  cursors: Map<string, Cursor>;
  chatTimestamps: Map<string, number[]>;
  leaveTimers: Map<string, NodeJS.Timeout>;
  revealRequests: Map<string, PendingReveal>;
  saveTimer: NodeJS.Timeout | null;
  evictTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, RoomRuntime>();
/** Rooms being loaded, so two simultaneous connections load once. */
const loading = new Map<string, Promise<RoomRuntime | null>>();

const SAVE_DEBOUNCE_MS = 1_200;
/** How long a dropped participant stays "here" before the room says they left. */
const LEAVE_GRACE_MS = 8_000;
/** Drop an empty room from memory (state is already in the database). */
const EVICT_AFTER_MS = 60_000;
const HEARTBEAT_MS = 25_000;

/* ── loading ─────────────────────────────────────────────────────────── */

function parseNormalization(raw: string | null): Partial<NormalizationRules> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Partial<NormalizationRules>;
  } catch {
    return undefined;
  }
}

async function loadRoom(roomId: string): Promise<RoomRuntime | null> {
  const cached = rooms.get(roomId);
  if (cached) return cached;
  const inFlight = loading.get(roomId);
  if (inFlight) return inFlight;

  const promise = (async (): Promise<RoomRuntime | null> => {
    const row = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        state: true,
        puzzle: { include: { entries: true } },
      },
    });
    if (!row) return null;

    const grid = JSON.parse(row.puzzle.gridData) as Grid;
    const puzzle: PuzzleRuntime = {
      grid,
      entries: row.puzzle.entries
        .sort((a, b) => a.number - b.number)
        .map((e) => ({
          number: e.number,
          direction: e.direction as Direction,
          row: e.row,
          column: e.column,
          answer: e.answer,
          clue: e.clue,
          clueStyle: e.clueStyle as EntryDef["clueStyle"],
          acceptedAlternatives: JSON.parse(e.acceptedAlternatives) as string[],
        })),
      language: row.puzzle.language as PuzzleLanguage,
      normalization: parseNormalization(row.puzzle.normalization),
      width: row.puzzle.gridWidth,
      height: row.puzzle.gridHeight,
    };

    let records = emptyCellRecords(puzzle.width, puzzle.height);
    if (row.state) {
      try {
        const restored = recordsFromAttempt(
          JSON.parse(row.state.gridState) as AttemptGridState
        );
        // A blob that does not match the puzzle is discarded, never rendered.
        if (
          restored.length === puzzle.height &&
          restored.every((r) => r.length === puzzle.width)
        ) {
          records = restored;
        }
      } catch {
        /* Unreadable state: start the room from an empty grid rather than crash. */
      }
    }

    const runtime: RoomRuntime = {
      id: row.id,
      code: row.code,
      puzzleId: row.puzzleId,
      puzzle,
      visibility: row.visibility as RoomRuntime["visibility"],
      participantLimit: row.participantLimit,
      chatEnabled: row.chatEnabled,
      allowGuests: row.allowGuests,
      hintsNeedApproval: row.hintsNeedApproval,
      locked: row.locked,
      ended: row.endedAt !== null,
      expiresAt: row.expiresAt,
      records,
      revision: row.state?.revision ?? 0,
      completed: row.state?.completedAt != null,
      participants: new Map(
        row.participants.map((p) => [
          p.id,
          {
            id: p.id,
            displayName: p.displayName,
            colorIndex: p.colorIndex,
            isHost: p.isHost,
            isGuest: p.userId === null,
            muted: p.muted,
            blocked: p.blocked,
            joinedAt: p.joinedAt,
            lastSeenAt: p.lastSeenAt,
            leftAt: p.leftAt,
          },
        ])
      ),
      sockets: new Map(),
      cursors: new Map(),
      chatTimestamps: new Map(),
      leaveTimers: new Map(),
      revealRequests: new Map(),
      saveTimer: null,
      evictTimer: null,
    };
    rooms.set(row.id, runtime);
    return runtime;
  })().finally(() => loading.delete(roomId));

  loading.set(roomId, promise);
  return promise;
}

/* ── wire helpers ────────────────────────────────────────────────────── */

function settingsWire(room: RoomRuntime): RoomSettingsWire {
  return {
    code: room.code,
    puzzleId: room.puzzleId,
    visibility: room.visibility,
    participantLimit: room.participantLimit,
    chatEnabled: room.chatEnabled,
    allowGuests: room.allowGuests,
    hintsNeedApproval: room.hintsNeedApproval,
    locked: room.locked,
    ended: room.ended,
    expiresAt: room.expiresAt.toISOString(),
  };
}

function participantsWire(room: RoomRuntime): ParticipantWire[] {
  return [...room.participants.values()]
    .filter((p) => !p.blocked)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      colorIndex: p.colorIndex,
      isHost: p.isHost,
      isGuest: p.isGuest,
      muted: p.muted,
      online: room.sockets.has(p.id),
      lastSeenAt: p.lastSeenAt.toISOString(),
      cursor: room.cursors.get(p.id) ?? null,
    }));
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(
  room: RoomRuntime,
  message: ServerMessage,
  options: { except?: string } = {}
): void {
  for (const [id, socket] of room.sockets) {
    if (options.except === id) continue;
    send(socket, message);
  }
}

function broadcastPresence(room: RoomRuntime): void {
  broadcast(room, { t: "presence", participants: participantsWire(room) });
}

function hostCandidates(room: RoomRuntime): HostCandidate[] {
  return [...room.participants.values()].map((p) => ({
    id: p.id,
    isHost: p.isHost,
    blocked: p.blocked,
    leftAt: p.leftAt,
    joinedAt: p.joinedAt,
  }));
}

/* ── persistence ─────────────────────────────────────────────────────── */

function scheduleSave(room: RoomRuntime): void {
  if (room.saveTimer) return;
  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    void saveGrid(room);
  }, SAVE_DEBOUNCE_MS);
}

async function saveGrid(room: RoomRuntime): Promise<void> {
  const gridState = JSON.stringify(recordsToAttempt(room.records));
  const completedAt = room.completed ? new Date() : null;
  try {
    await prisma.roomPuzzleState.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        gridState,
        revision: room.revision,
        completedAt,
      },
      update: { gridState, revision: room.revision, completedAt },
    });
  } catch (error) {
    console.error("[realtime] failed to persist room state", room.code, error);
  }
}

/* ── chat persistence ────────────────────────────────────────────────── */

interface SystemBody {
  key: string;
  values?: Record<string, string>;
}

/** Reactions ride in the message table as their own kind, folded in on read. */
interface ReactionBody {
  m: string;
  e: string;
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadHistory(
  room: RoomRuntime,
  viewerId: string
): Promise<ChatMessageWire[]> {
  const rows = await prisma.roomMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: CHAT_HISTORY_LIMIT * 3,
  });
  rows.reverse();

  const reactions = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    if (row.kind !== "reaction") continue;
    const body = safeParse<ReactionBody>(row.body);
    if (!body || !row.participantId) continue;
    const forMessage = reactions.get(body.m) ?? new Map<string, Set<string>>();
    const reactors = forMessage.get(body.e) ?? new Set<string>();
    reactors.add(row.participantId);
    forMessage.set(body.e, reactors);
    reactions.set(body.m, forMessage);
  }

  const visible = rows
    .filter((row) => row.kind === "chat" || row.kind === "system")
    .slice(-CHAT_HISTORY_LIMIT);

  return visible.map((row) => toChatWire(room, row, reactions.get(row.id), viewerId));
}

function toChatWire(
  room: RoomRuntime,
  row: { id: string; participantId: string | null; body: string; kind: string; createdAt: Date },
  reactions: Map<string, Set<string>> | undefined,
  viewerId: string
): ChatMessageWire {
  const author = row.participantId ? room.participants.get(row.participantId) : undefined;
  const system = row.kind === "system" ? safeParse<SystemBody>(row.body) : null;
  return {
    id: row.id,
    participantId: row.participantId,
    authorName: author?.displayName ?? null,
    colorIndex: author?.colorIndex ?? null,
    body: system ? "" : row.body,
    kind: row.kind === "system" ? "system" : "chat",
    ...(system ? { systemKey: system.key, systemValues: system.values } : {}),
    createdAt: row.createdAt.toISOString(),
    reactions: [...(reactions?.entries() ?? [])].map(([emoji, who]) => ({
      emoji,
      count: who.size,
      mine: who.has(viewerId),
    })),
  };
}

async function postSystem(
  room: RoomRuntime,
  key: string,
  values?: Record<string, string>
): Promise<void> {
  try {
    const row = await prisma.roomMessage.create({
      data: { roomId: room.id, kind: "system", body: JSON.stringify({ key, values }) },
    });
    broadcast(room, {
      t: "chat",
      message: {
        id: row.id,
        participantId: null,
        authorName: null,
        colorIndex: null,
        body: "",
        kind: "system",
        systemKey: key,
        systemValues: values,
        createdAt: row.createdAt.toISOString(),
        reactions: [],
      },
    });
  } catch (error) {
    console.error("[realtime] failed to record system message", error);
  }
}

/* ── grid mutation ───────────────────────────────────────────────────── */

function isSolved(room: RoomRuntime): boolean {
  return summarizeAttempt(
    recordsToAttempt(room.records),
    room.puzzle.grid,
    room.puzzle.entries,
    room.puzzle.language,
    room.puzzle.normalization
  ).solved;
}

/** Edits landing outside the grid, or on a block, are dropped, not trusted. */
function sanitizeEdits(room: RoomRuntime, edits: readonly CellEdit[]): CellEdit[] {
  return edits.filter(
    (e) =>
      e.row < room.puzzle.height &&
      e.column < room.puzzle.width &&
      room.puzzle.grid[e.row]?.[e.column] !== null &&
      room.puzzle.grid[e.row]?.[e.column] !== undefined
  );
}

function commitEdits(
  room: RoomRuntime,
  edits: readonly CellEdit[],
  by: string | null,
  event: GridEvent
): void {
  const clean = sanitizeEdits(room, edits);
  if (clean.length === 0) return;

  room.revision += 1;
  const { records, applied } = applyEdits(room.records, clean, room.revision, by);
  room.records = records;

  const wasCompleted = room.completed;
  room.completed = isSolved(room);

  broadcast(room, {
    t: "patch",
    revision: room.revision,
    cells: applied,
    event,
    by,
    completed: room.completed,
  });
  scheduleSave(room);

  if (room.completed && !wasCompleted) {
    void postSystem(room, "completed");
  }
}

/* ── connection lifecycle ────────────────────────────────────────────── */

interface Attached {
  room: RoomRuntime;
  participantId: string;
}

const attached = new WeakMap<WebSocket, Attached>();
const alive = new WeakSet<WebSocket>();

async function handleConnection(socket: WebSocket, url: URL): Promise<void> {
  const token = url.searchParams.get("token");
  const claim = token ? verifyParticipantToken(token) : null;
  if (!claim) {
    send(socket, { t: "error", code: "unauthorized" });
    socket.close();
    return;
  }

  const room = await loadRoom(claim.roomId);
  if (!room) {
    send(socket, { t: "error", code: "room_not_found" });
    socket.close();
    return;
  }
  if (room.ended) {
    send(socket, { t: "closed", reason: "ended" });
    socket.close();
    return;
  }
  if (isExpired(room.expiresAt, new Date())) {
    send(socket, { t: "closed", reason: "expired" });
    socket.close();
    return;
  }

  const participant = room.participants.get(claim.participantId);
  if (!participant || participant.blocked) {
    send(socket, { t: "error", code: "no_seat" });
    socket.close();
    return;
  }

  // One socket per seat: a second tab takes over rather than doubling presence.
  const existing = room.sockets.get(participant.id);
  if (existing && existing !== socket) {
    send(existing, { t: "closed", reason: "replaced" });
    attached.delete(existing);
    existing.close();
  }

  // A refresh reconnects inside the leave grace period; that is not an arrival.
  const wasAway = !existing && !room.leaveTimers.has(participant.id);
  room.sockets.set(participant.id, socket);
  attached.set(socket, { room, participantId: participant.id });
  alive.add(socket);

  if (room.evictTimer) {
    clearTimeout(room.evictTimer);
    room.evictTimer = null;
  }
  const leaveTimer = room.leaveTimers.get(participant.id);
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    room.leaveTimers.delete(participant.id);
  }

  participant.leftAt = null;
  participant.lastSeenAt = new Date();
  await prisma.roomParticipant
    .update({
      where: { id: participant.id },
      data: { leftAt: null, lastSeenAt: participant.lastSeenAt },
    })
    .catch(() => undefined);

  const cells = room.records.flatMap((row, r) =>
    row.map((cell, c) => ({
      row: r,
      column: c,
      letter: cell.letter,
      flags: cell.flags,
      revision: cell.revision,
      by: cell.by,
    }))
  );

  send(socket, {
    t: "snapshot",
    protocol: PROTOCOL_VERSION,
    you: participant.id,
    room: settingsWire(room),
    participants: participantsWire(room),
    revision: room.revision,
    cells: cells.filter((c) => c.letter !== "" || c.flags.length > 0),
    messages: await loadHistory(room, participant.id),
    revealRequests: [...room.revealRequests.values()].map(toRevealWire),
    completed: room.completed,
  });

  broadcastPresence(room);
  if (wasAway) void postSystem(room, "joined", { name: participant.displayName });
}

function toRevealWire(request: PendingReveal): RevealRequestWire {
  return {
    id: request.id,
    participantId: request.participantId,
    requesterName: request.requesterName,
    scope: request.scope,
    cellCount: request.edits.length,
  };
}

function detach(socket: WebSocket): void {
  const link = attached.get(socket);
  if (!link) return;
  attached.delete(socket);
  const { room, participantId } = link;
  if (room.sockets.get(participantId) !== socket) return;

  room.sockets.delete(participantId);
  room.cursors.delete(participantId);
  const participant = room.participants.get(participantId);
  if (participant) {
    participant.lastSeenAt = new Date();
    void prisma.roomParticipant
      .update({ where: { id: participantId }, data: { lastSeenAt: participant.lastSeenAt } })
      .catch(() => undefined);
  }
  broadcastPresence(room);

  // A refresh looks exactly like a disconnect; wait before announcing a leave.
  const timer = setTimeout(() => {
    room.leaveTimers.delete(participantId);
    if (room.sockets.has(participantId)) return;
    const person = room.participants.get(participantId);
    if (!person) return;
    person.leftAt = new Date();
    void prisma.roomParticipant
      .update({ where: { id: participantId }, data: { leftAt: person.leftAt } })
      .catch(() => undefined);
    void postSystem(room, "left", { name: person.displayName });

    if (person.isHost) {
      const heir = nextHostAfterLeave(participantId, hostCandidates(room));
      if (heir) void promoteHost(room, participantId, heir);
    }
    broadcastPresence(room);
    scheduleEvict(room);
  }, LEAVE_GRACE_MS);
  room.leaveTimers.set(participantId, timer);
}

function scheduleEvict(room: RoomRuntime): void {
  if (room.sockets.size > 0 || room.evictTimer) return;
  room.evictTimer = setTimeout(() => {
    room.evictTimer = null;
    if (room.sockets.size > 0) return;
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }
    void saveGrid(room).then(() => {
      if (room.sockets.size === 0) rooms.delete(room.id);
    });
  }, EVICT_AFTER_MS);
}

async function promoteHost(
  room: RoomRuntime,
  fromId: string,
  toId: string
): Promise<void> {
  const from = room.participants.get(fromId);
  const to = room.participants.get(toId);
  if (!to) return;
  if (from) from.isHost = false;
  to.isHost = true;
  await prisma.$transaction([
    prisma.roomParticipant.update({ where: { id: fromId }, data: { isHost: false } }),
    prisma.roomParticipant.update({ where: { id: toId }, data: { isHost: true } }),
  ]).catch(() => undefined);
  await postSystem(room, "hostTransferred", { name: to.displayName });
  broadcastPresence(room);
}

/* ── message handling ────────────────────────────────────────────────── */

async function handleMessage(socket: WebSocket, raw: string): Promise<void> {
  const link = attached.get(socket);
  if (!link) return;
  const { room, participantId } = link;
  const me = room.participants.get(participantId);
  if (!me || me.blocked) return;

  const parsed = clientMessageSchema.safeParse(safeParse<unknown>(raw));
  if (!parsed.success) {
    send(socket, { t: "error", code: "bad_message" });
    return;
  }
  const message = parsed.data;
  me.lastSeenAt = new Date();

  switch (message.t) {
    case "ping":
      send(socket, { t: "pong" });
      return;

    case "cursor": {
      room.cursors.set(participantId, {
        row: message.row,
        column: message.column,
        direction: message.direction,
        clue: message.clue,
      });
      broadcastPresence(room);
      return;
    }

    case "edit": {
      if (room.ended) return;
      commitEdits(room, message.edits, participantId, message.event);
      if (message.event === "reveal") {
        await postSystem(room, "revealed", { name: me.displayName });
      } else if (message.event === "check") {
        await postSystem(room, "checked", { name: me.displayName });
      }
      return;
    }

    case "reveal-request": {
      if (room.ended) return;
      if (!room.hintsNeedApproval || me.isHost) {
        commitEdits(room, message.edits, participantId, "reveal");
        await postSystem(room, "revealed", { name: me.displayName });
        return;
      }
      const request: PendingReveal = {
        id: randomUUID(),
        participantId,
        requesterName: me.displayName,
        scope: message.scope,
        edits: sanitizeEdits(room, message.edits),
      };
      if (request.edits.length === 0) return;
      room.revealRequests.set(request.id, request);
      broadcast(room, { t: "reveal-request", request: toRevealWire(request) });
      return;
    }

    case "reveal-decide": {
      if (!me.isHost) {
        send(socket, { t: "error", code: "not_host" });
        return;
      }
      const request = room.revealRequests.get(message.requestId);
      if (!request) return;
      room.revealRequests.delete(request.id);
      broadcast(room, {
        t: "reveal-resolved",
        requestId: request.id,
        approved: message.approve,
      });
      if (message.approve) {
        commitEdits(room, request.edits, request.participantId, "reveal");
        await postSystem(room, "revealed", { name: request.requesterName });
      }
      return;
    }

    case "chat": {
      if (!room.chatEnabled) {
        send(socket, { t: "error", code: "chat_disabled" });
        return;
      }
      if (me.muted) {
        send(socket, { t: "error", code: "muted" });
        return;
      }
      const valid = validateChatBody(message.body);
      if (!valid.ok) {
        send(socket, { t: "error", code: `chat_${valid.reason}` });
        return;
      }
      const decision = chatRateCheck(
        room.chatTimestamps.get(participantId) ?? [],
        Date.now()
      );
      room.chatTimestamps.set(participantId, decision.next);
      if (!decision.allowed) {
        send(socket, { t: "error", code: "rate_limited" });
        return;
      }
      const row = await prisma.roomMessage.create({
        data: { roomId: room.id, participantId, body: valid.body, kind: "chat" },
      });
      broadcast(room, {
        t: "chat",
        message: {
          id: row.id,
          participantId,
          authorName: me.displayName,
          colorIndex: me.colorIndex,
          body: valid.body,
          kind: "chat",
          createdAt: row.createdAt.toISOString(),
          reactions: [],
        },
      });
      return;
    }

    case "typing": {
      if (!room.chatEnabled || me.muted) return;
      broadcast(room, { t: "typing", participantId, active: message.active }, { except: participantId });
      return;
    }

    case "react": {
      if (!room.chatEnabled || !isReactionEmoji(message.emoji)) return;
      const existing = await prisma.roomMessage.findFirst({
        where: {
          roomId: room.id,
          participantId,
          kind: "reaction",
          body: JSON.stringify({ m: message.messageId, e: message.emoji }),
        },
      });
      if (existing) {
        await prisma.roomMessage.delete({ where: { id: existing.id } });
      } else {
        await prisma.roomMessage.create({
          data: {
            roomId: room.id,
            participantId,
            kind: "reaction",
            body: JSON.stringify({ m: message.messageId, e: message.emoji }),
          },
        });
      }
      await broadcastReactions(room, message.messageId);
      return;
    }

    case "report": {
      const target = room.participants.get(message.targetId);
      if (!target) return;
      await prisma.roomMessage.create({
        data: {
          roomId: room.id,
          participantId,
          kind: "report",
          body: JSON.stringify({
            target: target.id,
            reason: message.reason.slice(0, MAX_REPORT_REASON),
          }),
        },
      });
      for (const [id, hostSocket] of room.sockets) {
        if (!room.participants.get(id)?.isHost) continue;
        send(hostSocket, {
          t: "report",
          reporterName: me.displayName,
          targetName: target.displayName,
          reason: message.reason.slice(0, MAX_REPORT_REASON),
        });
      }
      return;
    }

    case "host":
      await handleHostAction(room, me, message.action, message.targetId);
      return;
  }
}

async function broadcastReactions(room: RoomRuntime, messageId: string): Promise<void> {
  const rows = await prisma.roomMessage.findMany({
    where: { roomId: room.id, kind: "reaction" },
    select: { participantId: true, body: true },
  });
  const byEmoji = new Map<string, Set<string>>();
  for (const row of rows) {
    const body = safeParse<ReactionBody>(row.body);
    if (!body || body.m !== messageId || !row.participantId) continue;
    const set = byEmoji.get(body.e) ?? new Set<string>();
    set.add(row.participantId);
    byEmoji.set(body.e, set);
  }
  // Each viewer needs their own `mine` flag, so this fans out per socket.
  for (const [id, socket] of room.sockets) {
    send(socket, {
      t: "reactions",
      messageId,
      reactions: [...byEmoji.entries()].map(([emoji, who]) => ({
        emoji,
        count: who.size,
        mine: who.has(id),
      })),
    });
  }
}

async function handleHostAction(
  room: RoomRuntime,
  me: ParticipantState,
  action: string,
  targetId?: string
): Promise<void> {
  const socket = room.sockets.get(me.id);
  if (!me.isHost) {
    if (socket) send(socket, { t: "error", code: "not_host" });
    return;
  }
  const target = targetId ? room.participants.get(targetId) : undefined;

  switch (action) {
    case "remove": {
      if (!target || target.id === me.id) return;
      target.blocked = true;
      target.leftAt = new Date();
      await prisma.roomParticipant.update({
        where: { id: target.id },
        data: { blocked: true, leftAt: target.leftAt },
      });
      const victim = room.sockets.get(target.id);
      if (victim) {
        send(victim, { t: "closed", reason: "removed" });
        attached.delete(victim);
        room.sockets.delete(target.id);
        victim.close();
      }
      await postSystem(room, "removed", { name: target.displayName });
      broadcastPresence(room);
      return;
    }
    case "mute-participant":
    case "unmute-participant": {
      if (!target) return;
      target.muted = action === "mute-participant";
      await prisma.roomParticipant.update({
        where: { id: target.id },
        data: { muted: target.muted },
      });
      broadcastPresence(room);
      return;
    }
    case "mute-room":
    case "unmute-room": {
      room.chatEnabled = action === "unmute-room";
      await prisma.multiplayerRoom.update({
        where: { id: room.id },
        data: { chatEnabled: room.chatEnabled },
      });
      broadcast(room, { t: "room", room: settingsWire(room) });
      await postSystem(room, room.chatEnabled ? "chatOn" : "chatOff");
      return;
    }
    case "lock":
    case "unlock": {
      room.locked = action === "lock";
      await prisma.multiplayerRoom.update({
        where: { id: room.id },
        data: { locked: room.locked },
      });
      broadcast(room, { t: "room", room: settingsWire(room) });
      await postSystem(room, room.locked ? "locked" : "unlocked");
      return;
    }
    case "transfer": {
      if (!target || target.blocked || target.leftAt !== null || target.id === me.id) return;
      await promoteHost(room, me.id, target.id);
      return;
    }
    case "reset": {
      room.records = emptyCellRecords(room.puzzle.width, room.puzzle.height);
      room.revision += 1;
      room.completed = false;
      await saveGrid(room);
      broadcast(room, {
        t: "patch",
        revision: room.revision,
        cells: room.records.flatMap((row, r) =>
          row.map((cell, c) => ({
            row: r,
            column: c,
            letter: "",
            flags: cell.flags,
            revision: room.revision,
            by: null,
          }))
        ),
        event: "reset",
        by: me.id,
        completed: false,
      });
      await postSystem(room, "reset", { name: me.displayName });
      return;
    }
    case "end": {
      room.ended = true;
      await prisma.multiplayerRoom.update({
        where: { id: room.id },
        data: { endedAt: new Date() },
      });
      await saveGrid(room);
      broadcast(room, { t: "room", room: settingsWire(room) });
      broadcast(room, { t: "closed", reason: "ended" });
      for (const [, s] of room.sockets) {
        attached.delete(s);
        s.close();
      }
      room.sockets.clear();
      scheduleEvict(room);
      return;
    }
  }
}

/* ── server ──────────────────────────────────────────────────────────── */

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  socket.on("pong", () => alive.add(socket));
  socket.on("message", (data) => {
    void handleMessage(socket, data.toString()).catch((error) => {
      console.error("[realtime] message failed", error);
      send(socket, { t: "error", code: "server_error" });
    });
  });
  socket.on("close", () => detach(socket));
  socket.on("error", () => detach(socket));

  void handleConnection(socket, url).catch((error) => {
    console.error("[realtime] connection failed", error);
    send(socket, { t: "error", code: "server_error" });
    socket.close();
  });
});

const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!alive.has(socket)) {
      socket.terminate();
      continue;
    }
    alive.delete(socket);
    socket.ping();
  }
}, HEARTBEAT_MS);

wss.on("listening", () => {
  console.log(`[realtime] listening on ws://localhost:${PORT}`);
});

async function shutdown(): Promise<void> {
  clearInterval(heartbeat);
  for (const room of rooms.values()) {
    if (room.saveTimer) clearTimeout(room.saveTimer);
    await saveGrid(room);
  }
  await prisma.$disconnect();
  wss.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
