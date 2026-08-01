"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PuzzleIndexRow } from "@/lib/db/queries";
import { loadAttempt } from "@/lib/progress/local";
import { Stamp, StickerLabel } from "@/components/ui/bits";
import { Sticker, stickerForSlug } from "@/components/ui/Sticker";

/**
 * A small collectible card for one puzzle. Completion state comes from local
 * progress, read after mount so server rendering stays deterministic.
 */
export function PuzzleCard({ puzzle }: { puzzle: PuzzleIndexRow }) {
  const t = useTranslations("puzzle");
  const tDiff = useTranslations("difficulty");
  const tLang = useTranslations("languages");
  const tResults = useTranslations("results");
  const [status, setStatus] = useState<"none" | "in_progress" | "completed">("none");

  useEffect(() => {
    const attempt = loadAttempt(puzzle.id);
    if (attempt) setStatus(attempt.status === "completed" ? "completed" : "in_progress");
  }, [puzzle.id]);

  const completed = status === "completed";

  return (
    <Link
      href={`/play/${puzzle.slug}`}
      data-subject={puzzle.subjectSlug}
      className="group relative flex h-full flex-col gap-2 overflow-hidden rounded-card border-2 border-line bg-paper-bright p-4 ps-5 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5 hover:shadow-lift"
    >
      {/* subject accent stripe on the leading edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-1.5 bg-accent"
      />

      <div className="flex items-start justify-between gap-2">
        <span className="label-caps min-w-0 text-accent">
          {puzzle.subjectName} · {puzzle.topicName}
        </span>
        {completed ? (
          <Sticker
            slug={stickerForSlug(puzzle.slug)}
            size={36}
            className="-mt-1 shrink-0"
          />
        ) : (
          status === "in_progress" && (
            <span className="label-caps shrink-0 text-revealed">… {t("inProgress")}</span>
          )
        )}
      </div>

      <h3 className="font-display text-lg leading-snug group-hover:text-accent">
        {puzzle.title}
      </h3>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <StickerLabel tone="butter">{tDiff(puzzle.difficulty)}</StickerLabel>
        <StickerLabel tone="mint">
          {puzzle.width}×{puzzle.height}
        </StickerLabel>
        <StickerLabel tone="sky">{tLang(puzzle.language)}</StickerLabel>
        <span className="label-caps text-ink-faint">
          {t("entries", { count: puzzle.entryCount })}
        </span>
      </div>

      {completed && (
        <Stamp className="mt-1 self-start">{tResults("completedStamp")}</Stamp>
      )}
    </Link>
  );
}
