"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { Stamp, StickerLabel } from "@/components/ui/bits";
import { Sticker, stickerForSlug } from "@/components/ui/Sticker";
import { formatTime, shareText } from "@/lib/crossword/share";
import type { AttemptGridState, Grid } from "@/lib/crossword/types";
import type { PlayablePuzzle } from "@/lib/db/serialize";

interface Props {
  open: boolean;
  onClose: () => void;
  puzzle: PlayablePuzzle;
  state: AttemptGridState;
  grid: Grid;
  elapsed: number;
  mistakes: number;
  hintsUsed: number;
  showTimer: boolean;
  nextPuzzle: { slug: string; title: string } | null;
  /** Playground puzzles award nothing and are not journalled. */
  preview?: boolean;
}

/**
 * The quiet completion: a stamp lands, a sticker drops in, the facts from the
 * puzzle's own notes appear. No confetti, no fanfare.
 */
export function ResultsDialog({
  open,
  onClose,
  puzzle,
  state,
  grid,
  elapsed,
  mistakes,
  hintsUsed,
  showTimer,
  nextPuzzle,
  preview = false,
}: Props) {
  const t = useTranslations("results");
  const tShare = useTranslations("share");
  const tApp = useTranslations("app");
  const tDiff = useTranslations("difficulty");
  const tStickers = useTranslations("stickers");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const sticker = stickerForSlug(puzzle.slug);
  const openCells = grid.flat().filter((c) => c !== null).length;
  const aided = state.cells.flat().filter((c) => c.flags.includes("revealed")).length;
  const unaidedPct =
    openCells === 0 ? 0 : Math.round(((openCells - aided) / openCells) * 100);

  const buildShare = () =>
    shareText({
      appName: tApp("name"),
      title: puzzle.title,
      subjectName: puzzle.subjectName,
      language: puzzle.language,
      difficultyLabel: tDiff(puzzle.difficulty),
      timeLabel: showTimer ? formatTime(elapsed) : null,
      hintsUsed,
      hintsLabel: tShare("hints"),
      noHintsLabel: tShare("noHints"),
      grid,
      state,
    });

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const onShare = async () => {
    const text = buildShare();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fall through to the clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    flash();
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(buildShare());
    flash();
  };

  const stats: Array<[string, string]> = [
    ...(showTimer ? ([[t("time"), formatTime(elapsed)]] as Array<[string, string]>) : []),
    [t("mistakes"), String(mistakes)],
    [t("hintsUsed"), String(hintsUsed)],
    [t("unaided"), `${unaidedPct}%`],
  ];

  return (
    <Modal open={open} onClose={onClose} labelledBy="results-title" closeLabel={t("keepGoing")}>
      <div data-subject={puzzle.subjectSlug}>
        {/* pe-12 keeps the stamp clear of the dialog's close button */}
        <div className="flex flex-col gap-2 pe-12 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="label-caps text-accent">
              {puzzle.subjectName} · {puzzle.topicName} · {tDiff(puzzle.difficulty)}
            </p>
            <h2 id="results-title" className="font-display mt-0.5 text-2xl">
              {puzzle.title}
            </h2>
          </div>
          <Stamp animate className="shrink-0 self-start sm:mt-1">
            {t("completedStamp")}
          </Stamp>
        </div>

        {puzzle.completionMessage && (
          <p className="mt-2 border-s-4 border-accent bg-paper-sunken/60 ps-3 pe-2 py-1.5 text-sm italic text-ink-soft">
            {puzzle.completionMessage}
          </p>
        )}

        {/* The sticker earned — one per puzzle, deterministic, never random. */}
        {!preview && (
          <div className="mt-4 flex items-center gap-3 rounded-card border-2 border-line bg-butter/40 p-3">
            <Sticker slug={sticker} size={56} dropIn title={tStickers(sticker)} />
            <div className="min-w-0">
              <p className="label-caps text-ink-soft">{t("stickerEarned")}</p>
              <p className="font-display text-lg leading-tight">{tStickers(sticker)}</p>
            </div>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-card border-2 border-line bg-paper-bright p-2 text-center"
            >
              <dt className="label-caps text-ink-faint">{label}</dt>
              <dd className="mt-0.5 font-mono text-lg tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {puzzle.factCards.length > 0 && (
          <section className="mt-5">
            <h3 className="label-caps flex items-center gap-1.5 border-b-2 border-line pb-1 text-ink">
              <span aria-hidden className="block size-2 rotate-45 bg-mint" />
              {t("whatYouLearned")}
            </h3>
            <ul className="mt-2 space-y-2">
              {puzzle.factCards.map((fact, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-soft">
                  {fact.text}
                  {fact.sourceTitle && (
                    <span className="ms-1 text-xs text-ink-faint">
                      — {t("source")}: {fact.sourceTitle}
                    </span>
                  )}
                  {fact.reviewStatus !== "verified" && (
                    <StickerLabel tone="peach" className="ms-2 align-middle" tilt={false}>
                      {t("needsVerification")}
                    </StickerLabel>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <GlossyButton variant="primary" onClick={onShare}>
            {t("share")}
          </GlossyButton>
          <GlossyButton onClick={onCopy}>{copied ? t("copied") : t("copy")}</GlossyButton>
          {nextPuzzle && (
            <GlossyLink href={`/play/${nextPuzzle.slug}`} className="ms-auto">
              {t("nextPuzzle")} →
            </GlossyLink>
          )}
        </div>

        <p aria-live="polite" className="sr-only">
          {copied ? t("copied") : ""}
        </p>
        <p className="label-caps mt-4 text-ink-faint">
          {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date())}
        </p>
      </div>
    </Modal>
  );
}
