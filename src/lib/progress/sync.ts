"use client";

/**
 * Attempt syncing.
 *
 * One hook owns saving. Every meaningful change is written to local storage
 * immediately — signed in or not — and, when signed in, a debounced `PUT` is
 * queued to the server. Writes that fail are retried with backoff; writes made
 * while offline wait in the queue and flush when the connection returns; a
 * completed solve is flushed at once and, if the page is closing, beaconed.
 *
 * Everything above the React hook is framework-free and pure enough to test:
 * `reconcileAttempts` decides conflicts, `planMerge` decides guest migration,
 * and `AttemptSyncQueue` takes its transport, clock and scheduler by injection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { loadAttempt, saveAttempt, type LocalAttempt } from "@/lib/progress/local";
import {
  parseServerAttempt,
  reconcileAttempts,
  writeBodyFor,
} from "@/lib/progress/reconcile";

/**
 * The pure half — conflict rules, merge planning and wire shapes — lives in
 * `reconcile.ts` so server routes can share it without pulling in React. It is
 * re-exported here so callers have one place to import from.
 */
export * from "@/lib/progress/reconcile";

/* ------------------------------------------------------------------ state */

/**
 * What the toolbar chip may say. Each one is a fact:
 * - `idle`    nothing has been written yet this session
 * - `local`   guest play; the only copy lives in this browser
 * - `saving`  a server write is debounced or in flight for the first time
 * - `syncing` a queued or retried write is going out now
 * - `saved`   the server has acknowledged everything we have
 * - `offline` there is unsent work and the browser reports no connection
 * - `failed`  a write was rejected or errored; a retry is scheduled
 */
export type SyncStatus =
  | "idle"
  | "local"
  | "saving"
  | "syncing"
  | "saved"
  | "offline"
  | "failed";

/* ------------------------------------------------------------------ queue */

export type PutOutcome =
  | { kind: "ok"; attempt: LocalAttempt }
  | { kind: "conflict"; attempt: LocalAttempt }
  | { kind: "offline" }
  | { kind: "error"; status?: number };

export interface SyncTransport {
  put(attempt: LocalAttempt, baseRevision: number): Promise<PutOutcome>;
}

/** Cancel handle returned by the injected scheduler. */
export type Cancel = () => void;

export interface QueueOptions {
  transport: SyncTransport;
  /** How long to gather changes before the first write. */
  debounceMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  maxConflictRetries?: number;
  online?: boolean;
  schedule?: (fn: () => void, ms: number) => Cancel;
  onStatus?: (status: SyncStatus) => void;
  /** The server copy won a conflict: the caller should adopt this. */
  onServerAttempt?: (attempt: LocalAttempt) => void;
  /** A write was acknowledged; carries the authoritative row. */
  onSynced?: (attempt: LocalAttempt) => void;
}

const defaultSchedule = (fn: () => void, ms: number): Cancel => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

/**
 * A single-slot write queue for one attempt. Newer snapshots replace older
 * ones (they are complete pictures, not deltas), so nothing is lost by
 * coalescing and the server never sees a stale intermediate state.
 */
export class AttemptSyncQueue {
  private readonly transport: SyncTransport;
  private readonly debounceMs: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly maxConflictRetries: number;
  private readonly scheduleFn: (fn: () => void, ms: number) => Cancel;
  private readonly onStatus?: (status: SyncStatus) => void;
  private readonly onServerAttempt?: (attempt: LocalAttempt) => void;
  private readonly onSynced?: (attempt: LocalAttempt) => void;

  private pending: LocalAttempt | null = null;
  private baseRevision = 0;
  private failures = 0;
  private conflicts = 0;
  private timer: Cancel | null = null;
  private running: Promise<void> | null = null;
  private online: boolean;
  private wasInterrupted = false;
  private destroyed = false;
  private currentStatus: SyncStatus = "idle";

  constructor(options: QueueOptions) {
    this.transport = options.transport;
    this.debounceMs = options.debounceMs ?? 1000;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30_000;
    this.maxConflictRetries = options.maxConflictRetries ?? 4;
    this.scheduleFn = options.schedule ?? defaultSchedule;
    this.onStatus = options.onStatus;
    this.onServerAttempt = options.onServerAttempt;
    this.onSynced = options.onSynced;
    this.online = options.online ?? true;
  }

  get status(): SyncStatus {
    return this.currentStatus;
  }

  get hasPending(): boolean {
    return this.pending !== null;
  }

  get revision(): number {
    return this.baseRevision;
  }

  /** Seed the revision from an attempt already known to match the server. */
  setBaseRevision(revision: number) {
    this.baseRevision = revision;
  }

  private setStatus(status: SyncStatus) {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.onStatus?.(status);
  }

  private cancelTimer() {
    this.timer?.();
    this.timer = null;
  }

  /** Queue a snapshot. `immediate` skips the debounce (used on completion). */
  enqueue(attempt: LocalAttempt, options: { immediate?: boolean } = {}) {
    if (this.destroyed) return;
    this.pending = attempt;
    if (!this.online) {
      this.wasInterrupted = true;
      this.setStatus("offline");
      return;
    }
    if (options.immediate) {
      this.cancelTimer();
      void this.flush();
      return;
    }
    // A scheduled retry owns the timeline; leave "failed" on show rather than
    // claiming a save is under way.
    if (this.currentStatus !== "failed") {
      this.setStatus(this.wasInterrupted ? "syncing" : "saving");
    }
    if (this.timer) return;
    this.timer = this.scheduleFn(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  setOnline(online: boolean) {
    if (this.online === online) return;
    this.online = online;
    if (!online) {
      this.wasInterrupted = true;
      if (this.pending) this.setStatus("offline");
      return;
    }
    if (this.pending) {
      this.setStatus("syncing");
      this.cancelTimer();
      void this.flush();
    }
  }

  /** Send whatever is queued, retrying and reconciling until it settles. */
  async flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(): Promise<void> {
    while (!this.destroyed && this.pending) {
      if (!this.online) {
        this.wasInterrupted = true;
        this.setStatus("offline");
        return;
      }
      const attempt = this.pending;
      this.pending = null;
      this.setStatus(this.failures > 0 || this.wasInterrupted ? "syncing" : "saving");

      const outcome = await this.transport.put(attempt, this.baseRevision);
      if (this.destroyed) return;

      if (outcome.kind === "ok") {
        this.failures = 0;
        this.conflicts = 0;
        this.wasInterrupted = false;
        this.baseRevision = outcome.attempt.revision ?? this.baseRevision + 1;
        this.onSynced?.(outcome.attempt);
        continue;
      }

      if (outcome.kind === "conflict") {
        const server = outcome.attempt;
        this.baseRevision = server.revision ?? this.baseRevision;
        this.conflicts++;
        const result = reconcileAttempts(attempt, server);
        if (result.winner === "local" && this.conflicts <= this.maxConflictRetries) {
          // Rebase onto the authoritative revision and try again. A newer
          // snapshot queued meanwhile is newer still, so it takes precedence.
          this.pending = this.pending ?? {
            ...result.attempt,
            revision: this.baseRevision,
          };
          this.wasInterrupted = true;
          continue;
        }
        // The server copy is further along (or we have argued long enough):
        // adopt it rather than overwrite progress made elsewhere.
        this.onServerAttempt?.({ ...result.attempt, revision: this.baseRevision });
        this.failures = 0;
        this.conflicts = 0;
        this.wasInterrupted = false;
        continue;
      }

      // Nothing reached the server: keep the snapshot, newest wins.
      this.pending = this.pending ?? attempt;
      this.wasInterrupted = true;
      if (outcome.kind === "offline") {
        this.online = false;
        this.setStatus("offline");
        return;
      }
      this.failures++;
      this.setStatus("failed");
      const delay = Math.min(
        this.baseBackoffMs * 2 ** (this.failures - 1),
        this.maxBackoffMs
      );
      this.cancelTimer();
      this.timer = this.scheduleFn(() => {
        this.timer = null;
        void this.flush();
      }, delay);
      return;
    }
    if (!this.destroyed && !this.pending && this.currentStatus !== "idle") {
      this.setStatus("saved");
    }
  }

  destroy() {
    this.destroyed = true;
    this.cancelTimer();
  }
}

/* -------------------------------------------------------------- transport */

/** The real transport: `PUT /api/attempts`, with 409 surfaced as a conflict. */
export function createFetchTransport(
  fetchImpl: typeof fetch = fetch,
  isOnline: () => boolean = () =>
    typeof navigator === "undefined" ? true : navigator.onLine
): SyncTransport {
  return {
    async put(attempt, baseRevision) {
      let response: Response;
      try {
        response = await fetchImpl("/api/attempts", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(writeBodyFor(attempt, baseRevision)),
        });
      } catch {
        return isOnline() ? { kind: "error" } : { kind: "offline" };
      }
      if (response.status === 409) {
        const body: unknown = await response.json().catch(() => null);
        const parsed = parseServerAttempt(
          typeof body === "object" && body !== null
            ? (body as { attempt?: unknown }).attempt
            : null
        );
        return parsed
          ? { kind: "conflict", attempt: parsed }
          : { kind: "error", status: 409 };
      }
      if (!response.ok) return { kind: "error", status: response.status };
      const body: unknown = await response.json().catch(() => null);
      const parsed = parseServerAttempt(
        typeof body === "object" && body !== null
          ? (body as { attempt?: unknown }).attempt
          : null
      );
      return parsed ? { kind: "ok", attempt: parsed } : { kind: "error", status: 200 };
    },
  };
}

/* ------------------------------------------------------------------- hook */

export interface UseAttemptSyncOptions {
  /** False for editor and playground previews: nothing is persisted at all. */
  enabled: boolean;
  signedIn: boolean;
  puzzleId: string;
  /** The current snapshot. Null until the screen has finished restoring. */
  attempt: LocalAttempt | null;
  /** Called when the server copy should replace what is on screen. */
  onAdoptServerAttempt?: (attempt: LocalAttempt) => void;
  transport?: SyncTransport;
  debounceMs?: number;
  /** How often a clock-only change is worth a server write. */
  heartbeatMs?: number;
}

export interface AttemptSyncHandle {
  status: SyncStatus;
  /** Force everything queued out now (used when a solve completes). */
  flushNow: () => void;
}

/**
 * A signature of everything except the clock. Elapsed seconds change every
 * second; sending a write for each one would be noise, so the clock rides
 * along with the next real change or with the heartbeat.
 */
function signatureOf(attempt: LocalAttempt): string {
  const letters = attempt.state.cells
    .map((row) => row.map((c) => `${c.letter}${c.flags.join("")}`).join("|"))
    .join("/");
  return [
    letters,
    attempt.mistakes,
    attempt.hintsUsed,
    attempt.checksUsed,
    attempt.completionPercentage,
    attempt.status,
    attempt.completedAt ?? "",
    attempt.selectedRow ?? "",
    attempt.selectedColumn ?? "",
    attempt.direction ?? "",
    attempt.timerVisible ?? "",
    attempt.notes ?? "",
  ].join("~");
}

/**
 * Own the saving of one attempt. Local storage is written on every change;
 * the server write is debounced, queued, retried and reconciled.
 */
export function useAttemptSync({
  enabled,
  signedIn,
  puzzleId,
  attempt,
  onAdoptServerAttempt,
  transport,
  debounceMs = 1000,
  heartbeatMs = 30_000,
}: UseAttemptSyncOptions): AttemptSyncHandle {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const queueRef = useRef<AttemptSyncQueue | null>(null);
  const lastSignature = useRef<string | null>(null);
  const lastSyncedElapsed = useRef(0);
  const attemptRef = useRef<LocalAttempt | null>(null);
  const adoptRef = useRef(onAdoptServerAttempt);
  adoptRef.current = onAdoptServerAttempt;

  // Build the queue once per puzzle, per signed-in state.
  useEffect(() => {
    if (!enabled || !signedIn) {
      queueRef.current = null;
      setStatus(enabled ? "local" : "idle");
      return;
    }
    const queue = new AttemptSyncQueue({
      transport: transport ?? createFetchTransport(),
      debounceMs,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      onStatus: setStatus,
      onSynced: (row) => {
        // Keep the local copy's revision in step so a reload does not look stale.
        const current = attemptRef.current;
        if (current) saveAttempt({ ...current, revision: row.revision });
      },
      onServerAttempt: (row) => {
        saveAttempt(row);
        adoptRef.current?.(row);
      },
    });
    const stored = loadAttempt(puzzleId);
    queue.setBaseRevision(stored?.revision ?? 0);
    queueRef.current = queue;
    lastSignature.current = null;

    const goOnline = () => queue.setOnline(true);
    const goOffline = () => queue.setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      queue.destroy();
      queueRef.current = null;
    };
  }, [enabled, signedIn, puzzleId, transport, debounceMs]);

  // Every change: write locally at once, then decide whether it is worth a PUT.
  useEffect(() => {
    if (!enabled || !attempt) return;
    const queue = queueRef.current;
    // The queue owns the revision; stamp it on so a reload knows what the
    // server has already seen.
    const stamped: LocalAttempt = queue
      ? { ...attempt, revision: queue.revision }
      : attempt;
    attemptRef.current = stamped;
    saveAttempt(stamped);
    if (!queue) return;
    const signature = signatureOf(attempt);
    const first = lastSignature.current === null;
    const changed = signature !== lastSignature.current;
    lastSignature.current = signature;
    if (first && attempt.status !== "completed") {
      // Restoring an attempt is not an edit; do not write it straight back.
      lastSyncedElapsed.current = attempt.elapsedSeconds;
      return;
    }
    if (!changed) return;
    lastSyncedElapsed.current = attempt.elapsedSeconds;
    queue.enqueue(stamped, { immediate: attempt.status === "completed" });
  }, [enabled, attempt]);

  // The clock alone still deserves an occasional write, so a long solve that is
  // abandoned mid-grid does not come back with the timer reset.
  useEffect(() => {
    if (!enabled || !signedIn) return;
    const id = setInterval(() => {
      const current = attemptRef.current;
      const queue = queueRef.current;
      if (!current || !queue) return;
      if (current.status === "completed") return;
      if (current.elapsedSeconds - lastSyncedElapsed.current < heartbeatMs / 1000) return;
      lastSyncedElapsed.current = current.elapsedSeconds;
      queue.enqueue(current);
    }, heartbeatMs);
    return () => clearInterval(id);
  }, [enabled, signedIn, heartbeatMs]);

  // A closing page must not swallow a finished solve.
  useEffect(() => {
    if (!enabled || !signedIn) return;
    const onHide = () => {
      const queue = queueRef.current;
      const current = attemptRef.current;
      if (!queue?.hasPending || !current) return;
      const body = JSON.stringify(writeBodyFor(current, queue.revision));
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/attempts",
          new Blob([body], { type: "application/json" })
        );
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [enabled, signedIn]);

  const flushNow = useCallback(() => {
    void queueRef.current?.flush();
  }, []);

  return { status, flushNow };
}

/** Progress as the account holds it: attempts by puzzle id, and the sheet. */
export interface AccountProgress {
  attempts: Record<string, LocalAttempt>;
  /** sticker slug → times earned, counted on the server. */
  stickerCounts: Record<string, number>;
}

/**
 * Read the signed-in player's progress. Returns null when the account cannot
 * be read (signed out, offline), so callers can fall back to this browser's
 * copy rather than showing an empty journal that is not true.
 */
export async function fetchAccountProgress(
  fetchImpl: typeof fetch = fetch
): Promise<AccountProgress | null> {
  try {
    const [attemptsResponse, stickersResponse] = await Promise.all([
      fetchImpl("/api/attempts"),
      fetchImpl("/api/stickers"),
    ]);
    if (!attemptsResponse.ok) return null;
    const attemptsBody: unknown = await attemptsResponse.json();
    const rawAttempts =
      typeof attemptsBody === "object" && attemptsBody !== null
        ? (attemptsBody as { attempts?: unknown }).attempts
        : null;
    const attempts: Record<string, LocalAttempt> = {};
    if (Array.isArray(rawAttempts)) {
      for (const raw of rawAttempts) {
        const parsed = parseServerAttempt(raw);
        if (parsed) attempts[parsed.puzzleId] = parsed;
      }
    }
    const stickerCounts: Record<string, number> = {};
    if (stickersResponse.ok) {
      const body: unknown = await stickersResponse.json();
      const list =
        typeof body === "object" && body !== null
          ? (body as { stickers?: unknown }).stickers
          : null;
      if (Array.isArray(list)) {
        for (const entry of list) {
          if (typeof entry !== "object" || entry === null) continue;
          const slug = (entry as { slug?: unknown }).slug;
          const count = (entry as { count?: unknown }).count;
          if (typeof slug === "string" && typeof count === "number") {
            stickerCounts[slug] = count;
          }
        }
      }
    }
    return { attempts, stickerCounts };
  } catch {
    return null;
  }
}

/**
 * What to show when a puzzle opens: the server copy when it is further along,
 * otherwise whatever this browser has. Never silently prefers one side.
 */
export async function loadStartingAttempt(
  puzzleId: string,
  signedIn: boolean,
  fetchImpl: typeof fetch = fetch
): Promise<{ attempt: LocalAttempt | null; source: "local" | "server" }> {
  const local = loadAttempt(puzzleId);
  if (!signedIn) return { attempt: local, source: "local" };
  let server: LocalAttempt | null = null;
  try {
    const response = await fetchImpl(
      `/api/attempts?puzzleId=${encodeURIComponent(puzzleId)}`
    );
    if (response.ok) {
      const body: unknown = await response.json();
      const list =
        typeof body === "object" && body !== null
          ? (body as { attempts?: unknown }).attempts
          : null;
      if (Array.isArray(list) && list.length > 0) {
        server = parseServerAttempt(list[0]);
      }
    }
  } catch {
    server = null;
  }
  if (!server) return { attempt: local, source: "local" };
  if (!local) {
    saveAttempt(server);
    return { attempt: server, source: "server" };
  }
  const result = reconcileAttempts(local, server);
  saveAttempt(result.attempt);
  return { attempt: result.attempt, source: result.winner };
}
