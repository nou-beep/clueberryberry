"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { emptyAttempt, summarizeAttempt } from "@/lib/crossword/attempt";
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
import type { AttemptGridState, CellFlag, EntryDef } from "@/lib/crossword/types";
import { cellKey } from "@/lib/crossword/types";
import {
  attemptCursor,
  loadAttempt,
  clearAttempt,
  type LocalAttempt,
} from "@/lib/progress/local";
import { loadStartingAttempt, useAttemptSync } from "@/lib/progress/sync";
import { useSettings } from "@/lib/settings";
import { playCheckOk, playCompletion, playError } from "@/lib/sound";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import { CrosswordGrid } from "./CrosswordGrid";
import { CluePanel, entryId } from "./CluePanel";
import { ActiveClueBar } from "./ActiveClueBar";
import { GameToolbar } from "./GameToolbar";
import { LAM_ALEF, OnScreenKeyboard } from "./OnScreenKeyboard";
import { ResultsDialog } from "./ResultsDialog";
import { Modal } from "@/components/ui/Modal";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { Stamp } from "@/components/ui/bits";
import { Sticker, stickerForSlug } from "@/components/ui/Sticker";
import { usePipRegistration } from "@/lib/pip/context";

interface Props {
  puzzle: PlayablePuzzle;
  nextPuzzle: { slug: string; title: string } | null;
  dailyDate?: string;
  /** Editor preview: play without persisting any attempt. */
  preview?: boolean;
  /** Signed-in play syncs to the account; guest play stays in this browser. */
  signedIn?: boolean;
}

type Scope = "square" | "word" | "puzzle";

export function PlayScreen({
  puzzle,
  nextPuzzle,
  dailyDate,
  preview = false,
  signedIn = false,
}: Props) {
  const t = useTranslations("game");
  const tPuzzle = useTranslations("puzzle");
  const tDiff = useTranslations("difficulty");
  const tResults = useTranslations("results");
  const { settings, update } = useSettings();

  const rtl = puzzle.language === "ar";
  // User Arabic-input preferences apply unless the puzzle overrides them.
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

  const [state, setState] = useState<AttemptGridState>(() =>
    emptyAttempt(puzzle.width, puzzle.height)
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [checksUsed, setChecksUsed] = useState(0);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [clueSheetOpen, setClueSheetOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  // Desktop players usually have hardware keys, so the on-screen one is opt-in.
  const [desktopKeyboardVisible, setDesktopKeyboardVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [loaded, setLoaded] = useState(false);
  // Timer visibility is remembered per attempt, seeded from the global setting.
  const [timerVisible, setTimerVisible] = useState(settings.showTimer);
  const [notes, setNotes] = useState<string | null>(null);

  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const interactedRef = useRef(false);
  const startedAtRef = useRef(new Date().toISOString());
  const completedAtRef = useRef<string | undefined>(undefined);
  const restoredRef = useRef(false);

  /** Put a stored attempt on screen, cursor and all. */
  const applyAttempt = useCallback(
    (saved: LocalAttempt | null) => {
      if (saved) {
        const fits =
          saved.state.cells.length === puzzle.height &&
          saved.state.cells.every((row) => row.length === puzzle.width);
        setState(fits ? saved.state : emptyAttempt(puzzle.width, puzzle.height));
        setElapsed(saved.elapsedSeconds);
        setMistakes(saved.mistakes);
        setHintsUsed(saved.hintsUsed);
        setChecksUsed(saved.checksUsed);
        setCompleted(saved.status === "completed");
        setNotes(saved.notes ?? null);
        if (typeof saved.timerVisible === "boolean") setTimerVisible(saved.timerVisible);
        startedAtRef.current = saved.startedAt;
        completedAtRef.current = saved.completedAt;
        const cursor = attemptCursor(saved);
        const restored = cursor
          ? resolveSelection(ctx, cursor.row, cursor.column, cursor.direction)
          : null;
        if (restored) {
          setSelection(restored);
          return;
        }
      }
      const first = ctx.entries[0];
      if (first) setSelection(selectionForEntry(first));
    },
    [ctx, puzzle.width, puzzle.height]
  );

  // Restore on mount: this browser's copy first, so play can start at once,
  // then the account's copy if it turns out to be further along.
  useEffect(() => {
    applyAttempt(preview ? null : loadAttempt(puzzle.id));
    setLoaded(true);
    if (preview || !signedIn) return;
    let cancelled = false;
    void loadStartingAttempt(puzzle.id, true).then(({ attempt, source }) => {
      // Never yank the grid out from under someone who has started typing.
      if (cancelled || source !== "server" || !attempt || interactedRef.current) return;
      applyAttempt(attempt);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, preview, signedIn]);

  // A later change to the global setting still wins for the rest of the solve,
  // but the first run must not undo what the stored attempt just restored.
  useEffect(() => {
    if (!restoredRef.current) {
      restoredRef.current = true;
      return;
    }
    setTimerVisible(settings.showTimer);
  }, [settings.showTimer]);

  // Timer.
  useEffect(() => {
    if (paused || completed || !loaded) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, completed, loaded]);

  /**
   * Everything worth persisting, in one snapshot: letters and flags, the
   * cursor and its direction, the clock and whether it is on show, the counts,
   * completion, and when it all happened. `useAttemptSync` owns writing it.
   */
  const snapshot: LocalAttempt | null = useMemo(() => {
    if (!loaded || preview) return null;
    const summary = summarizeAttempt(
      state,
      puzzle.grid,
      puzzle.entries,
      puzzle.language,
      normalization
    );
    return {
      puzzleId: puzzle.id,
      slug: puzzle.slug,
      title: puzzle.title,
      language: puzzle.language,
      subjectSlug: puzzle.subjectSlug,
      topicSlug: puzzle.topicSlug,
      difficulty: puzzle.difficulty,
      state,
      elapsedSeconds: elapsed,
      mistakes,
      hintsUsed,
      checksUsed,
      completionPercentage: summary.percentage,
      status: completed ? "completed" : "in_progress",
      startedAt: startedAtRef.current,
      completedAt: completedAtRef.current,
      dailyDate,
      selectedRow: selection?.row ?? null,
      selectedColumn: selection?.column ?? null,
      direction: selection?.direction ?? "across",
      timerVisible,
      notes,
      updatedAt: new Date().toISOString(),
    };
  }, [
    loaded,
    preview,
    state,
    elapsed,
    mistakes,
    hintsUsed,
    checksUsed,
    completed,
    selection,
    timerVisible,
    notes,
    puzzle,
    normalization,
    dailyDate,
  ]);

  const { status: syncStatus } = useAttemptSync({
    enabled: !preview,
    signedIn,
    puzzleId: puzzle.id,
    attempt: snapshot,
    onAdoptServerAttempt: (incoming) => {
      // Only take the account's copy when it holds something this session
      // cannot: a solve finished on another device, or an untouched grid.
      if (!interactedRef.current || (incoming.status === "completed" && !completed)) {
        applyAttempt(incoming);
      }
    },
  });

  // Focus follows selection (only after the user interacts). Exception: while
  // the player is working the on-screen keyboard, focus stays on the key they
  // just pressed — otherwise every press would throw them back into the grid
  // and keyboard-only play of the on-screen keys would be impossible.
  useEffect(() => {
    if (!selection || !interactedRef.current) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-onscreen-keyboard]")) {
      return;
    }
    cellRefs.current.get(cellKey(selection.row, selection.column))?.focus();
  }, [selection]);

  const registerCell = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const activeEntry: EntryDef | null = useMemo(() => {
    if (!selection) return null;
    return entryAt(ctx, selection.row, selection.column, selection.direction);
  }, [ctx, selection]);

  const wordCells = useMemo(
    () => (activeEntry ? entryCellKeys(ctx, activeEntry) : new Set<string>()),
    [ctx, activeEntry]
  );

  const letters = useMemo(
    () => state.cells.map((row) => row.map((c) => c.letter)),
    [state]
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

  const maybeComplete = useCallback(
    (nextState: AttemptGridState) => {
      const summary = summarizeAttempt(
        nextState,
        puzzle.grid,
        puzzle.entries,
        puzzle.language,
        normalization
      );
      if (summary.solved && !completed) {
        completedAtRef.current = new Date().toISOString();
        setCompleted(true);
        if (settings.sound) playCompletion();
        // A beat for the stamp to land before the notebook "closes".
        setTimeout(() => setResultsOpen(true), 650);
      }
    },
    [puzzle, normalization, completed, settings.sound]
  );

  const mutateCells = useCallback(
    (
      targets: Array<{ row: number; column: number }>,
      fn: (cell: AttemptGridState["cells"][number][number], row: number, column: number) => AttemptGridState["cells"][number][number]
    ) => {
      // Compute outside the updater so completion side effects run exactly once.
      const cells = state.cells.map((r) => r.slice());
      for (const { row, column } of targets) {
        cells[row][column] = fn(cells[row][column], row, column);
      }
      const next = { cells };
      setState(next);
      maybeComplete(next);
    },
    [state, maybeComplete]
  );

  const isLocked = useCallback(
    (row: number, column: number) => {
      const flags = state.cells[row][column].flags;
      return flags.includes("revealed") || flags.includes("confirmed");
    },
    [state]
  );

  const inputLetter = useCallback(
    (raw: string) => {
      if (!selection || completed || paused) return;
      const letter = normalizeLetter(raw, puzzle.language, normalization);
      if (Array.from(letter).length !== 1) return;
      interactedRef.current = true;
      const { row, column } = selection;
      if (!isLocked(row, column)) {
        const solution = puzzle.grid[row][column];
        const wrong = settings.autoCheck && solution !== null && letter !== solution;
        mutateCells([{ row, column }], () => ({
          letter,
          flags: wrong ? (["checked-wrong"] as CellFlag[]) : [],
        }));
        if (wrong) {
          setMistakes((m) => m + 1);
          if (settings.sound) playError();
        }
      }
      setSelection((sel) => (sel ? advanceAfterType(ctx, sel, letters) : sel));
    },
    [selection, completed, paused, puzzle, normalization, isLocked, settings, mutateCells, ctx, letters]
  );

  const backspace = useCallback(() => {
    if (!selection || completed || paused) return;
    interactedRef.current = true;
    const { row, column } = selection;
    if (!isLocked(row, column) && state.cells[row][column].letter) {
      mutateCells([{ row, column }], () => ({ letter: "", flags: [] }));
      return;
    }
    const back = retreatSelection(ctx, selection);
    setSelection(back);
    if (!isLocked(back.row, back.column)) {
      mutateCells([{ row: back.row, column: back.column }], () => ({
        letter: "",
        flags: [],
      }));
    }
  }, [selection, completed, paused, isLocked, state, mutateCells, ctx]);

  /** On-screen "clear square": empty the cursor cell, leave the cursor put. */
  const clearSquare = useCallback(() => {
    if (!selection || completed || paused) return;
    interactedRef.current = true;
    const { row, column } = selection;
    if (isLocked(row, column) || !state.cells[row][column].letter) return;
    mutateCells([{ row, column }], () => ({ letter: "", flags: [] }));
  }, [selection, completed, paused, isLocked, state, mutateCells]);

  /**
   * Step one square along the current entry. `step` is +1 toward the end of the
   * answer, which in an RTL across entry is leftward on screen — the keyboard's
   * chevrons are mirrored to match.
   */
  const stepSquare = useCallback(
    (step: 1 | -1) => {
      interactedRef.current = true;
      setSelection((prev) => {
        if (!prev) return prev;
        const entry = entryAt(ctx, prev.row, prev.column, prev.direction);
        if (!entry) return prev;
        const cells = cellsOfEntry(ctx, entry);
        const idx = cells.findIndex(
          (c) => c.row === prev.row && c.column === prev.column
        );
        const target = cells[idx + step];
        return idx < 0 || !target
          ? prev
          : { ...prev, row: target.row, column: target.column };
      });
    },
    [ctx]
  );

  const toggleDirection = useCallback(() => {
    interactedRef.current = true;
    setSelection((prev) => {
      if (!prev) return prev;
      const other = prev.direction === "across" ? "down" : "across";
      return resolveSelection(ctx, prev.row, prev.column, other) ?? prev;
    });
  }, [ctx]);

  /** The two adjacent squares a lam-alef key would fill, when they exist. */
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
    if (!ligatureTarget || completed || paused) return;
    interactedRef.current = true;
    const [first, second] = ligatureTarget.cells;
    let wrongAdded = 0;
    mutateCells([first, second], (_cell, row, column) => {
      const letter = row === first.row && column === first.column ? LAM_ALEF[0] : LAM_ALEF[1];
      const solution = puzzle.grid[row][column];
      const wrong = settings.autoCheck && solution !== null && letter !== solution;
      if (wrong) wrongAdded++;
      return { letter, flags: wrong ? (["checked-wrong"] as CellFlag[]) : [] };
    });
    if (wrongAdded > 0) {
      setMistakes((m) => m + wrongAdded);
      if (settings.sound) playError();
    }
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
  }, [ligatureTarget, completed, paused, mutateCells, puzzle.grid, settings, letters, ctx]);

  const hideKeyboard = useCallback(() => {
    setKeyboardVisible(false);
    setDesktopKeyboardVisible(false);
  }, []);

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
      interactedRef.current = true;
      setSelection((prev) => {
        if (!prev) return prev;
        const entry = nextEntry(ctx, prev, step);
        return entry ? firstEmptyCell(ctx, entry, letters) : prev;
      });
    },
    [ctx, letters]
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
        if (selection) {
          const other = selection.direction === "across" ? "down" : "across";
          setSelection(resolveSelection(ctx, selection.row, selection.column, other) ?? selection);
        }
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
        interactedRef.current = true;
        // Horizontal arrows follow the screen; RTL grids mirror columns.
        const horiz = rtl ? -1 : 1;
        const delta: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -horiz],
          ArrowRight: [0, horiz],
        };
        const [dr, dc] = delta[key] ?? [0, 0];
        const moved = moveSelection(ctx, selection, dr, dc);
        // Arrow along the cross axis flips typing direction, like print apps.
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
    [selection, ctx, rtl, goEntry, backspace, inputLetter]
  );

  const check = useCallback(
    (scope: Scope) => {
      if (!selection || completed) return;
      const targets =
        scope === "square"
          ? [selection]
          : scope === "word" && activeEntry
            ? cellsOfEntry(ctx, activeEntry)
            : puzzle.grid.flatMap((row, r) =>
                row.map((cell, c) => (cell !== null ? { row: r, column: c } : null))
              ).filter((x): x is { row: number; column: number } => x !== null);
      let wrongCount = 0;
      let newMistakes = 0;
      mutateCells(targets, (cell, row, column) => {
        if (!cell.letter) return cell;
        const solution = puzzle.grid[row][column];
        const typed = normalizeLetter(cell.letter, puzzle.language, normalization);
        if (typed === solution) {
          return { ...cell, flags: ["confirmed"] as CellFlag[] };
        }
        wrongCount++;
        if (!cell.flags.includes("checked-wrong")) newMistakes++;
        return { ...cell, flags: ["checked-wrong"] as CellFlag[] };
      });
      setChecksUsed((c) => c + 1);
      if (newMistakes > 0) setMistakes((m) => m + newMistakes);
      setAnnouncement(t("checkedCorrect", { count: wrongCount }));
      if (settings.sound) (wrongCount > 0 ? playError : playCheckOk)();
    },
    [selection, completed, activeEntry, ctx, puzzle, normalization, mutateCells, settings.sound, t]
  );

  const reveal = useCallback(
    (scope: Scope) => {
      if (!selection || completed) return;
      if (scope === "puzzle" && !window.confirm(t("revealPuzzleConfirm"))) return;
      const targets =
        scope === "square"
          ? [selection]
          : scope === "word" && activeEntry
            ? cellsOfEntry(ctx, activeEntry)
            : puzzle.grid.flatMap((row, r) =>
                row.map((cell, c) => (cell !== null ? { row: r, column: c } : null))
              ).filter((x): x is { row: number; column: number } => x !== null);
      let revealedCount = 0;
      mutateCells(targets, (cell, row, column) => {
        const solution = puzzle.grid[row][column];
        if (solution === null) return cell;
        const typed = cell.letter
          ? normalizeLetter(cell.letter, puzzle.language, normalization)
          : "";
        if (typed === solution) {
          return { ...cell, flags: ["confirmed"] as CellFlag[] };
        }
        revealedCount++;
        return { letter: solution, flags: ["revealed"] as CellFlag[] };
      });
      if (revealedCount > 0) setHintsUsed((h) => h + revealedCount);
      setAnnouncement(t("revealed"));
    },
    [selection, completed, activeEntry, ctx, puzzle, normalization, mutateCells, t]
  );

  const restart = useCallback(() => {
    clearAttempt(puzzle.id);
    setState(emptyAttempt(puzzle.width, puzzle.height));
    setElapsed(0);
    setMistakes(0);
    setHintsUsed(0);
    setChecksUsed(0);
    setCompleted(false);
    setResultsOpen(false);
    setNotes(null);
    completedAtRef.current = undefined;
    startedAtRef.current = new Date().toISOString();
    const first = ctx.entries[0];
    if (first) setSelection(selectionForEntry(first));
  }, [puzzle, ctx]);

  const selectEntry = useCallback(
    (entry: EntryDef) => {
      interactedRef.current = true;
      setClueSheetOpen(false);
      setSelection(firstEmptyCell(ctx, entry, letters));
    },
    [ctx, letters]
  );

  /**
   * Register what Pip may do with this puzzle. Pip's hints go through the same
   * reveal path the toolbar uses, so they are counted as hints properly.
   */
  usePipRegistration({
    revealSquare: () => {
      if (!selection || completed) return false;
      reveal("square");
      return true;
    },
    revealWord: () => {
      if (!activeEntry || completed) return false;
      reveal("word");
      return true;
    },
    explainActive: () =>
      activeEntry
        ? { answer: activeEntry.answer, explanation: activeEntry.explanation }
        : null,
    isComplete: completed,
  });

  return (
    <div data-subject={puzzle.subjectSlug} className="mx-auto max-w-5xl">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-accent">
            {puzzle.subjectName} · {puzzle.topicName} · {tDiff(puzzle.difficulty)}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">{puzzle.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {tPuzzle("by", { author: puzzle.author })}
            {puzzle.introduction ? ` — ${puzzle.introduction}` : ""}
          </p>
        </div>
        {completed && (
          <Stamp className="mt-1 shrink-0">{tResults("completedStamp")}</Stamp>
        )}
      </header>

      <GameToolbar
        elapsed={elapsed}
        paused={paused}
        completed={completed}
        showTimer={timerVisible}
        autoCheck={settings.autoCheck}
        sound={settings.sound}
        mistakes={mistakes}
        syncStatus={syncStatus}
        onTogglePause={() => setPaused((p) => !p)}
        onToggleAutoCheck={() => update({ autoCheck: !settings.autoCheck })}
        onToggleSound={() => update({ sound: !settings.sound })}
        onCheck={check}
        onReveal={reveal}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {completed && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-line bg-butter/40 px-3 py-2.5">
          <Sticker slug={stickerForSlug(puzzle.slug)} size={40} />
          <span className="text-sm font-semibold text-ink">
            ✓ {tPuzzle("completed")}
          </span>
          <span className="ms-auto flex gap-2">
            <GlossyButton size="sm" variant="primary" onClick={() => setResultsOpen(true)}>
              {tResults("title")}
            </GlossyButton>
            <GlossyButton size="sm" onClick={restart}>
              {tPuzzle("restart")}
            </GlossyButton>
          </span>
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          {paused && !completed ? (
            <div className="mx-auto flex aspect-square w-full max-w-[560px] flex-col items-center justify-center rounded-lg border-2 border-line bg-paper-sunken">
              <p className="font-display text-2xl">{t("paused")}</p>
              <p className="mt-1 text-sm text-ink-soft">{t("pausedNote")}</p>
              <GlossyButton
                variant="primary"
                className="mt-4"
                onClick={() => setPaused(false)}
              >
                {t("resume")}
              </GlossyButton>
            </div>
          ) : (
            <CrosswordGrid
              grid={puzzle.grid}
              numbers={numbers}
              state={state}
              selection={selection}
              wordCells={wordCells}
              rtl={rtl}
              solved={completed}
              onCellClick={selectCell}
              onKeyDown={onKeyDown}
              registerCell={registerCell}
            />
          )}

          <div className="mt-3 lg:hidden">
            <div className="flex flex-wrap justify-between gap-2">
              <GlossyButton size="sm" onClick={() => setClueSheetOpen(true)}>
                {t("allClues")}
              </GlossyButton>
              <GlossyButton
                size="sm"
                variant="quiet"
                onClick={() => setKeyboardVisible((v) => !v)}
              >
                {keyboardVisible ? t("closeKeyboard") : t("openKeyboard")}
              </GlossyButton>
            </div>
          </div>

          {/* Desktop keeps the on-screen keyboard opt-in: hardware keys first. */}
          <div className="mt-3 hidden lg:block">
            {!completed && (
              <GlossyButton
                size="sm"
                variant="quiet"
                aria-expanded={desktopKeyboardVisible}
                onClick={() => setDesktopKeyboardVisible((v) => !v)}
              >
                {desktopKeyboardVisible ? t("closeKeyboard") : t("openKeyboard")}
              </GlossyButton>
            )}
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              <span className="label-caps">{t("shortcutsTitle")}: </span>
              {t("shortcuts")}
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <CluePanel
            entries={puzzle.entries}
            activeEntry={activeEntry}
            solvedKeys={solvedKeys}
            onSelect={selectEntry}
          />
        </div>
      </div>

      {/*
        The bottom dock. On phones the active clue rides directly above the
        keyboard inside the same sticky stack, so the keys can never cover the
        clue the player is answering.
      */}
      {!completed && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 sm:-mx-8 lg:mt-0">
          <div className="border-t-2 border-line-soft bg-paper px-4 pb-1.5 pt-1.5 sm:px-8 lg:hidden">
            <ActiveClueBar
              entry={activeEntry}
              rtl={rtl}
              onPrev={() => goEntry(-1)}
              onNext={() => goEntry(1)}
            />
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
              onClose={hideKeyboard}
              sound={settings.sound}
            />
          </div>
        </div>
      )}

      <Modal
        open={clueSheetOpen}
        onClose={() => setClueSheetOpen(false)}
        labelledBy="clue-sheet-title"
        closeLabel={t("close")}
      >
        <h2 id="clue-sheet-title" className="font-display mb-3 text-xl">
          {t("allClues")}
        </h2>
        <CluePanel
          entries={puzzle.entries}
          activeEntry={activeEntry}
          solvedKeys={solvedKeys}
          onSelect={selectEntry}
        />
      </Modal>

      <ResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        puzzle={puzzle}
        state={state}
        grid={puzzle.grid}
        elapsed={elapsed}
        mistakes={mistakes}
        hintsUsed={hintsUsed}
        showTimer={timerVisible}
        nextPuzzle={nextPuzzle}
        preview={preview}
      />
    </div>
  );
}
