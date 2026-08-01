"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NotebookPage, TapeStrip } from "@/components/ui/bits";
import { Sticker, stickerForSlug } from "@/components/ui/Sticker";
import { IconCheck } from "@/components/ui/Icons";
import { formatTime } from "@/lib/crossword/share";
import type { LocalAttempt } from "@/lib/progress/local";

/** One month of the journal, on its own notebook page. */
export function MonthSpread({
  month,
  attempts,
  subjectNames,
}: {
  /** `YYYY-MM` */
  month: string;
  attempts: LocalAttempt[];
  subjectNames: Record<string, string>;
}) {
  const locale = useLocale();
  const t = useTranslations("journal");
  const tResults = useTranslations("results");
  const tStickers = useTranslations("stickers");
  const tSubjects = useTranslations("subjects");

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));

  return (
    <NotebookPage className="relative py-5">
      <TapeStrip className="-top-3 end-24" rotate={4} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl capitalize">{monthLabel}</h3>
        <span className="label-caps text-ink-faint">
          {tSubjects("puzzles", { count: attempts.length })}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {attempts.map((a) => {
          const sticker = stickerForSlug(a.slug);
          return (
            <li key={a.puzzleId}>
              <Link
                href={`/play/${a.slug}`}
                className="flex min-h-11 items-center gap-2.5 rounded-card border-2 border-transparent px-2 py-1.5 transition-colors hover:border-line hover:bg-paper-sunken"
              >
                <span className="shrink-0 text-correct">
                  <IconCheck className="size-5" />
                  <span className="sr-only">{t("completed")}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-[17px]">
                    {a.title}
                  </span>
                  <span className="label-caps block text-ink-faint">
                    {subjectNames[a.subjectSlug] ?? a.subjectSlug}
                    {" · "}
                    <span className="sr-only">{tResults("time")}: </span>
                    <span className="font-mono tabular-nums">
                      {formatTime(a.elapsedSeconds)}
                    </span>
                  </span>
                </span>
                <span className="shrink-0">
                  <Sticker slug={sticker} size={42} title={tStickers(sticker)} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </NotebookPage>
  );
}
