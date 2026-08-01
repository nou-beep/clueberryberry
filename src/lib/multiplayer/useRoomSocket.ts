"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLocalEdits,
  emptyCellRecords,
  mergePatch,
  pendingCount,
  recordsFromCells,
  type CellEdit,
  type CellRecordGrid,
} from "./merge";
import {
  parseServerMessage,
  type ChatMessageWire,
  type ClientMessage,
  type GridEvent,
  type HostAction,
  type ParticipantWire,
  type RevealRequestWire,
  type RoomSettingsWire,
  type ServerMessage,
} from "./protocol";
import { TYPING_TTL_MS, type ReactionEmoji } from "./chat";
import { realtimeConfigured, realtimeUrl } from "./config";

// Re-exported so client callers have one import for everything socket-shaped.
export { realtimeConfigured, realtimeUrl };

/**
 * The room's socket, and everything the room view renders from it.
 *
 * The connection is treated as unreliable on purpose: edits made while it is
 * down are applied locally, queued, and flushed on reconnect, and the caller
 * always knows the honest status so the UI can say so rather than pretend.
 */

export type SocketStatus =
  | "connecting"
  | "open"
  | "reconnecting"
  /** Repeatedly refused: the room server is probably not running. */
  | "unreachable"
  | "closed";

export type ClosedReason = "removed" | "ended" | "expired" | "replaced";

/** Backoff steps, in ms. The last one repeats. */
const BACKOFF = [500, 1_000, 2_000, 5_000, 10_000];
/** Failures before the UI stops saying "reconnecting" and says "unreachable". */
const UNREACHABLE_AFTER = 3;
const PING_MS = 20_000;


/**
 * A one-shot reachability probe for the lobby: open a socket with no token.
 * A running server accepts the connection and then rejects the seat, which is
 * all we need to know. Null means "still checking".
 */
export function useRealtimeReachable(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let settled = false;
    let socket: WebSocket;
    try {
      socket = new WebSocket(realtimeUrl());
    } catch {
      setReachable(false);
      return;
    }
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      setReachable(value);
      socket.close();
    };
    socket.onopen = () => finish(true);
    socket.onerror = () => finish(false);
    socket.onclose = () => finish(false);
    const timeout = setTimeout(() => finish(false), 4_000);
    return () => {
      clearTimeout(timeout);
      settled = true;
      socket.close();
    };
  }, []);

  return reachable;
}

export interface RoomSnapshot {
  you: string | null;
  room: RoomSettingsWire | null;
  participants: ParticipantWire[];
  records: CellRecordGrid;
  revision: number;
  messages: ChatMessageWire[];
  revealRequests: RevealRequestWire[];
  completed: boolean;
}

export interface RoomEvent {
  /** A grid change someone else made, for the announcement line. */
  kind: "patch" | "error" | "report" | "reveal-resolved";
  event?: GridEvent;
  by?: string | null;
  code?: string;
  text?: string;
}

interface Options {
  token: string | null;
  width: number;
  height: number;
  onEvent?: (event: RoomEvent) => void;
}

export interface RoomSocket extends RoomSnapshot {
  status: SocketStatus;
  closedReason: ClosedReason | null;
  /** Participant ids currently typing, refreshed by TTL. */
  typing: string[];
  queued: number;
  sendEdits: (edits: CellEdit[], event: GridEvent) => void;
  requestReveal: (edits: CellEdit[], scope: "square" | "word" | "puzzle") => void;
  decideReveal: (requestId: string, approve: boolean) => void;
  sendCursor: (row: number, column: number, direction: "across" | "down", clue: string | null) => void;
  sendChat: (body: string) => void;
  sendTyping: (active: boolean) => void;
  react: (messageId: string, emoji: ReactionEmoji) => void;
  report: (targetId: string, reason: string) => void;
  hostAction: (action: HostAction, targetId?: string) => void;
  retry: () => void;
}

export function useRoomSocket({ token, width, height, onEvent }: Options): RoomSocket {
  const [status, setStatus] = useState<SocketStatus>(token ? "connecting" : "closed");
  const [closedReason, setClosedReason] = useState<ClosedReason | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>(() => ({
    you: null,
    room: null,
    participants: [],
    records: emptyCellRecords(width, height),
    revision: 0,
    messages: [],
    revealRequests: [],
    completed: false,
  }));
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [queued, setQueued] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const closedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const youRef = useRef<string | null>(null);

  const push = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return;
    }
    // Cursors are worthless once stale; everything else waits for the socket.
    if (message.t === "cursor" || message.t === "typing" || message.t === "ping") return;
    queueRef.current.push(message);
    setQueued(queueRef.current.length);
  }, []);

  const handle = useCallback((message: ServerMessage) => {
    switch (message.t) {
      case "snapshot": {
        youRef.current = message.you;
        setSnapshot(() => ({
          you: message.you,
          room: message.room,
          participants: message.participants,
          records: recordsFromCells(width, height, message.cells),
          revision: message.revision,
          messages: message.messages,
          revealRequests: message.revealRequests,
          completed: message.completed,
        }));
        return;
      }
      case "patch": {
        setSnapshot((prev) => ({
          ...prev,
          records: mergePatch(prev.records, message.cells),
          revision: Math.max(prev.revision, message.revision),
          completed: message.completed,
        }));
        if (message.by !== youRef.current) {
          onEventRef.current?.({ kind: "patch", event: message.event, by: message.by });
        }
        return;
      }
      case "presence":
        setSnapshot((prev) => ({ ...prev, participants: message.participants }));
        return;
      case "room":
        setSnapshot((prev) => ({ ...prev, room: message.room }));
        return;
      case "chat":
        setSnapshot((prev) => ({
          ...prev,
          messages: [...prev.messages, message.message].slice(-200),
        }));
        return;
      case "reactions":
        setSnapshot((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === message.messageId ? { ...m, reactions: message.reactions } : m
          ),
        }));
        return;
      case "typing": {
        const timers = typingTimersRef.current;
        const existing = timers.get(message.participantId);
        if (existing) clearTimeout(existing);
        if (!message.active) {
          timers.delete(message.participantId);
          setTypingIds((ids) => ids.filter((id) => id !== message.participantId));
          return;
        }
        timers.set(
          message.participantId,
          setTimeout(() => {
            timers.delete(message.participantId);
            setTypingIds((ids) => ids.filter((id) => id !== message.participantId));
          }, TYPING_TTL_MS)
        );
        setTypingIds((ids) =>
          ids.includes(message.participantId) ? ids : [...ids, message.participantId]
        );
        return;
      }
      case "reveal-request":
        setSnapshot((prev) => ({
          ...prev,
          revealRequests: [
            ...prev.revealRequests.filter((r) => r.id !== message.request.id),
            message.request,
          ],
        }));
        return;
      case "reveal-resolved":
        setSnapshot((prev) => ({
          ...prev,
          revealRequests: prev.revealRequests.filter((r) => r.id !== message.requestId),
        }));
        onEventRef.current?.({
          kind: "reveal-resolved",
          code: message.approved ? "approved" : "declined",
        });
        return;
      case "report":
        onEventRef.current?.({
          kind: "report",
          text: `${message.reporterName} → ${message.targetName}`,
        });
        return;
      case "closed":
        closedRef.current = true;
        setClosedReason(message.reason);
        setStatus("closed");
        socketRef.current?.close();
        return;
      case "error":
        onEventRef.current?.({ kind: "error", code: message.code });
        return;
      case "pong":
        return;
    }
  }, [width, height]);

  useEffect(() => {
    if (!token) {
      setStatus("closed");
      return;
    }
    closedRef.current = false;
    let disposed = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    const typingTimers = typingTimersRef.current;

    const connect = () => {
      if (disposed || closedRef.current) return;
      setStatus(attemptRef.current === 0 ? "connecting" : attemptRef.current >= UNREACHABLE_AFTER ? "unreachable" : "reconnecting");

      let socket: WebSocket;
      try {
        socket = new WebSocket(`${realtimeUrl()}?token=${encodeURIComponent(token)}`);
      } catch {
        scheduleRetry();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        attemptRef.current = 0;
        setStatus("open");
        const pending = queueRef.current;
        queueRef.current = [];
        setQueued(0);
        for (const message of pending) socket.send(JSON.stringify(message));
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ t: "ping" } satisfies ClientMessage));
          }
        }, PING_MS);
      };

      socket.onmessage = (event) => {
        const parsed = parseServerMessage(String(event.data));
        if (parsed) handle(parsed);
      };

      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = null;
        if (disposed || closedRef.current) return;
        setSnapshot((prev) => ({
          ...prev,
          participants: prev.participants.map((p) => ({ ...p, online: false, cursor: null })),
        }));
        scheduleRetry();
      };

      socket.onerror = () => {
        /* onclose always follows; the retry is scheduled there. */
      };
    };

    const scheduleRetry = () => {
      if (disposed || closedRef.current) return;
      const delay = BACKOFF[Math.min(attemptRef.current, BACKOFF.length - 1)];
      attemptRef.current += 1;
      setStatus(attemptRef.current > UNREACHABLE_AFTER ? "unreachable" : "reconnecting");
      retryTimerRef.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      for (const timer of typingTimers.values()) clearTimeout(timer);
      typingTimers.clear();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [token, handle]);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    socketRef.current?.close();
  }, []);

  const sendEdits = useCallback(
    (edits: CellEdit[], event: GridEvent) => {
      if (edits.length === 0) return;
      const me = youRef.current;
      if (me) {
        setSnapshot((prev) => ({ ...prev, records: applyLocalEdits(prev.records, edits, me) }));
      }
      push({ t: "edit", edits, event });
    },
    [push]
  );

  const requestReveal = useCallback(
    (edits: CellEdit[], scope: "square" | "word" | "puzzle") => {
      if (edits.length === 0) return;
      push({ t: "reveal-request", edits, scope });
    },
    [push]
  );

  const decideReveal = useCallback(
    (requestId: string, approve: boolean) => push({ t: "reveal-decide", requestId, approve }),
    [push]
  );

  const sendCursor = useCallback(
    (row: number, column: number, direction: "across" | "down", clue: string | null) =>
      push({ t: "cursor", row, column, direction, clue }),
    [push]
  );

  const sendChat = useCallback((body: string) => push({ t: "chat", body }), [push]);
  const sendTyping = useCallback((active: boolean) => push({ t: "typing", active }), [push]);
  const react = useCallback(
    (messageId: string, emoji: ReactionEmoji) => push({ t: "react", messageId, emoji }),
    [push]
  );
  const report = useCallback(
    (targetId: string, reason: string) => push({ t: "report", targetId, reason }),
    [push]
  );
  const hostAction = useCallback(
    (action: HostAction, targetId?: string) => push({ t: "host", action, targetId }),
    [push]
  );

  const pending = useMemo(() => pendingCount(snapshot.records), [snapshot.records]);

  return {
    ...snapshot,
    status,
    closedReason,
    typing: typingIds,
    queued: Math.max(queued, status === "open" ? 0 : pending),
    sendEdits,
    requestReveal,
    decideReveal,
    sendCursor,
    sendChat,
    sendTyping,
    react,
    report,
    hostAction,
    retry,
  };
}
