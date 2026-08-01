import { describe, expect, it } from "vitest";
import {
  applyEdits,
  applyLocalEdits,
  emptyCellRecords,
  mergePatch,
  pendingCount,
  recordsFromAttempt,
  recordsFromCells,
  recordsToAttempt,
  type AppliedCellEdit,
  type CellEdit,
} from "@/lib/multiplayer/merge";
import {
  assignColorIndex,
  canTransferHost,
  computeExpiry,
  disambiguateNames,
  generateRoomCode,
  isExpired,
  isRoomCode,
  isSweepable,
  nextHostAfterLeave,
  normalizeRoomCode,
  participantColor,
  PARTICIPANT_COLORS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_LIFETIME_HOURS,
  validateDisplayName,
  validateJoin,
  type HostCandidate,
} from "@/lib/multiplayer/room";
import {
  chatRateCheck,
  isReactionEmoji,
  MAX_CHAT_LENGTH,
  normalizeChatBody,
  validateChatBody,
} from "@/lib/multiplayer/chat";
import { clientMessageSchema } from "@/lib/multiplayer/protocol";

/* ── grid merge ──────────────────────────────────────────────────────── */

const edit = (row: number, column: number, letter: string): CellEdit => ({
  row,
  column,
  letter,
  flags: [],
});

describe("grid merge", () => {
  it("keeps both edits when two people type in different words", () => {
    let records = emptyCellRecords(5, 5);
    // Ada types in an across entry, Sam in a down entry, same instant.
    const ada = applyEdits(records, [edit(0, 0, "C")], 1, "ada");
    const sam = applyEdits(ada.records, [edit(3, 2, "T")], 2, "sam");
    records = sam.records;

    expect(records[0][0].letter).toBe("C");
    expect(records[0][0].by).toBe("ada");
    expect(records[3][2].letter).toBe("T");
    expect(records[3][2].by).toBe("sam");
  });

  it("does not clobber a neighbouring cell in the same row", () => {
    const first = applyEdits(emptyCellRecords(4, 4), [edit(1, 0, "A")], 1, "ada");
    const second = applyEdits(first.records, [edit(1, 3, "Z")], 2, "sam");
    expect(second.records[1][0].letter).toBe("A");
    expect(second.records[1][3].letter).toBe("Z");
  });

  it("resolves the same cell by revision, whatever the arrival order", () => {
    const base = emptyCellRecords(3, 3);
    const older: AppliedCellEdit = { ...edit(1, 1, "A"), revision: 4, by: "ada" };
    const newer: AppliedCellEdit = { ...edit(1, 1, "S"), revision: 7, by: "sam" };

    const inOrder = mergePatch(mergePatch(base, [older]), [newer]);
    const reversed = mergePatch(mergePatch(base, [newer]), [older]);

    expect(inOrder[1][1].letter).toBe("S");
    expect(reversed[1][1].letter).toBe("S");
    expect(inOrder[1][1].revision).toBe(7);
    expect(reversed[1][1].revision).toBe(7);
  });

  it("resolves a conflict inside a single patch by the highest revision", () => {
    const merged = mergePatch(emptyCellRecords(2, 2), [
      { ...edit(0, 1, "A"), revision: 2, by: "ada" },
      { ...edit(0, 1, "S"), revision: 3, by: "sam" },
    ]);
    expect(merged[0][1].letter).toBe("S");
  });

  it("ignores a replayed patch", () => {
    const patch: AppliedCellEdit = { ...edit(0, 0, "A"), revision: 5, by: "ada" };
    const once = mergePatch(emptyCellRecords(2, 2), [patch]);
    const twice = mergePatch(once, [patch]);
    expect(twice).toBe(once);
  });

  it("drops edits that fall outside the grid", () => {
    const result = applyEdits(emptyCellRecords(2, 2), [edit(9, 9, "X")], 1, "ada");
    expect(result.applied).toHaveLength(0);
  });

  it("shows a local edit immediately and lets the server value supersede it", () => {
    const local = applyLocalEdits(emptyCellRecords(3, 3), [edit(0, 0, "A")], "ada");
    expect(local[0][0].letter).toBe("A");
    expect(local[0][0].pending).toBe(true);
    expect(pendingCount(local)).toBe(1);

    const confirmed = mergePatch(local, [
      { ...edit(0, 0, "A"), revision: 1, by: "ada" },
    ]);
    expect(confirmed[0][0].pending).toBeUndefined();
    expect(pendingCount(confirmed)).toBe(0);
  });

  it("lets a peer's later write win over an unconfirmed local one", () => {
    const local = applyLocalEdits(emptyCellRecords(3, 3), [edit(0, 0, "A")], "ada");
    const peer = mergePatch(local, [{ ...edit(0, 0, "S"), revision: 3, by: "sam" }]);
    expect(peer[0][0].letter).toBe("S");
  });

  it("round-trips through the persisted attempt shape", () => {
    const { records } = applyEdits(
      emptyCellRecords(3, 2),
      [{ row: 1, column: 2, letter: "Q", flags: ["revealed"] }],
      1,
      "ada"
    );
    const restored = recordsFromAttempt(recordsToAttempt(records));
    expect(restored[1][2].letter).toBe("Q");
    expect(restored[1][2].flags).toEqual(["revealed"]);
    // Revisions restart after a restart; the room's counter carries on.
    expect(restored[1][2].revision).toBe(0);
  });

  it("builds a grid from a sparse snapshot without the revision guard", () => {
    const records = recordsFromCells(4, 4, [
      { ...edit(2, 2, "K"), revision: 0, by: null },
    ]);
    expect(records[2][2].letter).toBe("K");
    expect(records[0][0].letter).toBe("");
  });
});

/* ── room codes ──────────────────────────────────────────────────────── */

describe("room codes", () => {
  it("generates codes of the right shape from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(isRoomCode(code)).toBe(true);
      expect(/[ILO01]/.test(code)).toBe(false);
    }
  });

  it("does not read past the end of the alphabet when random() returns 1", () => {
    const code = generateRoomCode(() => 1);
    expect(code).toBe(ROOM_CODE_ALPHABET.at(-1)!.repeat(ROOM_CODE_LENGTH));
    expect(isRoomCode(code)).toBe(true);
  });

  it("keeps collisions rare across a large batch", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 5_000; i++) codes.add(generateRoomCode());
    // 31^6 ≈ 887M combinations; 5k draws should essentially never repeat.
    expect(codes.size).toBeGreaterThan(4_995);
  });

  it("normalizes what a person actually types", () => {
    expect(normalizeRoomCode(" abc-234 ")).toBe("ABC234");
    expect(isRoomCode(normalizeRoomCode("abc234"))).toBe(true);
    expect(isRoomCode("ABC23")).toBe(false);
    expect(isRoomCode("ABC2I4")).toBe(false);
  });
});

/* ── colours ─────────────────────────────────────────────────────────── */

describe("participant colours", () => {
  it("hands out the lowest free colour", () => {
    expect(assignColorIndex([])).toBe(0);
    expect(assignColorIndex([0])).toBe(1);
    expect(assignColorIndex([0, 2])).toBe(1);
    expect(assignColorIndex([1, 0, 2])).toBe(3);
  });

  it("never repeats a colour while the palette has room", () => {
    const taken: number[] = [];
    for (let i = 0; i < PARTICIPANT_COLORS.length; i++) {
      taken.push(assignColorIndex(taken));
    }
    expect(new Set(taken).size).toBe(PARTICIPANT_COLORS.length);
  });

  it("wraps once the palette is exhausted", () => {
    const full = PARTICIPANT_COLORS.map((_, i) => i);
    expect(assignColorIndex(full)).toBe(0);
  });

  it("resolves any index to a real colour", () => {
    expect(participantColor(0)).toBe(PARTICIPANT_COLORS[0]);
    expect(participantColor(PARTICIPANT_COLORS.length)).toBe(PARTICIPANT_COLORS[0]);
    expect(participantColor(-1)).toBe(PARTICIPANT_COLORS.at(-1));
  });
});

/* ── join validation ─────────────────────────────────────────────────── */

const now = new Date("2026-08-01T12:00:00.000Z");
const openRoom = {
  locked: false,
  endedAt: null,
  expiresAt: new Date("2026-08-01T18:00:00.000Z"),
  allowGuests: true,
  participantLimit: 4,
};

describe("join validation", () => {
  it("lets a guest into an open room", () => {
    expect(
      validateJoin({ room: openRoom, activeCount: 1, isGuest: true, now })
    ).toEqual({ ok: true });
  });

  it("refuses a locked room", () => {
    expect(
      validateJoin({
        room: { ...openRoom, locked: true },
        activeCount: 1,
        isGuest: false,
        now,
      })
    ).toEqual({ ok: false, reason: "locked" });
  });

  it("refuses a full room", () => {
    expect(
      validateJoin({ room: openRoom, activeCount: 4, isGuest: false, now })
    ).toEqual({ ok: false, reason: "full" });
  });

  it("refuses an ended room before anything else", () => {
    expect(
      validateJoin({
        room: { ...openRoom, endedAt: now, locked: true },
        activeCount: 9,
        isGuest: true,
        now,
      })
    ).toEqual({ ok: false, reason: "ended" });
  });

  it("refuses an expired room", () => {
    expect(
      validateJoin({
        room: { ...openRoom, expiresAt: new Date("2026-08-01T11:59:59.000Z") },
        activeCount: 0,
        isGuest: false,
        now,
      })
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses a guest when guests are disabled, but not a member", () => {
    const room = { ...openRoom, allowGuests: false };
    expect(validateJoin({ room, activeCount: 0, isGuest: true, now })).toEqual({
      ok: false,
      reason: "guests_disabled",
    });
    expect(validateJoin({ room, activeCount: 0, isGuest: false, now })).toEqual({
      ok: true,
    });
  });

  it("lets a returning participant back into a locked, full room", () => {
    expect(
      validateJoin({
        room: { ...openRoom, locked: true },
        activeCount: 4,
        isGuest: true,
        returning: { blocked: false },
        now,
      })
    ).toEqual({ ok: true });
  });

  it("keeps a removed participant out", () => {
    expect(
      validateJoin({
        room: openRoom,
        activeCount: 0,
        isGuest: true,
        returning: { blocked: true },
        now,
      })
    ).toEqual({ ok: false, reason: "blocked" });
  });
});

/* ── display names ───────────────────────────────────────────────────── */

describe("display names", () => {
  it("trims and collapses whitespace", () => {
    expect(validateDisplayName("  Sam   Ali ")).toEqual({ ok: true, name: "Sam Ali" });
  });

  it("rejects names that are too short or too long", () => {
    expect(validateDisplayName(" a ")).toEqual({ ok: false, reason: "too_short" });
    expect(validateDisplayName("x".repeat(25))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("counts graphemes rather than code units for Arabic names", () => {
    expect(validateDisplayName("سام")).toEqual({ ok: true, name: "سام" });
  });

  it("numbers duplicate names and leaves unique ones alone", () => {
    const names = disambiguateNames([
      { id: "1", displayName: "Sam" },
      { id: "2", displayName: "Ada" },
      { id: "3", displayName: "sam" },
    ]);
    expect(names.get("1")).toBe("Sam 1");
    expect(names.get("3")).toBe("sam 2");
    expect(names.get("2")).toBe("Ada");
  });
});

/* ── chat ────────────────────────────────────────────────────────────── */

describe("chat rules", () => {
  it("rejects an empty message and accepts a trimmed one", () => {
    expect(validateChatBody("   \n  ")).toEqual({ ok: false, reason: "empty" });
    expect(validateChatBody("  hello  ")).toEqual({ ok: true, body: "hello" });
  });

  it("caps the length by graphemes", () => {
    expect(validateChatBody("a".repeat(MAX_CHAT_LENGTH)).ok).toBe(true);
    expect(validateChatBody("a".repeat(MAX_CHAT_LENGTH + 1))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("collapses runaway blank lines", () => {
    expect(normalizeChatBody("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("allows a burst then blocks until the window slides", () => {
    const rate = { max: 3, windowMs: 1_000 };
    let stamps: number[] = [];
    for (let i = 0; i < 3; i++) {
      const decision = chatRateCheck(stamps, 1_000 + i, rate);
      expect(decision.allowed).toBe(true);
      stamps = decision.next;
    }
    const blocked = chatRateCheck(stamps, 1_003, rate);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);

    const later = chatRateCheck(stamps, 2_500, rate);
    expect(later.allowed).toBe(true);
  });

  it("accepts only the offered reactions", () => {
    expect(isReactionEmoji("👍")).toBe(true);
    expect(isReactionEmoji("🖕")).toBe(false);
  });
});

/* ── host transfer ───────────────────────────────────────────────────── */

const candidate = (
  id: string,
  overrides: Partial<HostCandidate> = {}
): HostCandidate => ({
  id,
  isHost: false,
  blocked: false,
  leftAt: null,
  joinedAt: new Date("2026-08-01T10:00:00.000Z"),
  ...overrides,
});

describe("host transfer", () => {
  const host = candidate("host", { isHost: true });
  const other = candidate("other", {
    joinedAt: new Date("2026-08-01T10:05:00.000Z"),
  });

  it("only the host may hand the room over", () => {
    expect(canTransferHost("host", other, [host, other])).toBe(true);
    expect(canTransferHost("other", host, [host, other])).toBe(false);
  });

  it("refuses transferring to yourself, or to someone gone", () => {
    expect(canTransferHost("host", host, [host, other])).toBe(false);
    const gone = candidate("gone", { leftAt: new Date() });
    expect(canTransferHost("host", gone, [host, gone])).toBe(false);
    const removed = candidate("removed", { blocked: true });
    expect(canTransferHost("host", removed, [host, removed])).toBe(false);
  });

  it("promotes the longest-present active participant when the host leaves", () => {
    const early = candidate("early", {
      joinedAt: new Date("2026-08-01T10:01:00.000Z"),
    });
    const late = candidate("late", {
      joinedAt: new Date("2026-08-01T10:09:00.000Z"),
    });
    expect(nextHostAfterLeave("host", [host, late, early])).toBe("early");
  });

  it("skips people who are blocked or already gone", () => {
    const blocked = candidate("blocked", {
      blocked: true,
      joinedAt: new Date("2026-08-01T10:01:00.000Z"),
    });
    expect(nextHostAfterLeave("host", [host, blocked, other])).toBe("other");
  });

  it("returns null when nobody is left", () => {
    expect(nextHostAfterLeave("host", [host])).toBeNull();
  });
});

/* ── expiry ──────────────────────────────────────────────────────────── */

describe("expiry and sweeping", () => {
  it("computes the default lifetime", () => {
    const expires = computeExpiry(now);
    expect(expires.getTime() - now.getTime()).toBe(ROOM_LIFETIME_HOURS * 3_600_000);
  });

  it("treats the exact expiry instant as expired", () => {
    expect(isExpired(now, now)).toBe(true);
    expect(isExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });

  it("sweeps expired rooms and long-ended ones, but not live ones", () => {
    const live = { expiresAt: new Date(now.getTime() + 60_000), endedAt: null };
    const expired = { expiresAt: new Date(now.getTime() - 1), endedAt: null };
    const justEnded = {
      expiresAt: new Date(now.getTime() + 60_000),
      endedAt: new Date(now.getTime() - 60_000),
    };
    const longEnded = {
      expiresAt: new Date(now.getTime() + 60_000),
      endedAt: new Date(now.getTime() - 60 * 60_000),
    };
    expect(isSweepable(live, now)).toBe(false);
    expect(isSweepable(expired, now)).toBe(true);
    expect(isSweepable(justEnded, now)).toBe(false);
    expect(isSweepable(longEnded, now)).toBe(true);
  });
});

/* ── protocol ────────────────────────────────────────────────────────── */

describe("client message validation", () => {
  it("accepts a well-formed edit", () => {
    const parsed = clientMessageSchema.safeParse({
      t: "edit",
      edits: [{ row: 0, column: 1, letter: "A", flags: [] }],
      event: "type",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown message type", () => {
    expect(clientMessageSchema.safeParse({ t: "drop-database" }).success).toBe(false);
  });

  it("rejects an unknown host action", () => {
    expect(
      clientMessageSchema.safeParse({ t: "host", action: "delete-everything" }).success
    ).toBe(false);
  });

  it("rejects negative coordinates and oversized batches", () => {
    expect(
      clientMessageSchema.safeParse({
        t: "edit",
        edits: [{ row: -1, column: 0, letter: "A", flags: [] }],
        event: "type",
      }).success
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse({
        t: "edit",
        edits: Array.from({ length: 401 }, () => ({
          row: 0,
          column: 0,
          letter: "A",
          flags: [],
        })),
        event: "type",
      }).success
    ).toBe(false);
  });

  it("rejects a reaction that is not on the list", () => {
    expect(
      clientMessageSchema.safeParse({ t: "react", messageId: "m1", emoji: "🔥" }).success
    ).toBe(false);
  });
});
