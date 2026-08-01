/**
 * Shared-grid conflict resolution.
 *
 * The room holds a single monotonic `revision`. Every accepted batch of edits
 * takes the next revision, and every cell remembers the revision that last
 * wrote it. Merging is therefore per-cell last-write-wins ordered by revision:
 *
 *   - two people typing in different words touch different cells, so both
 *     edits survive — there is no whole-grid write to clobber;
 *   - two people typing the *same* cell resolve deterministically, highest
 *     revision wins, and every client reaches the same answer regardless of
 *     the order the patches happened to arrive in.
 *
 * All functions are pure: the realtime server, the browser and the tests run
 * exactly the same code.
 */

import type { AttemptGridState, CellFlag } from "@/lib/crossword/types";

export interface CellRecord {
  letter: string;
  flags: CellFlag[];
  /** Room revision that last wrote this cell. 0 = never written. */
  revision: number;
  /** Participant id of the last writer, or null for restored state. */
  by: string | null;
  /** Written locally and not yet confirmed by the server. */
  pending?: boolean;
}

export type CellRecordGrid = CellRecord[][];

export interface CellEdit {
  row: number;
  column: number;
  letter: string;
  flags: CellFlag[];
}

export interface AppliedCellEdit extends CellEdit {
  revision: number;
  by: string | null;
}

export function emptyCellRecords(width: number, height: number): CellRecordGrid {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      letter: "",
      flags: [] as CellFlag[],
      revision: 0,
      by: null,
    }))
  );
}

/** Rebuild records from persisted attempt state after a restart. */
export function recordsFromAttempt(state: AttemptGridState): CellRecordGrid {
  return state.cells.map((row) =>
    row.map((cell) => ({
      letter: cell.letter,
      flags: [...cell.flags],
      revision: 0,
      by: null,
    }))
  );
}

export function recordsToAttempt(records: CellRecordGrid): AttemptGridState {
  return {
    cells: records.map((row) =>
      row.map((cell) => ({ letter: cell.letter, flags: [...cell.flags] }))
    ),
  };
}

/** Build a grid from a snapshot's sparse cell list, unconditionally. */
export function recordsFromCells(
  width: number,
  height: number,
  cells: readonly AppliedCellEdit[]
): CellRecordGrid {
  const records = emptyCellRecords(width, height);
  for (const cell of cells) {
    if (!inBounds(records, cell.row, cell.column)) continue;
    records[cell.row][cell.column] = {
      letter: cell.letter,
      flags: [...cell.flags],
      revision: cell.revision,
      by: cell.by,
    };
  }
  return records;
}

function inBounds(records: CellRecordGrid, row: number, column: number): boolean {
  return row >= 0 && row < records.length && column >= 0 && column < (records[0]?.length ?? 0);
}

/** Copy just the rows an edit touches; untouched rows keep their identity. */
function copyRows(records: CellRecordGrid, rows: Iterable<number>): CellRecordGrid {
  const next = records.slice();
  for (const r of rows) next[r] = next[r].slice();
  return next;
}

export interface ApplyResult {
  records: CellRecordGrid;
  applied: AppliedCellEdit[];
}

/**
 * Server side: stamp a batch of edits with the next room revision. Because the
 * server assigns revisions in arrival order, a stamped edit always beats what
 * is already in the cell.
 */
export function applyEdits(
  records: CellRecordGrid,
  edits: readonly CellEdit[],
  revision: number,
  by: string | null
): ApplyResult {
  const touched = new Set<number>();
  for (const e of edits) if (inBounds(records, e.row, e.column)) touched.add(e.row);
  if (touched.size === 0) return { records, applied: [] };

  const next = copyRows(records, touched);
  const applied: AppliedCellEdit[] = [];
  for (const e of edits) {
    if (!inBounds(records, e.row, e.column)) continue;
    next[e.row][e.column] = {
      letter: e.letter,
      flags: [...e.flags],
      revision,
      by,
    };
    applied.push({ ...e, flags: [...e.flags], revision, by });
  }
  return { records: next, applied };
}

/**
 * Client side: fold an authoritative patch into the local grid. A cell whose
 * stored revision is already at or beyond the patch is left alone, so a patch
 * replayed or delivered late can never undo newer state.
 */
export function mergePatch(
  records: CellRecordGrid,
  patch: readonly AppliedCellEdit[]
): CellRecordGrid {
  const winners = new Map<string, AppliedCellEdit>();
  for (const edit of patch) {
    if (!inBounds(records, edit.row, edit.column)) continue;
    const key = `${edit.row},${edit.column}`;
    const current = winners.get(key);
    if (!current || edit.revision > current.revision) winners.set(key, edit);
  }
  const accepted = [...winners.values()].filter(
    (edit) => edit.revision > records[edit.row][edit.column].revision
  );
  if (accepted.length === 0) return records;

  const next = copyRows(records, accepted.map((e) => e.row));
  for (const edit of accepted) {
    next[edit.row][edit.column] = {
      letter: edit.letter,
      flags: [...edit.flags],
      revision: edit.revision,
      by: edit.by,
    };
  }
  return next;
}

/**
 * Client side: show your own typing immediately. The revision is left where it
 * was, so the authoritative patch (which carries a higher revision) always
 * supersedes the optimistic value — including when a peer got there first.
 */
export function applyLocalEdits(
  records: CellRecordGrid,
  edits: readonly CellEdit[],
  by: string
): CellRecordGrid {
  const touched = new Set<number>();
  for (const e of edits) if (inBounds(records, e.row, e.column)) touched.add(e.row);
  if (touched.size === 0) return records;

  const next = copyRows(records, touched);
  for (const e of edits) {
    if (!inBounds(records, e.row, e.column)) continue;
    const current = next[e.row][e.column];
    next[e.row][e.column] = {
      letter: e.letter,
      flags: [...e.flags],
      revision: current.revision,
      by,
      pending: true,
    };
  }
  return next;
}

/** Every cell still waiting for confirmation, for the "queued edits" hint. */
export function pendingCount(records: CellRecordGrid): number {
  let n = 0;
  for (const row of records) for (const cell of row) if (cell.pending) n++;
  return n;
}
