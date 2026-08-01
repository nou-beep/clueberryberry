"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { numberGrid } from "@/lib/crossword/grid";
import {
  advanceAfterType,
  cellsOfEntry,
  entryAt,
  entryCellKeys,
  firstEmptyCell,
  moveSelection,
  nextEntry,
  resolveSelection,
  retreatSelection,
  selectionForEntry,
  type NavContext,
  type Selection,
} from "@/lib/crossword/navigation";
import { normalizeLetter } from "@/lib/crossword/normalize";
import type { CellFlag, EntryDef } from "@/lib/crossword/types";
import { cellKey } from "@/lib/crossword/types";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import { useSettings } from "@/lib/settings";
import { recordsToAttempt, type CellEdit } from "@/lib/multiplayer/merge";
import { disambiguateNames, participantColor } from "@/lib/multiplayer/room";
import { loadHidden, saveHidden, clearSeat, type StoredSeat } from "@/lib/multiplayer/identity";
import { useRoomSocket, type RoomEvent } from "@/lib/multiplayer/useRoomSocket";
import { CrosswordGrid } from "@/components/game/CrosswordGrid";
import { CluePanel, entryId } from "@/components/game/CluePanel";
import { ActiveClueBar } from "@/components/game/ActiveClueBar";
import { LAM_ALEF, OnScreenKeyboard } from "@/components/game/OnScreenKeyboard";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { Window } from "@/components/ui/Window";
import { Modal } from "@/components/ui/Modal";
import { Stamp } from "@/components/ui/bits";
import { ChatPanel } from "./ChatPanel";
import { ConnectionBadge } from "./ConnectionBadge";
import { HostControls } from "./HostControls";
import { ParticipantStrip } from "./ParticipantStrip";
import { PresenceLayer, type PeerCursor } from "./PresenceLayer";

interface Props {
  puzzle: PlayablePuzzle;
  seat: StoredSeat;
  /** Absolute origin, for building the copyable invite link. */
  origin: string;
  locale: string;
  onLeft: () => void;
}

type Tab = "puzzle" | "clues" | "chat" | "people";
type Scope = "square" | "word" | "puzzle";

/** Error codes the room has wording for; anything else stays silent. */
const KNOWN_SOCKET_ERRORS: readonly string[] = [
  "chat_disabled",
  "muted",
  "chat_empty",
  "chat_too_long",
  "rate_limited",
  "not_host",
  "server_error",
];

export function RoomView({ puzzle, seat, origin, locale, onLeft }: Props) {
  const t = useTranslations("rooms");
  const tGame = useTranslations("game");
  const tPuzzle = useTranslations("puzzle");
  const { settings } = useSettings();

  const rtl = puzzle.language === "ar";
  const normalization = useMemo(
    () =>
      puzzle.language === "ar"
        ? {
            foldAlef: settings.arabicFoldAlef,
            foldYa: settings.arabicFoldYa,
            foldHamzaWaw: settings.arabicFoldHamzaWaw,
            foldHamzaYa: settings.arabicFoldHamzaYa,
            ...puzzle.normalization,
          }
        : puzzle.normalization,
    [
      puzzle,
      settings.arabicFoldAlef,
      settings.arabicFoldYa,
      settings.arabicFoldHamzaWaw,
      settings.arabicFoldHamzaYa,
    ]
  );
  const ctx: NavContext = useMemo(
    () => ({
      grid: puzzle.grid,
      entries: puzzle.entries,
      language: puzzle.language,
      normalization,
    }),
    [puzzle, normalization]
  );
  const numbers = useMemo(() => numberGrid(puzzle.grid).numbers, [puzzle.grid]);

  const [announcement, setAnnouncement] = useState("");
  const onEvent = useCallback(
    (event: RoomEvent) => {
      if (event.kind === "patch" && event.event && event.event !== "type") {
        setAnnouncement(t(`gridEvent.${event.event}`));
      } else if (event.kind === "error") {
        setAnnouncement(
          event.code && KNOWN_SOCKET_ERRORS.includes(event.code)
            ? t(`socketError.${event.code}`)
            : ""
        );
      } else if (event.kind === "report") {
        setAnnouncement(t("reportReceived", { detail: event.text ?? "" }));
      } else if (event.kind === "reveal-resolved") {
        setAnnouncement(event.code === "approved" ? t("revealApproved") : t("revealDeclined"));
      }
    },
    [t]
  );

  const socket = useRoomSocket({
    token: seat.token,
    width: puzzle.width,
    height: puzzle.height,
    onEvent,
  });

  const state = useMemo(() => recordsToAttempt(socket.records), [socket.records]);
  const letters = useMemo(
    () => state.cells.map((row) => row.map((c) => c.letter)),
    [state]
  );

  const [selection, setSelection] = useState<Selection | null>(() =>
    puzzle.entries[0] ? selectionForEntry(puzzle.entries[0]) : null
  );
  const [tab, setTab] = useState<Tab>("puzzle");
  const [sideOpen, setSideOpen] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const [desktopKeyboardVisible, setDesktopKeyboardVisible] = useState(false);
  const [seenMessages, setSeenMessages] = useState(0);
  const [hidden, setHidden] = useState(() => loadHidden(seat.code));
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const [gridWrapper, setGridWrapper] = useState<HTMLDivElement | null>(null);
  const interactedRef = useRef(false);

  const registerCell = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const me = socket.participants.find((p) => p.id === socket.you) ?? null;
  const isHost = me?.isHost ?? false;
  const names = useMemo(
    () =>
      disambiguateNames(
        socket.participants.map((p) => ({ id: p.id, displayName: p.displayName }))
      ),
    [socket.participants]
  );

  const activeEntry: EntryDef | null = useMemo(() => {
    if (!selection) return null;
    return entryAt(ctx, selection.row, selection.column, selection.direction);
  }, [ctx, selection]);

  const wordCells = useMemo(
    () => (activeEntry ? entryCellKeys(ctx, activeEntry) : new Set<string>()),
    [ctx, activeEntry]
  );

  const solvedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of ctx.entries) {
      const cells = cellsOfEntry(ctx, entry);
      if (cells.every(({ row, column }) => state.cells[row][column].letter)) {
        keys.add(entryId(entry));
      }
    }
    return keys;
  }, [ctx, state]);

  /* Presence ─────────────────────────────────────────────────────────── */

  const { sendCursor } = socket;
  useEffect(() => {
    if (!selection) return;
    sendCursor(
      selection.row,
      selection.column,
      selection.direction,
      activeEntry ? `${activeEntry.number} ${activeEntry.direction}` : null
    );
  }, [selection, activeEntry, sendCursor]);

  const peerCursors: PeerCursor[] = useMemo(
    () =>
      socket.participants.flatMap((p) => {
        if (p.id === socket.you || !p.online || !p.cursor) return [];
        if (hidden.blocked.includes(p.id)) return [];
        return [
          {
            id: p.id,
            name: names.get(p.id) ?? p.displayName,
            colorIndex: p.colorIndex,
            row: p.cursor.row,
            column: p.cursor.column,
          },
        ];
      }),
    [socket.participants, socket.you, hidden.blocked, names]
  );

  const peersOnActiveWord = useMemo(
    () =>
      socket.participants.filter(
        (p) =>
          p.id !== socket.you &&
          p.online &&
          p.cursor &&
          wordCells.has(cellKey(p.cursor.row, p.cursor.column))
      ),
    [socket.participants, socket.you, wordCells]
  );

  /* Editing ──────────────────────────────────────────────────────────── */

  const { sendEdits, requestReveal } = socket;

  const isLocked = useCallback(
    (row: number, column: number) => {
      const flags = state.cells[row][column].flags;
      return flags.includes("revealed") || flags.includes("confirmed");
    },
    [state]
  );

  const inputLetter = useCallback(
    (raw: string) => {
      if (!selection || socket.completed || socket.room?.ended) return;
      const letter = normalizeLetter(raw, puzzle.language, normalization);
      if (Array.from(letter).length !== 1) return;
      interactedRef.current = true;
      const { row, column } = selection;
      if (!isLocked(row, column)) {
        sendEdits([{ row, column, letter, flags: [] }], "type");
      }
      setSelection((sel) => (sel ? advanceAfterType(ctx, sel, letters) : sel));
    },
    [selection, socket.completed, socket.room, puzzle.language, normalization, isLocked, sendEdits, ctx, letters]
  );

  const backspace = useCallback(() => {
    if (!selection || socket.completed) return;
    interactedRef.current = true;
    const { row, column } = selection;
    if (!isLocked(row, column) && state.cells[row][column].letter) {
      sendEdits([{ row, column, letter: "", flags: [] }], "type");
      return;
    }
    const back = retreatSelection(ctx, selection);
    setSelection(back);
    if (!isLocked(back.row, back.column)) {
      sendEdits([{ row: back.row, column: back.column, letter: "", flags: [] }], "type");
    }
  }, [selection, socket.completed, isLocked, state, sendEdits, ctx]);

  const clearSquare = useCallback(() => {
    if (!selection || socket.completed) return;
    const { row, column } = selection;
    if (isLocked(row, column) || !state.cells[row][column].letter) return;
    sendEdits([{ row, column, letter: "", flags: [] }], "type");
  }, [selection, socket.completed, isLocked, state, sendEdits]);

  const ligatureTarget = useMemo(() => {
    if (!selection || !activeEntry) return null;
    const cells = cellsOfEntry(ctx, activeEntry);
    const idx = cells.findIndex(
      (c) => c.row === selection.row && c.column === selection.column
    );
    const pair = idx < 0 ? undefined : [cells[idx], cells[idx + 1]];
    if (!pair?.[0] || !pair[1]) return null;
    if (pair.some((c) => isLocked(c.row, c.column))) return null;
    return { cells: [pair[0], pair[1]] as const, direction: activeEntry.direction };
  }, [selection, activeEntry, ctx, isLocked]);

  const insertLigature = useCallback(() => {
    if (!ligatureTarget || socket.completed) return;
    const [first, second] = ligatureTarget.cells;
    sendEdits(
      [
        { row: first.row, column: first.column, letter: LAM_ALEF[0], flags: [] },
        { row: second.row, column: second.column, letter: LAM_ALEF[1], flags: [] },
      ],
      "type"
    );
    const filled = letters.map((r) => r.slice());
    filled[first.row][first.column] = LAM_ALEF[0];
    filled[second.row][second.column] = LAM_ALEF[1];
    setSelection(
      advanceAfterType(
        ctx,
        { row: second.row, column: second.column, direction: ligatureTarget.direction },
        filled
      )
    );
  }, [ligatureTarget, socket.completed, sendEdits, letters, ctx]);

  const scopeCells = useCallback(
    (scope: Scope) => {
      if (scope === "square") return selection ? [selection] : [];
      if (scope === "word") return activeEntry ? cellsOfEntry(ctx, activeEntry) : [];
      return puzzle.grid
        .flatMap((row, r) =>
          row.map((cell, c) => (cell !== null ? { row: r, column: c } : null))
        )
        .filter((x): x is { row: number; column: number } => x !== null);
    },
    [selection, activeEntry, ctx, puzzle.grid]
  );

  const check = useCallback(
    (scope: Scope) => {
      const edits: CellEdit[] = [];
      for (const { row, column } of scopeCells(scope)) {
        const cell = state.cells[row][column];
        if (!cell.letter) continue;
        const typed = normalizeLetter(cell.letter, puzzle.language, normalization);
        edits.push({
          row,
          column,
          letter: cell.letter,
          flags: [
            typed === puzzle.grid[row][column] ? "confirmed" : "checked-wrong",
          ] as CellFlag[],
        });
      }
      sendEdits(edits, "check");
    },
    [scopeCells, state, puzzle, normalization, sendEdits]
  );

  const reveal = useCallback(
    (scope: Scope) => {
      const edits: CellEdit[] = [];
      for (const { row, column } of scopeCells(scope)) {
        const solution = puzzle.grid[row][column];
        if (solution === null) continue;
        const cell = state.cells[row][column];
        const typed = cell.letter
          ? normalizeLetter(cell.letter, puzzle.language, normalization)
          : "";
        edits.push({
          row,
          column,
          letter: typed === solution ? cell.letter : solution,
          flags: [typed === solution ? "confirmed" : "revealed"] as CellFlag[],
        });
      }
      if (edits.length === 0) return;
      if (socket.room?.hintsNeedApproval && !isHost) {
        requestReveal(edits, scope);
        setAnnouncement(t("revealPending"));
        return;
      }
      sendEdits(edits, "reveal");
    },
    [scopeCells, puzzle.grid, state, puzzle.language, normalization, socket.room, isHost, requestReveal, sendEdits, t]
  );

  /* Navigation ───────────────────────────────────────────────────────── */

  const selectCell = useCallback(
    (row: number, column: number) => {
      interactedRef.current = true;
      setSelection((prev) => {
        if (prev && prev.row === row && prev.column === column) {
          const other = prev.direction === "across" ? "down" : "across";
          return resolveSelection(ctx, row, column, other) ?? prev;
        }
        return resolveSelection(ctx, row, column, prev?.direction ?? "across") ?? prev;
      });
    },
    [ctx]
  );

  const goEntry = useCallback(
    (step: 1 | -1) => {
      setSelection((prev) => {
        if (!prev) return prev;
        const entry = nextEntry(ctx, prev, step);
        return entry ? firstEmptyCell(ctx, entry, letters) : prev;
      });
    },
    [ctx, letters]
  );

  const toggleDirection = useCallback(() => {
    setSelection((prev) => {
      if (!prev) return prev;
      const other = prev.direction === "across" ? "down" : "across";
      return resolveSelection(ctx, prev.row, prev.column, other) ?? prev;
    });
  }, [ctx]);

  const stepSquare = useCallback(
    (step: 1 | -1) => {
      setSelection((prev) => {
        if (!prev) return prev;
        const entry = entryAt(ctx, prev.row, prev.column, prev.direction);
        if (!entry) return prev;
        const cells = cellsOfEntry(ctx, entry);
        const idx = cells.findIndex((c) => c.row === prev.row && c.column === prev.column);
        const target = cells[idx + step];
        return idx < 0 || !target ? prev : { ...prev, row: target.row, column: target.column };
      });
    },
    [ctx]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === "Tab") {
        e.preventDefault();
        goEntry(e.shiftKey ? -1 : 1);
        return;
      }
      if (key === " ") {
        e.preventDefault();
        toggleDirection();
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        backspace();
        return;
      }
      if (key.startsWith("Arrow")) {
        e.preventDefault();
        if (!selection) return;
        const horiz = rtl ? -1 : 1;
        const delta: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -horiz],
          ArrowRight: [0, horiz],
        };
        const [dr, dc] = delta[key] ?? [0, 0];
        const moved = moveSelection(ctx, selection, dr, dc);
        const dirWanted = dr !== 0 ? "down" : "across";
        setSelection(
          resolveSelection(ctx, moved.row, moved.column, dirWanted) ?? {
            ...moved,
            direction: selection.direction,
          }
        );
        return;
      }
      if (key.length === 1) {
        e.preventDefault();
        inputLetter(key);
      }
    },
    [goEntry, toggleDirection, backspace, selection, rtl, ctx, inputLetter]
  );

  useEffect(() => {
    if (!selection || !interactedRef.current) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-onscreen-keyboard]")) return;
    cellRefs.current.get(cellKey(selection.row, selection.column))?.focus();
  }, [selection]);

  /* Chat plumbing ────────────────────────────────────────────────────── */

  const chatOpen = sideOpen || tab === "chat";
  useEffect(() => {
    if (chatOpen) setSeenMessages(socket.messages.length);
  }, [chatOpen, socket.messages.length]);
  const unread = Math.max(0, socket.messages.length - seenMessages);

  const toggleHidden = useCallback(
    (participantId: string) => {
      setHidden((prev) => {
        const blocked = prev.blocked.includes(participantId)
          ? prev.blocked.filter((id) => id !== participantId)
          : [...prev.blocked, participantId];
        const next = { ...prev, blocked };
        saveHidden(seat.code, next);
        return next;
      });
    },
    [seat.code]
  );

  const createInvite = useCallback(async () => {
    setCreatingInvite(true);
    try {
      const response = await fetch(`/api/rooms/${seat.code}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: seat.token }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { invite: { code: string } };
      setInviteUrl(`${origin}/${locale}/rooms/join/${data.invite.code}`);
    } catch {
      /* Offline: the host can try again; nothing is shown that is not real. */
    } finally {
      setCreatingInvite(false);
    }
  }, [seat.code, seat.token, origin, locale]);

  const leave = useCallback(() => {
    clearSeat(seat.code);
    onLeft();
  }, [seat.code, onLeft]);

  /* Rendering ────────────────────────────────────────────────────────── */

  const roomEnded = socket.closedReason !== null && socket.closedReason !== "replaced";
  const shareUrl = `${origin}/${locale}/rooms/${seat.code}`;

  const gridBlock = (
    <div ref={setGridWrapper} className="relative">
      <CrosswordGrid
        grid={puzzle.grid}
        numbers={numbers}
        state={state}
        selection={selection}
        wordCells={wordCells}
        rtl={rtl}
        solved={socket.completed}
        onCellClick={selectCell}
        onKeyDown={onKeyDown}
        registerCell={registerCell}
      />
      <PresenceLayer cursors={peerCursors} container={gridWrapper} cells={cellRefs.current} />
    </div>
  );

  const cluesBlock = (
    <CluePanel
      entries={puzzle.entries}
      activeEntry={activeEntry}
      solvedKeys={solvedKeys}
      onSelect={(entry) => {
        setSelection(firstEmptyCell(ctx, entry, letters));
        setTab("puzzle");
      }}
    />
  );

  const chatBlock = (
    <ChatPanel
      messages={socket.messages}
      participants={socket.participants}
      names={names}
      youId={socket.you}
      enabled={socket.room?.chatEnabled ?? false}
      muted={me?.muted ?? false}
      typing={socket.typing}
      hiddenIds={hidden.blocked}
      onSend={socket.sendChat}
      onTyping={socket.sendTyping}
      onReact={socket.react}
      onReport={(id) => {
        setReportTarget(id);
        setReportReason("");
      }}
      onToggleHidden={toggleHidden}
    />
  );

  const peopleBlock = (
    <div className="space-y-3 p-3">
      <ParticipantStrip
        participants={socket.participants}
        names={names}
        youId={socket.you}
        blocked={hidden.blocked}
      />
      <div className="rounded-lg border-2 border-line-soft bg-paper-sunken p-2">
        <p className="label-caps text-ink-soft">{t("roomCode")}</p>
        <p className="font-display text-2xl tracking-[0.2em]">{seat.code}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-ink-faint">{shareUrl}</p>
      </div>
      {isHost && socket.room && (
        <HostControls
          room={socket.room}
          participants={socket.participants}
          names={names}
          youId={socket.you}
          inviteUrl={inviteUrl}
          onCreateInvite={() => void createInvite()}
          creatingInvite={creatingInvite}
          onAction={socket.hostAction}
        />
      )}
      <GlossyButton size="sm" onClick={leave}>
        {t("leaveRoom")}
      </GlossyButton>
    </div>
  );

  return (
    <div data-subject={puzzle.subjectSlug} className="mx-auto max-w-[100rem]">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-accent">
            {t("roomLabel", { code: seat.code })} · {puzzle.subjectName}
          </p>
          <h1 className="font-display truncate text-2xl sm:text-3xl">{puzzle.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionBadge
            status={socket.status}
            queued={socket.queued}
            onRetry={socket.retry}
          />
          {socket.completed && <Stamp>{t("completedBanner")}</Stamp>}
        </div>
      </header>

      {socket.status === "unreachable" && (
        <div className="mb-3 rounded-xl border-2 border-wrong bg-paper-sunken px-3 py-2.5">
          <p className="text-[15px] font-semibold text-wrong">{t("serverDown")}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {t("serverDownHint")}
          </p>
        </div>
      )}

      {roomEnded && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-line bg-butter/50 px-3 py-2.5">
          <p className="text-[15px] font-semibold text-ink">
            {t(`closed.${socket.closedReason}`)}
          </p>
          <GlossyLink href="/rooms" size="sm" className="ms-auto">
            {t("backToLobby")}
          </GlossyLink>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Participant strip: on top, one line, never in the way of the grid. */}
      <div className="mb-3 hidden rounded-xl border-2 border-line bg-paper-bright px-3 py-2 shadow-card lg:block">
        <ParticipantStrip
          participants={socket.participants}
          names={names}
          youId={socket.you}
          blocked={hidden.blocked}
        />
      </div>

      {/* Mobile tabs. */}
      <div className="mb-3 flex gap-1 lg:hidden" role="tablist">
        {(["puzzle", "clues", "chat", "people"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative min-h-11 flex-1 rounded-t-xl border-2 border-b-0 px-2 text-[13px] font-semibold ${
              tab === key
                ? "border-line bg-paper-bright text-ink"
                : "border-line-soft bg-paper-sunken text-ink-soft"
            }`}
          >
            {t(key)}
            {key === "chat" && unread > 0 && tab !== "chat" && (
              <span className="absolute -top-1 end-1 rounded-full bg-pink-deep px-1.5 text-[10px] font-bold text-paper-bright">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className={tab === "puzzle" ? "block" : "hidden lg:block"}>
            {gridBlock}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <GlossyButton size="sm" onClick={() => check("word")} disabled={socket.completed}>
                {tGame("checkWord")}
              </GlossyButton>
              <GlossyButton size="sm" onClick={() => check("puzzle")} disabled={socket.completed}>
                {tGame("checkPuzzle")}
              </GlossyButton>
              <GlossyButton size="sm" onClick={() => reveal("square")} disabled={socket.completed}>
                {tGame("revealSquare")}
              </GlossyButton>
              <GlossyButton size="sm" onClick={() => reveal("word")} disabled={socket.completed}>
                {tGame("revealWord")}
              </GlossyButton>
              <GlossyButton
                size="sm"
                variant="quiet"
                className="lg:hidden"
                onClick={() => setKeyboardVisible((v) => !v)}
              >
                {keyboardVisible ? tGame("closeKeyboard") : tGame("openKeyboard")}
              </GlossyButton>
              <GlossyButton
                size="sm"
                variant="quiet"
                className="hidden lg:inline-flex"
                onClick={() => setDesktopKeyboardVisible((v) => !v)}
              >
                {desktopKeyboardVisible ? tGame("closeKeyboard") : tGame("openKeyboard")}
              </GlossyButton>
            </div>
          </div>

          <div className={tab === "clues" ? "block" : "hidden xl:block"}>
            <Window title={tPuzzle("across") + " / " + tPuzzle("down")}>
              <div className="p-3">{cluesBlock}</div>
            </Window>
          </div>
        </div>

        {/* Desktop side column: chat, and the people/host panel under it. */}
        <aside className={`${tab === "chat" || tab === "people" ? "block" : "hidden"} lg:block`}>
          <div className="hidden justify-end lg:flex">
            <button
              type="button"
              onClick={() => setSideOpen((v) => !v)}
              aria-expanded={sideOpen}
              className="relative mb-1 min-h-11 rounded-lg px-2 text-[12px] font-semibold text-ink-soft hover:text-ink"
            >
              {sideOpen ? t("collapseChat") : t("expandChat")}
              {!sideOpen && unread > 0 && (
                <span className="ms-1 rounded-full bg-pink-deep px-1.5 text-[10px] font-bold text-paper-bright">
                  {unread}
                </span>
              )}
            </button>
          </div>

          <div
            className={`${tab === "chat" ? "block" : "hidden"} ${
              sideOpen ? "lg:block" : "lg:hidden"
            }`}
          >
            <Window title={t("chat")}>
              <div className="h-[26rem] lg:h-[30rem]">{chatBlock}</div>
            </Window>
          </div>

          <div className={`${tab === "people" ? "block" : "hidden"} mt-3 lg:block`}>
            <Window title={t("peopleCount", { count: socket.participants.length })}>
              {peopleBlock}
            </Window>
          </div>
        </aside>
      </div>

      {/* Reveal approvals: only the host is asked. */}
      {isHost &&
        socket.revealRequests.map((request) => (
          <div
            key={request.id}
            className="fixed bottom-3 z-30 rounded-xl border-2 border-line bg-paper-bright p-3 shadow-window"
            style={{ insetInlineEnd: 12, maxWidth: 320 }}
          >
            <p className="text-[14px] font-semibold text-ink">{t("revealApprovalTitle")}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
              {t("revealApprovalBody", {
                name: names.get(request.participantId) ?? request.requesterName,
                count: request.cellCount,
              })}
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <GlossyButton size="sm" onClick={() => socket.decideReveal(request.id, false)}>
                {t("decline")}
              </GlossyButton>
              <GlossyButton
                size="sm"
                variant="primary"
                onClick={() => socket.decideReveal(request.id, true)}
              >
                {t("approve")}
              </GlossyButton>
            </div>
          </div>
        ))}

      {/* The clue bar and keyboard stay above everything while solving. */}
      {!socket.completed && tab === "puzzle" && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 sm:-mx-8">
          <div className="border-t-2 border-line-soft bg-paper px-4 pb-1.5 pt-1.5 sm:px-8">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ActiveClueBar
                  entry={activeEntry}
                  rtl={rtl}
                  onPrev={() => goEntry(-1)}
                  onNext={() => goEntry(1)}
                />
              </div>
              {peersOnActiveWord.length > 0 && (
                <span
                  className="flex shrink-0 -space-x-1"
                  title={t("participantsHere", { count: peersOnActiveWord.length })}
                >
                  {peersOnActiveWord.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      aria-hidden
                      className="block size-3 rounded-full border-2 border-paper"
                      style={{ backgroundColor: participantColor(p.colorIndex) }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
          <div
            className={`${keyboardVisible ? "block" : "hidden"} ${
              desktopKeyboardVisible ? "lg:block" : "lg:hidden"
            }`}
          >
            <OnScreenKeyboard
              language={puzzle.language}
              direction={selection?.direction ?? "across"}
              onLetter={inputLetter}
              onLigature={insertLigature}
              ligatureEnabled={ligatureTarget !== null}
              onBackspace={backspace}
              onClearSquare={clearSquare}
              onPrevSquare={() => stepSquare(-1)}
              onNextSquare={() => stepSquare(1)}
              onToggleDirection={toggleDirection}
              onClose={() => {
                setKeyboardVisible(false);
                setDesktopKeyboardVisible(false);
              }}
              sound={settings.sound}
            />
          </div>
        </div>
      )}

      <Modal
        open={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        labelledBy="report-title"
        closeLabel={t("cancel")}
      >
        <h2 id="report-title" className="font-display mb-2 text-xl">
          {t("report")}
        </h2>
        <label className="label-caps block text-ink-soft" htmlFor="report-reason">
          {t("reportPrompt")}
        </label>
        <textarea
          id="report-reason"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          rows={3}
          maxLength={300}
          className="mt-1 w-full rounded-lg border-2 border-line bg-paper-bright p-2 text-[14px] text-ink"
        />
        <div className="mt-3 flex justify-end gap-2">
          <GlossyButton size="sm" onClick={() => setReportTarget(null)}>
            {t("cancel")}
          </GlossyButton>
          <GlossyButton
            size="sm"
            variant="primary"
            onClick={() => {
              if (reportTarget) socket.report(reportTarget, reportReason);
              setReportTarget(null);
              setAnnouncement(t("reportSent"));
            }}
          >
            {t("send")}
          </GlossyButton>
        </div>
      </Modal>
    </div>
  );
}
