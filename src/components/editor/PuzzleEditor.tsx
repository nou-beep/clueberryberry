"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { numberGrid } from "@/lib/crossword/grid";
import { normalizeLetter } from "@/lib/crossword/normalize";
import { puzzleFileSchema } from "@/lib/crossword/schema";
import { validatePuzzle } from "@/lib/crossword/validate";
import {
  CLUE_STYLES,
  type ClueStyle,
  type Difficulty,
  type Direction,
  type Grid,
  type PuzzleDef,
  type PuzzleLanguage,
  type PuzzleStatus,
  type ValidationIssue,
  cellKey,
} from "@/lib/crossword/types";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import { PlayScreen } from "@/components/game/PlayScreen";

type EditorCell = { block: boolean; letter: string };

interface EntryMeta {
  clue: string;
  clueStyle: ClueStyle;
  acceptedAlternatives: string;
  explanation: string;
  sourceNotes: string;
  difficultyRating: number | undefined;
  isThemeEntry: boolean;
}

const EMPTY_META: EntryMeta = {
  clue: "",
  clueStyle: "definition",
  acceptedAlternatives: "",
  explanation: "",
  sourceNotes: "",
  difficultyRating: undefined,
  isThemeEntry: false,
};

interface Props {
  puzzleId: string;
  initial: PuzzleDef;
  subjects: Array<{ slug: string; name: string }>;
  topics: Array<{ slug: string; name: string; subjectSlug: string }>;
  subjectName: string;
  topicName: string;
}

type Tab = "grid" | "clues" | "facts" | "meta" | "validation";

const field =
  "w-full border border-line bg-paper-bright px-2 py-1.5 text-sm text-ink";

function cellsFromDef(def: PuzzleDef): EditorCell[][] {
  const cells: EditorCell[][] = Array.from({ length: def.height }, () =>
    Array.from({ length: def.width }, () => ({ block: true, letter: "" }))
  );
  const grid = def.grid;
  if (grid) {
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const v = grid[r]?.[c] ?? null;
        cells[r][c] = v === null ? { block: true, letter: "" } : { block: false, letter: v };
      }
    }
  }
  return cells;
}

function metaFromDef(def: PuzzleDef): Record<string, EntryMeta> {
  const map: Record<string, EntryMeta> = {};
  for (const e of def.entries) {
    map[`${e.direction}:${e.row},${e.column}`] = {
      clue: e.clue,
      clueStyle: e.clueStyle,
      acceptedAlternatives: (e.acceptedAlternatives ?? []).join(", "),
      explanation: e.explanation ?? "",
      sourceNotes: e.sourceNotes ?? "",
      difficultyRating: e.difficultyRating,
      isThemeEntry: e.isThemeEntry ?? false,
    };
  }
  return map;
}

export function PuzzleEditor({
  puzzleId,
  initial,
  subjects,
  topics,
  subjectName,
  topicName,
}: Props) {
  const t = useTranslations("editor");
  const tLang = useTranslations("languages");
  const tDiff = useTranslations("difficulty");
  const tPuzzle = useTranslations("puzzle");

  const [tab, setTab] = useState<Tab>("grid");
  const [blockMode, setBlockMode] = useState(false);
  const [meta, setMeta] = useState({
    title: initial.title,
    slug: initial.slug,
    language: initial.language,
    subject: initial.subject,
    topic: initial.topic,
    difficulty: initial.difficulty,
    author: initial.author,
    editor: initial.editor ?? "",
    introduction: initial.introduction ?? "",
    completionMessage: initial.completionMessage ?? "",
    estimatedSolveTime: initial.estimatedSolveTime,
    symmetry: initial.symmetry ?? false,
    status: initial.status ?? "draft",
    publicationDate: initial.publicationDate ?? "",
    width: initial.width,
    height: initial.height,
  });
  const [cells, setCells] = useState<EditorCell[][]>(() => cellsFromDef(initial));
  const [entryMeta, setEntryMeta] = useState<Record<string, EntryMeta>>(() =>
    metaFromDef(initial)
  );
  const [factCards, setFactCards] = useState(initial.factCards ?? []);
  const [selection, setSelection] = useState<{ row: number; column: number; direction: Direction } | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rtl = meta.language === "ar";

  /** Pseudo solution grid for numbering: unknown letters become "?". */
  const grid: Grid = useMemo(
    () =>
      cells.map((row) =>
        row.map((cell) => (cell.block ? null : cell.letter || "?"))
      ),
    [cells]
  );
  const numbering = useMemo(() => numberGrid(grid), [grid]);

  const buildDef = useCallback((): PuzzleDef => {
    const entries = numbering.slots.map((slot) => {
      const letters: string[] = [];
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === "down" ? slot.row + i : slot.row;
        const c = slot.direction === "across" ? slot.column + i : slot.column;
        letters.push(cells[r][c].letter || "?");
      }
      const m = entryMeta[`${slot.direction}:${slot.row},${slot.column}`] ?? EMPTY_META;
      return {
        number: slot.number,
        direction: slot.direction,
        row: slot.row,
        column: slot.column,
        answer: letters.join(""),
        clue: m.clue,
        clueStyle: m.clueStyle,
        acceptedAlternatives: m.acceptedAlternatives
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        explanation: m.explanation || undefined,
        sourceNotes: m.sourceNotes || undefined,
        difficultyRating: m.difficultyRating,
        isThemeEntry: m.isThemeEntry,
      };
    });
    return {
      slug: meta.slug,
      title: meta.title,
      language: meta.language as PuzzleLanguage,
      subject: meta.subject,
      topic: meta.topic,
      difficulty: meta.difficulty as Difficulty,
      width: meta.width,
      height: meta.height,
      entries,
      author: meta.author,
      editor: meta.editor || undefined,
      status: meta.status as PuzzleStatus,
      publicationDate: meta.publicationDate || undefined,
      estimatedSolveTime: meta.estimatedSolveTime ?? undefined,
      introduction: meta.introduction || undefined,
      completionMessage: meta.completionMessage || undefined,
      symmetry: meta.symmetry,
      factCards,
    };
  }, [numbering, cells, entryMeta, meta, factCards]);

  const incompleteCells = useMemo(() => {
    let count = 0;
    for (const row of cells) {
      for (const cell of row) if (!cell.block && !cell.letter) count++;
    }
    return count;
  }, [cells]);

  const runValidation = useCallback((): ValidationIssue[] => {
    const list: ValidationIssue[] = [];
    if (incompleteCells > 0) {
      list.push({
        severity: "error",
        code: "incomplete_fill",
        message: `${incompleteCells} open squares have no letter yet`,
      });
    }
    const result = validatePuzzle(buildDef());
    list.push(...result.issues);
    setIssues(list);
    return list;
  }, [incompleteCells, buildDef]);

  const save = useCallback(async () => {
    setSaveState("saving");
    setServerError(null);
    const localIssues = runValidation();
    if (incompleteCells > 0) {
      setSaveState("error");
      setServerError(localIssues.find((i) => i.code === "incomplete_fill")?.message ?? null);
      setTab("validation");
      return;
    }
    const res = await fetch(`/api/editor/puzzles/${puzzleId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildDef()),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      setSaveState("error");
      setServerError(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }, [puzzleId, buildDef, runValidation, incompleteCells]);

  const transition = useCallback(
    async (status: PuzzleStatus) => {
      setServerError(null);
      const res = await fetch(`/api/editor/puzzles/${puzzleId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          editor: meta.editor || undefined,
          publicationDate: meta.publicationDate || undefined,
        }),
      });
      if (res.ok) {
        setMeta((m) => ({ ...m, status }));
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string; issues?: ValidationIssue[] }
          | null;
        if (data?.issues) {
          setIssues(data.issues);
          setTab("validation");
        }
        setServerError(data?.error ?? `HTTP ${res.status}`);
      }
    },
    [puzzleId, meta.editor, meta.publicationDate]
  );

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(buildDef(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildDef, meta.slug]);

  const importJson = useCallback(
    async (file: File) => {
      if (!window.confirm(t("confirmImport"))) return;
      try {
        const raw: unknown = JSON.parse(await file.text());
        const def = puzzleFileSchema.parse(raw) as PuzzleDef;
        // Rebuild the letter grid from entries so crossings are authoritative.
        const { buildGridFromEntries } = await import("@/lib/crossword/grid");
        const grid = buildGridFromEntries(def);
        setMeta((m) => ({
          ...m,
          title: def.title,
          language: def.language,
          subject: def.subject,
          topic: def.topic,
          difficulty: def.difficulty,
          author: def.author,
          editor: def.editor ?? "",
          introduction: def.introduction ?? "",
          completionMessage: def.completionMessage ?? "",
          estimatedSolveTime: def.estimatedSolveTime,
          symmetry: def.symmetry ?? false,
          width: def.width,
          height: def.height,
        }));
        setCells(cellsFromDef({ ...def, grid }));
        setEntryMeta(metaFromDef(def));
        setFactCards(def.factCards ?? []);
        setIssues(null);
      } catch (e) {
        setServerError((e as Error).message);
      }
    },
    [t]
  );

  const resize = useCallback((width: number, height: number) => {
    setMeta((m) => ({ ...m, width, height }));
    setCells((prev) =>
      Array.from({ length: height }, (_, r) =>
        Array.from(
          { length: width },
          (_, c) => prev[r]?.[c] ?? { block: true, letter: "" }
        )
      )
    );
  }, []);

  const toggleBlock = useCallback(
    (row: number, column: number) => {
      setCells((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        const target = !next[row][column].block;
        next[row][column] = { block: target, letter: "" };
        if (meta.symmetry) {
          const mr = meta.height - 1 - row;
          const mc = meta.width - 1 - column;
          if (mr !== row || mc !== column) {
            next[mr][mc] = { block: target, letter: target ? "" : next[mr][mc].letter };
          }
        }
        return next;
      });
    },
    [meta.symmetry, meta.width, meta.height]
  );

  const typeLetter = useCallback(
    (raw: string) => {
      if (!selection) return;
      const letter = normalizeLetter(raw, meta.language as PuzzleLanguage);
      if (Array.from(letter).length !== 1) return;
      setCells((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        if (!next[selection.row][selection.column].block) {
          next[selection.row][selection.column].letter = letter;
        }
        return next;
      });
      setSelection((sel) => {
        if (!sel) return sel;
        const dr = sel.direction === "down" ? 1 : 0;
        const dc = sel.direction === "across" ? 1 : 0;
        const nr = sel.row + dr;
        const nc = sel.column + dc;
        if (nr < meta.height && nc < meta.width && !cells[nr]?.[nc]?.block) {
          return { ...sel, row: nr, column: nc };
        }
        return sel;
      });
    },
    [selection, meta.language, meta.height, meta.width, cells]
  );

  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selection || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        setSelection((s) =>
          s ? { ...s, direction: s.direction === "across" ? "down" : "across" } : s
        );
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setCells((prev) => {
          const next = prev.map((r) => r.map((c) => ({ ...c })));
          if (!next[selection.row][selection.column].block) {
            next[selection.row][selection.column].letter = "";
          }
          return next;
        });
        setSelection((sel) => {
          if (!sel) return sel;
          const dr = sel.direction === "down" ? -1 : 0;
          const dc = sel.direction === "across" ? -1 : 0;
          const nr = sel.row + dr;
          const nc = sel.column + dc;
          if (nr >= 0 && nc >= 0) return { ...sel, row: nr, column: nc };
          return sel;
        });
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const horiz = rtl ? -1 : 1;
        const deltas: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -horiz],
          ArrowRight: [0, horiz],
        };
        const [dr, dc] = deltas[e.key] ?? [0, 0];
        setSelection((sel) => {
          if (!sel) return sel;
          const nr = Math.min(Math.max(sel.row + dr, 0), meta.height - 1);
          const nc = Math.min(Math.max(sel.column + dc, 0), meta.width - 1);
          return { ...sel, row: nr, column: nc };
        });
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        typeLetter(e.key);
      }
    },
    [selection, rtl, meta.height, meta.width, typeLetter]
  );

  const previewPuzzle: PlayablePuzzle | null = useMemo(() => {
    if (!previewing) return null;
    const def = buildDef();
    try {
      const result = validatePuzzle(def);
      if (!result.grid) return null;
      return {
        id: `preview-${puzzleId}`,
        slug: def.slug,
        title: def.title,
        language: def.language,
        subjectSlug: def.subject,
        subjectName,
        subjectTheme: def.subject,
        topicSlug: def.topic,
        topicName,
        difficulty: def.difficulty,
        width: def.width,
        height: def.height,
        grid: result.grid,
        entries: def.entries,
        author: def.author,
        introduction: def.introduction ?? null,
        completionMessage: def.completionMessage ?? null,
        estimatedSolveTime: def.estimatedSolveTime ?? null,
        normalization: def.normalization,
        status: def.status ?? "draft",
        factCards: (def.factCards ?? []).map((f) => ({
          text: f.text,
          sourceTitle: f.sourceTitle ?? null,
          sourceUrl: f.sourceUrl ?? null,
          reviewStatus: f.reviewStatus ?? "needs_review",
        })),
      };
    } catch {
      return null;
    }
  }, [previewing, buildDef, puzzleId, subjectName, topicName]);

  if (previewing) {
    return (
      <div>
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => setPreviewing(false)}
            className="label-caps border border-line bg-paper-bright px-3 py-1.5"
          >
            ← {t("exitPreview")}
          </button>
        </div>
        {previewPuzzle ? (
          <PlayScreen puzzle={previewPuzzle} nextPuzzle={null} preview />
        ) : (
          <p className="mt-8 border border-dashed border-wrong p-6 text-sm text-wrong">
            {t("runValidation")}
          </p>
        )}
      </div>
    );
  }

  const TABS: Array<[Tab, string]> = [
    ["grid", t("grid")],
    ["clues", t("cluesTab")],
    ["facts", t("factCards")],
    ["meta", t("metadata")],
    ["validation", t("validation")],
  ];

  const NEXT_STATUSES: Partial<Record<PuzzleStatus, PuzzleStatus[]>> = {
    draft: ["needs_review"],
    needs_review: ["in_review"],
    in_review: ["revisions_requested", "approved"],
    revisions_requested: ["needs_review"],
    approved: ["scheduled", "published"],
    scheduled: ["published"],
    published: ["archived"],
    archived: ["draft"],
  };

  const errorCount = issues?.filter((i) => i.severity === "error").length ?? 0;
  const warningCount = issues?.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="mt-8">
      <header className="flex flex-wrap items-center gap-2 border-b-2 border-line pb-3">
        <div className="me-auto">
          <p className="label-caps text-ink-faint">
            {t("title")} · {t(`statuses.${meta.status}`)}
          </p>
          <h1 className="font-display text-2xl font-semibold">{meta.title}</h1>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="label-caps border-2 border-ink bg-pink px-4 py-2 text-ink disabled:opacity-50"
        >
          {saveState === "saved" ? `✓ ${t("saved")}` : t("saveDraft")}
        </button>
        <button
          type="button"
          onClick={() => {
            runValidation();
            setTab("validation");
          }}
          className="label-caps border border-line bg-paper-bright px-3 py-2"
        >
          {t("runValidation")}
        </button>
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="label-caps border border-line bg-paper-bright px-3 py-2"
        >
          {t("preview")}
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="label-caps border border-line bg-paper-bright px-3 py-2"
        >
          {t("exportJson")}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="label-caps border border-line bg-paper-bright px-3 py-2"
        >
          {t("importJson")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importJson(file);
            e.target.value = "";
          }}
        />
        {(NEXT_STATUSES[meta.status as PuzzleStatus] ?? []).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => transition(status)}
            className="label-caps border border-accent px-3 py-2 text-accent hover:bg-accent-soft"
          >
            → {t(`statuses.${status}`)}
          </button>
        ))}
      </header>

      {serverError && (
        <p role="alert" className="mt-3 border border-wrong bg-accent-soft px-3 py-2 text-sm text-wrong">
          {serverError}
        </p>
      )}

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-line-soft">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key}
            className={`label-caps border border-b-0 px-3 py-2 ${
              tab === key
                ? "border-line bg-paper-bright text-ink"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {label}
            {key === "validation" && issues !== null && (
              <span className={errorCount > 0 ? "ms-1 text-wrong" : "ms-1 text-correct"}>
                {errorCount > 0 ? errorCount : "✓"}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "grid" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                {t("width")}
                <input
                  type="number"
                  min={3}
                  max={25}
                  value={meta.width}
                  onChange={(e) => resize(Number(e.target.value), meta.height)}
                  className="w-16 border border-line bg-paper-bright px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1 text-sm">
                {t("height")}
                <input
                  type="number"
                  min={3}
                  max={25}
                  value={meta.height}
                  onChange={(e) => resize(meta.width, Number(e.target.value))}
                  className="w-16 border border-line bg-paper-bright px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={meta.symmetry}
                  onChange={(e) => setMeta((m) => ({ ...m, symmetry: e.target.checked }))}
                />
                {t("symmetry")}
              </label>
              <button
                type="button"
                onClick={() => setBlockMode((v) => !v)}
                aria-pressed={blockMode}
                className={`label-caps border px-2 py-1 ${
                  blockMode
                    ? "border-line bg-pink text-ink"
                    : "border-line bg-paper-bright text-ink-soft"
                }`}
              >
                {blockMode ? t("blockMode") : t("letterMode")}
              </button>
            </div>

            <div
              role="grid"
              dir={rtl ? "rtl" : "ltr"}
              tabIndex={0}
              onKeyDown={blockMode ? undefined : onGridKeyDown}
              className="mx-auto w-full max-w-[520px] border-2 border-line bg-cell-block p-px focus:outline-2 focus:outline-focus"
              style={{ containerType: "inline-size" }}
            >
              {cells.map((row, r) => (
                <div
                  key={r}
                  role="row"
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${meta.width}, minmax(0,1fr))` }}
                >
                  {row.map((cell, c) => {
                    const number = numbering.numbers.get(cellKey(r, c));
                    const selected = selection?.row === r && selection?.column === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="gridcell"
                        aria-label={`r${r + 1} c${c + 1}${cell.block ? " ■" : cell.letter ? ` ${cell.letter}` : ""}`}
                        onClick={() => {
                          if (blockMode) toggleBlock(r, c);
                          else if (!cell.block) {
                            setSelection((prev) =>
                              prev && prev.row === r && prev.column === c
                                ? { ...prev, direction: prev.direction === "across" ? "down" : "across" }
                                : { row: r, column: c, direction: prev?.direction ?? "across" }
                            );
                          }
                        }}
                        className={`relative m-px flex aspect-square items-center justify-center font-semibold uppercase ${
                          cell.block
                            ? "bg-cell-block"
                            : selected
                              ? "bg-cell-active text-ink"
                              : "bg-cell text-ink"
                        }`}
                        style={{ fontSize: `${Math.min(55 / meta.width, 6)}cqw` }}
                      >
                        {number !== undefined && !cell.block && (
                          <span
                            aria-hidden
                            className="absolute top-0 start-0.5 font-normal text-ink-soft"
                            style={{ fontSize: `${Math.min(24 / meta.width, 2.4)}cqw` }}
                          >
                            {number}
                          </span>
                        )}
                        {!cell.block && cell.letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              {selection &&
                `${selection.row + 1}:${selection.column + 1} · ${tPuzzle(selection.direction)}`}
            </p>
          </div>

          <div>
            <h2 className="label-caps border-b-2 border-line pb-1">
              {t("cluesTab")}
            </h2>
            <ul className="mt-2 max-h-[480px] space-y-1 overflow-y-auto text-sm">
              {numbering.slots.map((slot) => {
                const key = `${slot.direction}:${slot.row},${slot.column}`;
                const m = entryMeta[key];
                const answer = Array.from({ length: slot.length }, (_, i) => {
                  const r = slot.direction === "down" ? slot.row + i : slot.row;
                  const c = slot.direction === "across" ? slot.column + i : slot.column;
                  return cells[r][c].letter || "·";
                }).join("");
                return (
                  <li key={key} className="dotted-rule flex items-baseline gap-2 py-1">
                    <span className="font-mono text-xs text-ink-soft">
                      {slot.number}{slot.direction === "across" ? "→" : "↓"}
                    </span>
                    <span dir={rtl ? "rtl" : "ltr"} className="font-mono">{answer}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-faint">
                      {m?.clue || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {tab === "clues" && (
        <div className="mt-4 space-y-4">
          {numbering.slots.map((slot) => {
            const key = `${slot.direction}:${slot.row},${slot.column}`;
            const m = entryMeta[key] ?? EMPTY_META;
            const answer = Array.from({ length: slot.length }, (_, i) => {
              const r = slot.direction === "down" ? slot.row + i : slot.row;
              const c = slot.direction === "across" ? slot.column + i : slot.column;
              return cells[r][c].letter || "·";
            }).join("");
            const setM = (patch: Partial<EntryMeta>) =>
              setEntryMeta((prev) => ({ ...prev, [key]: { ...m, ...patch } }));
            return (
              <fieldset key={key} className="stamp-card p-4">
                <legend className="label-caps px-1 text-accent">
                  {slot.number} {tPuzzle(slot.direction)} ·{" "}
                  <span dir={rtl ? "rtl" : "ltr"} className="font-mono text-ink">
                    {answer}
                  </span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="label-caps text-ink-soft">{t("clue")}</span>
                    <input
                      value={m.clue}
                      onChange={(e) => setM({ clue: e.target.value })}
                      className={field}
                      dir={rtl ? "rtl" : "ltr"}
                    />
                  </label>
                  <label className="block">
                    <span className="label-caps text-ink-soft">{t("clueStyle")}</span>
                    <select
                      value={m.clueStyle}
                      onChange={(e) => setM({ clueStyle: e.target.value as ClueStyle })}
                      className={field}
                    >
                      {CLUE_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {t(`clueStyles.${style}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label-caps text-ink-soft">{t("difficultyRating")}</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={m.difficultyRating ?? ""}
                      onChange={(e) =>
                        setM({
                          difficultyRating: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className={field}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="label-caps text-ink-soft">{t("alternatives")}</span>
                    <input
                      value={m.acceptedAlternatives}
                      onChange={(e) => setM({ acceptedAlternatives: e.target.value })}
                      className={field}
                      dir={rtl ? "rtl" : "ltr"}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="label-caps text-ink-soft">{t("explanation")}</span>
                    <input
                      value={m.explanation}
                      onChange={(e) => setM({ explanation: e.target.value })}
                      className={field}
                      dir={rtl ? "rtl" : "ltr"}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="label-caps text-ink-soft">{t("sourceNotes")}</span>
                    <input
                      value={m.sourceNotes}
                      onChange={(e) => setM({ sourceNotes: e.target.value })}
                      className={field}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={m.isThemeEntry}
                      onChange={(e) => setM({ isThemeEntry: e.target.checked })}
                    />
                    {t("themeEntry")}
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>
      )}

      {tab === "facts" && (
        <div className="mt-4 space-y-4">
          {factCards.map((fact, i) => (
            <fieldset key={i} className="stamp-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="label-caps text-ink-soft">{t("factText")}</span>
                  <textarea
                    value={fact.text}
                    onChange={(e) =>
                      setFactCards((prev) =>
                        prev.map((f, j) => (j === i ? { ...f, text: e.target.value } : f))
                      )
                    }
                    rows={2}
                    className={field}
                    dir={rtl ? "rtl" : "ltr"}
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-ink-soft">{t("factSourceTitle")}</span>
                  <input
                    value={fact.sourceTitle ?? ""}
                    onChange={(e) =>
                      setFactCards((prev) =>
                        prev.map((f, j) =>
                          j === i ? { ...f, sourceTitle: e.target.value || undefined } : f
                        )
                      )
                    }
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-ink-soft">{t("factSourceUrl")}</span>
                  <input
                    type="url"
                    value={fact.sourceUrl ?? ""}
                    onChange={(e) =>
                      setFactCards((prev) =>
                        prev.map((f, j) =>
                          j === i ? { ...f, sourceUrl: e.target.value || undefined } : f
                        )
                      )
                    }
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-ink-soft">{t("factStatus")}</span>
                  <select
                    value={fact.reviewStatus ?? "needs_review"}
                    onChange={(e) =>
                      setFactCards((prev) =>
                        prev.map((f, j) =>
                          j === i
                            ? { ...f, reviewStatus: e.target.value as "needs_review" | "verified" }
                            : f
                        )
                      )
                    }
                    className={field}
                  >
                    <option value="needs_review">{t("factNeedsReview")}</option>
                    <option value="verified">{t("factVerified")}</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setFactCards((prev) => prev.filter((_, j) => j !== i))}
                  className="label-caps self-end border border-line px-2 py-1.5 text-wrong"
                >
                  {t("removeFact")}
                </button>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              setFactCards((prev) => [...prev, { text: "", reviewStatus: "needs_review" }])
            }
            className="label-caps border border-line bg-paper-bright px-3 py-2"
          >
            + {t("addFact")}
          </button>
        </div>
      )}

      {tab === "meta" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="label-caps text-ink-soft">{t("titleField")}</span>
              <input
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                className={field}
                dir={rtl ? "rtl" : "ltr"}
              />
            </label>
            <label className="block">
              <span className="label-caps text-ink-soft">{t("slug")}</span>
              <input
                value={meta.slug}
                onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
                className={`${field} font-mono`}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label-caps text-ink-soft">{t("language")}</span>
                <select
                  value={meta.language}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, language: e.target.value as PuzzleLanguage }))
                  }
                  className={field}
                >
                  {(["en", "fr", "ar"] as const).map((l) => (
                    <option key={l} value={l}>
                      {tLang(l)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("difficulty")}</span>
                <select
                  value={meta.difficulty}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, difficulty: e.target.value as Difficulty }))
                  }
                  className={field}
                >
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <option key={d} value={d}>
                      {tDiff(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("subject")}</span>
                <select
                  value={meta.subject}
                  onChange={(e) => setMeta((m) => ({ ...m, subject: e.target.value }))}
                  className={field}
                >
                  {subjects.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("topic")}</span>
                <select
                  value={meta.topic}
                  onChange={(e) => setMeta((m) => ({ ...m, topic: e.target.value }))}
                  className={field}
                >
                  {topics
                    .filter((x) => x.subjectSlug === meta.subject)
                    .map((x) => (
                      <option key={x.slug} value={x.slug}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("author")}</span>
                <input
                  value={meta.author}
                  onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
                  className={field}
                />
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("editorName")}</span>
                <input
                  value={meta.editor}
                  onChange={(e) => setMeta((m) => ({ ...m, editor: e.target.value }))}
                  className={field}
                />
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("estimatedTime")}</span>
                <input
                  type="number"
                  min={60}
                  step={30}
                  value={meta.estimatedSolveTime ?? ""}
                  onChange={(e) =>
                    setMeta((m) => ({
                      ...m,
                      estimatedSolveTime: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={field}
                />
              </label>
              <label className="block">
                <span className="label-caps text-ink-soft">{t("schedule")}</span>
                <input
                  type="date"
                  value={meta.publicationDate}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, publicationDate: e.target.value }))
                  }
                  className={field}
                />
              </label>
            </div>
            <label className="block">
              <span className="label-caps text-ink-soft">{t("introduction")}</span>
              <textarea
                value={meta.introduction}
                onChange={(e) => setMeta((m) => ({ ...m, introduction: e.target.value }))}
                rows={2}
                className={field}
                dir={rtl ? "rtl" : "ltr"}
              />
            </label>
            <label className="block">
              <span className="label-caps text-ink-soft">{t("completionMessage")}</span>
              <textarea
                value={meta.completionMessage}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, completionMessage: e.target.value }))
                }
                rows={2}
                className={field}
                dir={rtl ? "rtl" : "ltr"}
              />
            </label>
          </div>

          <div>
            <h2 className="label-caps border-b-2 border-line pb-1">
              {t("checklist")}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {(
                [
                  "original",
                  "verified",
                  "difficulty",
                  "patterns",
                  "sensitivity",
                  "native",
                  "crossings",
                  "fill",
                  "theme",
                  "testSolved",
                ] as const
              ).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 inline-block size-3 border border-line" />
                  {t(`checklistItems.${item}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "validation" && (
        <div className="mt-4">
          {issues === null ? (
            <button
              type="button"
              onClick={runValidation}
              className="label-caps border-2 border-ink bg-pink px-4 py-2 text-ink"
            >
              {t("runValidation")}
            </button>
          ) : issues.length === 0 ? (
            <p className="border border-correct bg-accent-soft p-4 text-sm text-correct">
              ✓ {t("noIssues")}
            </p>
          ) : (
            <>
              <p className="label-caps mb-3 text-ink-soft">
                {t("errors", { count: errorCount })} ·{" "}
                {t("warnings", { count: warningCount })}
              </p>
              <ul className="space-y-1.5">
                {issues.map((issue, i) => (
                  <li
                    key={i}
                    className={`border-s-4 bg-paper-bright px-3 py-2 text-sm ${
                      issue.severity === "error" ? "border-wrong" : "border-revealed"
                    }`}
                  >
                    <span className="label-caps me-2 text-ink-faint">{issue.code}</span>
                    {issue.message}
                    {issue.entry && (
                      <span className="ms-1 text-ink-faint">
                        ({issue.entry.number} {tPuzzle(issue.entry.direction)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
