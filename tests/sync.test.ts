import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyAttempt } from "@/lib/crossword/attempt";
import {
  attemptCursor,
  countFilledCells,
  loadAttempt,
  saveAttempt,
  type LocalAttempt,
} from "@/lib/progress/local";
import {
  AttemptSyncQueue,
  attemptFromRow,
  parseGridState,
  parseServerAttempt,
  planMerge,
  reconcileAttempts,
  writeBodyFor,
  type Cancel,
  type PutOutcome,
  type SyncStatus,
} from "@/lib/progress/sync";
import type { AttemptGridState } from "@/lib/crossword/types";

/* ------------------------------------------------------------- fixtures */

function gridWith(letters: string[][]): AttemptGridState {
  return {
    cells: letters.map((row) => row.map((letter) => ({ letter, flags: [] }))),
  };
}

function attempt(over: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    puzzleId: "puzzle-1",
    slug: "the-body-at-a-glance",
    title: "The Body at a Glance",
    language: "en",
    subjectSlug: "biology",
    topicSlug: "human-anatomy",
    difficulty: "easy",
    state: emptyAttempt(3, 3),
    elapsedSeconds: 60,
    mistakes: 0,
    hintsUsed: 0,
    checksUsed: 0,
    completionPercentage: 0,
    status: "in_progress",
    startedAt: "2026-07-30T10:00:00.000Z",
    selectedRow: null,
    selectedColumn: null,
    direction: "across",
    timerVisible: true,
    notes: null,
    revision: 0,
    updatedAt: "2026-07-30T10:01:00.000Z",
    ...over,
  };
}

/** A hand-driven scheduler, so backoff and debounce are testable without time. */
class FakeScheduler {
  private queue: Array<{ fn: () => void; ms: number; cancelled: boolean }> = [];

  readonly schedule = (fn: () => void, ms: number): Cancel => {
    const task = { fn, ms, cancelled: false };
    this.queue.push(task);
    return () => {
      task.cancelled = true;
    };
  };

  get pending(): number {
    return this.queue.filter((t) => !t.cancelled).length;
  }

  /** Run every live task once, in order. */
  runAll() {
    const due = this.queue;
    this.queue = [];
    for (const task of due) if (!task.cancelled) task.fn();
  }

  lastDelay(): number | null {
    const live = this.queue.filter((t) => !t.cancelled);
    return live.length ? live[live.length - 1].ms : null;
  }
}

class FakeTransport {
  readonly sent: Array<{ attempt: LocalAttempt; baseRevision: number }> = [];
  private outcomes: PutOutcome[] = [];
  private fallback: PutOutcome | null = null;

  queueOutcome(outcome: PutOutcome) {
    this.outcomes.push(outcome);
  }

  always(outcome: PutOutcome) {
    this.fallback = outcome;
  }

  put = async (a: LocalAttempt, baseRevision: number): Promise<PutOutcome> => {
    this.sent.push({ attempt: a, baseRevision });
    const next = this.outcomes.shift();
    if (next) return next;
    if (this.fallback) return this.fallback;
    return {
      kind: "ok",
      attempt: { ...a, revision: baseRevision + 1 },
    };
  };
}

/* ------------------------------------------------------------ reconcile */

describe("reconcileAttempts", () => {
  it("keeps the local copy when it has more filled squares", () => {
    const local = attempt({ state: gridWith([["A", "B"], ["", ""]]), revision: 3 });
    const server = attempt({ state: gridWith([["A", ""], ["", ""]]), revision: 3 });
    const result = reconcileAttempts(local, server);
    expect(result.winner).toBe("local");
    expect(result.reason).toBe("filled-cells");
  });

  it("keeps the server copy when it has more filled squares", () => {
    const local = attempt({ state: gridWith([["A", ""], ["", ""]]), revision: 9 });
    const server = attempt({ state: gridWith([["A", "B"], ["C", ""]]), revision: 1 });
    const result = reconcileAttempts(local, server);
    expect(result.winner).toBe("server");
    expect(countFilledCells(result.attempt.state)).toBe(3);
  });

  it("prefers the higher revision when progress is identical", () => {
    const state = gridWith([["A", "B"]]);
    const local = attempt({ state, revision: 5 });
    const server = attempt({ state, revision: 4 });
    expect(reconcileAttempts(local, server).winner).toBe("local");
    expect(reconcileAttempts(attempt({ state, revision: 4 }), attempt({ state, revision: 5 })).winner).toBe(
      "server"
    );
  });

  it("gives an exact tie to the server, which is what other devices can see", () => {
    const state = gridWith([["A", "B"]]);
    const local = attempt({ state, revision: 2, updatedAt: "2026-07-30T10:00:00.000Z" });
    const server = attempt({ state, revision: 2, updatedAt: "2026-07-30T10:00:00.000Z" });
    const result = reconcileAttempts(local, server);
    expect(result.winner).toBe("server");
    expect(result.reason).toBe("server-authoritative");
  });

  it("breaks an equal-revision tie on the client clock", () => {
    const state = gridWith([["A", "B"]]);
    const local = attempt({ state, revision: 2, updatedAt: "2026-07-30T12:00:00.000Z" });
    const server = attempt({ state, revision: 2, updatedAt: "2026-07-30T10:00:00.000Z" });
    const result = reconcileAttempts(local, server);
    expect(result.winner).toBe("local");
    expect(result.reason).toBe("updated-at");
  });

  it("lets a completed solve win however stale it looks", () => {
    const local = attempt({
      state: gridWith([["A", "B"]]),
      status: "completed",
      completionPercentage: 100,
      completedAt: "2026-07-30T11:00:00.000Z",
      revision: 1,
    });
    const server = attempt({
      state: gridWith([["A", "B"], ["C", "D"]]),
      status: "in_progress",
      completionPercentage: 80,
      revision: 40,
    });
    const result = reconcileAttempts(local, server);
    expect(result.winner).toBe("local");
    expect(result.reason).toBe("completed");
    expect(result.attempt.status).toBe("completed");
  });

  it("lets a completion from another device win over local play", () => {
    const local = attempt({ state: gridWith([["A", "B"]]), revision: 7 });
    const server = attempt({
      state: gridWith([["A", "B"]]),
      status: "completed",
      completionPercentage: 100,
      revision: 2,
    });
    expect(reconcileAttempts(local, server).winner).toBe("server");
  });

  it("carries monotonic counters across from the losing copy", () => {
    const local = attempt({
      state: gridWith([["A", "B"]]),
      elapsedSeconds: 500,
      hintsUsed: 3,
      revision: 1,
    });
    const server = attempt({
      state: gridWith([["A", "B"], ["C", "D"]]),
      elapsedSeconds: 100,
      mistakes: 4,
      checksUsed: 2,
      revision: 2,
    });
    const { attempt: kept } = reconcileAttempts(local, server);
    expect(kept.elapsedSeconds).toBe(500);
    expect(kept.hintsUsed).toBe(3);
    expect(kept.mistakes).toBe(4);
    expect(kept.checksUsed).toBe(2);
    expect(kept.revision).toBe(2);
  });
});

/* ---------------------------------------------------------------- merge */

describe("planMerge", () => {
  it("creates the row when the account has never seen the puzzle", () => {
    expect(planMerge(attempt(), null).action).toBe("create");
  });

  it("is idempotent: the second run of the same merge changes nothing", () => {
    const local = attempt({
      state: gridWith([["A", "B"]]),
      status: "completed",
      completionPercentage: 100,
      completedAt: "2026-07-30T11:00:00.000Z",
      revision: 0,
    });

    const first = planMerge(local, null);
    expect(first.action).toBe("create");

    // What the server now holds after that create.
    const stored = attempt({
      ...first.attempt,
      revision: 1,
      updatedAt: "2026-07-30T11:00:05.000Z",
    });

    const second = planMerge(local, stored);
    expect(second.action).toBe("skip");
    const third = planMerge(local, stored);
    expect(third.action).toBe("skip");
  });

  it("never demotes better server progress", () => {
    const local = attempt({ state: gridWith([["A", ""]]), revision: 0 });
    const server = attempt({
      state: gridWith([["A", "B"]]),
      status: "completed",
      completionPercentage: 100,
      revision: 4,
    });
    const plan = planMerge(local, server);
    expect(plan.action).toBe("skip");
    expect(plan.attempt.status).toBe("completed");
  });

  it("updates when the guest copy is genuinely further along", () => {
    const local = attempt({ state: gridWith([["A", "B"]]), revision: 0 });
    const server = attempt({ state: gridWith([["A", ""]]), revision: 3 });
    const plan = planMerge(local, server);
    expect(plan.action).toBe("update");
    expect(countFilledCells(plan.attempt.state)).toBe(2);
  });
});

/* ---------------------------------------------------------------- queue */

describe("AttemptSyncQueue", () => {
  function build(options: {
    transport: FakeTransport;
    scheduler: FakeScheduler;
    online?: boolean;
  }) {
    const statuses: SyncStatus[] = [];
    const adopted: LocalAttempt[] = [];
    const queue = new AttemptSyncQueue({
      transport: options.transport,
      schedule: options.scheduler.schedule,
      online: options.online ?? true,
      debounceMs: 1000,
      baseBackoffMs: 1000,
      onStatus: (s) => statuses.push(s),
      onServerAttempt: (a) => adopted.push(a),
    });
    return { queue, statuses, adopted };
  }

  it("debounces, sends once, and reports saved", async () => {
    const transport = new FakeTransport();
    const scheduler = new FakeScheduler();
    const { queue, statuses } = build({ transport, scheduler });

    queue.enqueue(attempt({ state: gridWith([["A", ""]]) }));
    queue.enqueue(attempt({ state: gridWith([["A", "B"]]) }));
    expect(transport.sent).toHaveLength(0);
    expect(statuses).toContain("saving");

    scheduler.runAll();
    await queue.flush();

    expect(transport.sent).toHaveLength(1);
    expect(countFilledCells(transport.sent[0].attempt.state)).toBe(2);
    expect(queue.status).toBe("saved");
    expect(queue.revision).toBe(1);
  });

  it("queues while offline and flushes when the connection returns", async () => {
    const transport = new FakeTransport();
    const scheduler = new FakeScheduler();
    const { queue, statuses } = build({ transport, scheduler, online: false });

    queue.enqueue(attempt({ state: gridWith([["A", ""]]) }));
    expect(queue.status).toBe("offline");
    expect(transport.sent).toHaveLength(0);
    expect(queue.hasPending).toBe(true);

    queue.setOnline(true);
    await queue.flush();

    expect(transport.sent).toHaveLength(1);
    expect(statuses).toContain("offline");
    expect(statuses).toContain("syncing");
    expect(queue.status).toBe("saved");
  });

  it("keeps the work and reports offline when a send finds no network", async () => {
    const transport = new FakeTransport();
    transport.queueOutcome({ kind: "offline" });
    const scheduler = new FakeScheduler();
    const { queue } = build({ transport, scheduler });

    queue.enqueue(attempt(), { immediate: true });
    await queue.flush();

    expect(queue.status).toBe("offline");
    expect(queue.hasPending).toBe(true);

    queue.setOnline(true);
    await queue.flush();
    expect(queue.status).toBe("saved");
    expect(transport.sent).toHaveLength(2);
  });

  it("reports the failure and retries with growing backoff", async () => {
    const transport = new FakeTransport();
    transport.queueOutcome({ kind: "error", status: 500 });
    transport.queueOutcome({ kind: "error", status: 500 });
    const scheduler = new FakeScheduler();
    const { queue, statuses } = build({ transport, scheduler });

    queue.enqueue(attempt(), { immediate: true });
    await queue.flush();
    expect(queue.status).toBe("failed");
    expect(scheduler.lastDelay()).toBe(1000);

    scheduler.runAll();
    await queue.flush();
    expect(queue.status).toBe("failed");
    expect(scheduler.lastDelay()).toBe(2000);

    scheduler.runAll();
    await queue.flush();
    expect(queue.status).toBe("saved");
    expect(transport.sent).toHaveLength(3);
    // Never claimed success while it was failing.
    expect(statuses.indexOf("saved")).toBeGreaterThan(statuses.indexOf("failed"));
  });

  it("does not paper over a failure with a fresh 'saving'", async () => {
    const transport = new FakeTransport();
    transport.always({ kind: "error", status: 500 });
    const scheduler = new FakeScheduler();
    const { queue } = build({ transport, scheduler });

    queue.enqueue(attempt(), { immediate: true });
    await queue.flush();
    expect(queue.status).toBe("failed");

    queue.enqueue(attempt({ state: gridWith([["A", ""]]) }));
    expect(queue.status).toBe("failed");
  });

  it("flushes a completed solve immediately, without waiting for the debounce", async () => {
    const transport = new FakeTransport();
    const scheduler = new FakeScheduler();
    const { queue } = build({ transport, scheduler });

    queue.enqueue(
      attempt({ status: "completed", completionPercentage: 100 }),
      { immediate: true }
    );
    await queue.flush();

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].attempt.status).toBe("completed");
  });

  it("rebases and resends when the local copy wins a conflict", async () => {
    const transport = new FakeTransport();
    transport.queueOutcome({
      kind: "conflict",
      attempt: attempt({ state: gridWith([["A", ""]]), revision: 8 }),
    });
    const scheduler = new FakeScheduler();
    const { queue, adopted } = build({ transport, scheduler });

    queue.enqueue(attempt({ state: gridWith([["A", "B"]]) }), { immediate: true });
    await queue.flush();

    expect(transport.sent).toHaveLength(2);
    expect(transport.sent[1].baseRevision).toBe(8);
    expect(countFilledCells(transport.sent[1].attempt.state)).toBe(2);
    expect(adopted).toHaveLength(0);
    expect(queue.status).toBe("saved");
  });

  it("adopts the server copy when it wins a conflict, instead of clobbering", async () => {
    const transport = new FakeTransport();
    transport.queueOutcome({
      kind: "conflict",
      attempt: attempt({
        state: gridWith([["A", "B"]]),
        status: "completed",
        completionPercentage: 100,
        revision: 12,
      }),
    });
    const scheduler = new FakeScheduler();
    const { queue, adopted } = build({ transport, scheduler });

    queue.enqueue(attempt({ state: gridWith([["A", ""]]) }), { immediate: true });
    await queue.flush();

    expect(transport.sent).toHaveLength(1);
    expect(adopted).toHaveLength(1);
    expect(adopted[0].status).toBe("completed");
    expect(adopted[0].revision).toBe(12);
    expect(queue.status).toBe("saved");
  });

  it("stops arguing after a bounded number of conflicts", async () => {
    const transport = new FakeTransport();
    transport.always({
      kind: "conflict",
      attempt: attempt({ state: gridWith([["A", ""]]), revision: 3 }),
    });
    const scheduler = new FakeScheduler();
    const { queue, adopted } = build({ transport, scheduler });

    queue.enqueue(attempt({ state: gridWith([["A", "B"]]) }), { immediate: true });
    await queue.flush();

    expect(transport.sent.length).toBeLessThanOrEqual(6);
    expect(adopted).toHaveLength(1);
    expect(queue.status).toBe("saved");
  });

  it("sends nothing once destroyed", async () => {
    const transport = new FakeTransport();
    const scheduler = new FakeScheduler();
    const { queue } = build({ transport, scheduler });
    queue.destroy();
    queue.enqueue(attempt(), { immediate: true });
    await queue.flush();
    expect(transport.sent).toHaveLength(0);
  });
});

/* --------------------------------------------------- local round-tripping */

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("LocalAttempt round-trip", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the cursor, direction, timer, notes and revision", () => {
    const saved = attempt({
      state: gridWith([["A", "B"], ["C", ""]]),
      selectedRow: 1,
      selectedColumn: 0,
      direction: "down",
      timerVisible: false,
      notes: "the tricky corner",
      revision: 6,
      elapsedSeconds: 321,
    });
    saveAttempt(saved);

    const back = loadAttempt("puzzle-1");
    expect(back).not.toBeNull();
    expect(back?.selectedRow).toBe(1);
    expect(back?.selectedColumn).toBe(0);
    expect(back?.direction).toBe("down");
    expect(back?.timerVisible).toBe(false);
    expect(back?.notes).toBe("the tricky corner");
    expect(back?.revision).toBe(6);
    expect(back?.elapsedSeconds).toBe(321);
    expect(back?.state.cells[0][1].letter).toBe("B");
    expect(attemptCursor(back!)).toEqual({ row: 1, column: 0, direction: "down" });
  });

  it("reports no cursor for an attempt saved before cursors were stored", () => {
    const legacy = attempt({ selectedRow: undefined, selectedColumn: undefined });
    delete legacy.selectedRow;
    delete legacy.selectedColumn;
    saveAttempt(legacy);
    expect(attemptCursor(loadAttempt("puzzle-1")!)).toBeNull();
  });
});

/* ------------------------------------------------------------ wire shapes */

describe("wire shapes", () => {
  it("sends every persisted field", () => {
    const body = writeBodyFor(
      attempt({
        selectedRow: 2,
        selectedColumn: 1,
        direction: "down",
        timerVisible: false,
        notes: "n",
        completedAt: "2026-07-30T11:00:00.000Z",
        status: "completed",
      }),
      4
    );
    expect(body.baseRevision).toBe(4);
    expect(body.attempt).toMatchObject({
      puzzleId: "puzzle-1",
      selectedRow: 2,
      selectedColumn: 1,
      direction: "down",
      timerVisible: false,
      notes: "n",
      status: "completed",
      completedAt: "2026-07-30T11:00:00.000Z",
    });
  });

  it("turns a database row into an attempt the journal can read", () => {
    const row = attemptFromRow({
      puzzleId: "p1",
      slug: "s",
      title: "T",
      language: "fr",
      subjectSlug: "biology",
      topicSlug: "human-anatomy",
      difficulty: "hard",
      currentGridState: JSON.stringify(gridWith([["A", ""]])),
      elapsedSeconds: 12,
      mistakes: 1,
      hintsUsed: 2,
      checksUsed: 3,
      completionPercentage: 50,
      status: "in_progress",
      startedAt: new Date("2026-07-30T10:00:00.000Z"),
      completedAt: null,
      selectedRow: 0,
      selectedColumn: 1,
      direction: "down",
      timerVisible: false,
      notes: null,
      revision: 7,
      updatedAt: new Date("2026-07-30T10:05:00.000Z"),
      dailyDate: "2026-07-30",
    });
    expect(row.language).toBe("fr");
    expect(row.difficulty).toBe("hard");
    expect(row.startedAt).toBe("2026-07-30T10:00:00.000Z");
    expect(row.dailyDate).toBe("2026-07-30");
    expect(countFilledCells(row.state)).toBe(1);
  });

  it("refuses malformed grid state rather than crashing a solve", () => {
    expect(parseGridState("not json").cells).toEqual([]);
    expect(parseGridState(JSON.stringify({ cells: "nope" })).cells).toEqual([]);
    expect(parseGridState(JSON.stringify({ cells: [[{ letter: 1 }]] })).cells[0][0]).toEqual(
      { letter: "", flags: [] }
    );
  });

  it("rejects a response that is not an attempt", () => {
    expect(parseServerAttempt(null)).toBeNull();
    expect(parseServerAttempt({ puzzleId: "p" })).toBeNull();
    expect(parseServerAttempt({ puzzleId: "p", slug: "s", revision: 2 })?.revision).toBe(2);
  });
});
