"use client";

import { useTranslations } from "next-intl";
import type { EntryDef } from "@/lib/crossword/types";
import { IconChevron } from "@/components/ui/Icons";

interface Props {
  entry: EntryDef | null;
  rtl: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function ActiveClueBar({ entry, rtl, onPrev, onNext }: Props) {
  const t = useTranslations("game");
  const tp = useTranslations("puzzle");
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-line bg-butter/50 shadow-card">
      <button
        type="button"
        onClick={onPrev}
        aria-label={t("prevClue")}
        className="flex min-h-11 w-11 shrink-0 items-center justify-center border-e-2 border-line text-ink-soft active:bg-paper-sunken"
      >
        <IconChevron className="size-5" flip={!rtl} />
      </button>
      <div aria-live="polite" className="min-w-0 flex-1 px-3 py-2">
        {entry && (
          <>
            <span className="label-caps text-ink-soft">
              {entry.number} {tp(entry.direction)}
            </span>
            <p className="text-[15px] font-medium leading-snug text-ink">{entry.clue}</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label={t("nextClue")}
        className="flex min-h-11 w-11 shrink-0 items-center justify-center border-s-2 border-line text-ink-soft active:bg-paper-sunken"
      >
        <IconChevron className="size-5" flip={rtl} />
      </button>
    </div>
  );
}
