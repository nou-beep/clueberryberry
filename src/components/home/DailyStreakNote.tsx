"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TapeStrip } from "@/components/ui/bits";
import { computeStats, loadAttempts } from "@/lib/progress/local";
import { toDateString } from "@/lib/crossword/streak";

/** A small taped-down note about the current streak. Never scolds. */
export function DailyStreakNote() {
  const t = useTranslations("daily");
  const tLanding = useTranslations("landing");
  const [streak, setStreak] = useState(0);
  const [doneToday, setDoneToday] = useState(false);

  useEffect(() => {
    const today = toDateString(new Date());
    const stats = computeStats(loadAttempts(), today);
    setStreak(stats.streak);
    setDoneToday(stats.completedDailyDates.includes(today));
  }, []);

  if (streak === 0 && !doneToday) return null;

  return (
    <p className="relative mx-auto mt-5 w-fit rounded-card border-2 border-line bg-paper-bright px-4 py-2 text-center text-sm shadow-card">
      <TapeStrip className="-top-3 start-1/2 -ms-8" width={64} />
      <span className="label-caps text-ink-faint">{t("streak")}</span>{" "}
      <span className="font-mono">{tLanding("streakDays", { count: streak })}</span>
      {doneToday && (
        <span className="ms-2 text-correct">✓ {t("completedToday")}</span>
      )}
    </p>
  );
}
