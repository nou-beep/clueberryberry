"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  collectStickers,
  computeStats,
  groupByMonth,
  loadAttempts,
  type LocalAttempt,
  type ProgressStats,
} from "@/lib/progress/local";
import { fetchAccountProgress } from "@/lib/progress/sync";
import { stickerForSlug } from "@/components/ui/Sticker";
import { toDateString } from "@/lib/crossword/streak";
import { SectionHead } from "@/components/ui/bits";
import { EmptyJournal } from "./EmptyJournal";
import { JournalFacts } from "./JournalFacts";
import { MonthSpread } from "./MonthSpread";
import { StickerSheetPanel } from "./StickerSheetPanel";

interface Props {
  subjectNames: Record<string, string>;
  topicNames: Record<string, string>;
  /** Signed in: the journal reads the account, not just this browser. */
  signedIn?: boolean;
}

interface JournalData {
  months: Array<{ month: string; attempts: LocalAttempt[] }>;
  stats: ProgressStats;
  counts: Record<string, number>;
  noHints: number;
  favoriteSubject: { slug: string; solved: number } | null;
  recentCollection: { topicSlug: string; subjectSlug: string } | null;
  /** Where these numbers came from, so the footnote can say so honestly. */
  source: "local" | "account";
}

function read(
  attempts: Record<string, LocalAttempt> = loadAttempts(),
  serverStickerCounts: Record<string, number> | null = null,
  source: JournalData["source"] = "local"
): JournalData {
  const stats = computeStats(attempts, toDateString(new Date()));
  const done = Object.values(attempts).filter((a) => a.status === "completed");
  const favorite = Object.entries(stats.bySubject).sort(
    (a, b) => b[1].solved - a[1].solved
  )[0];
  const latest = stats.recent[0];
  return {
    months: groupByMonth(attempts),
    stats,
    // Server stickers are the truth when signed in; derive them locally only
    // for guests, so nothing is counted twice.
    counts: serverStickerCounts ?? collectStickers(attempts, stickerForSlug).counts,
    noHints: done.filter((a) => a.hintsUsed === 0).length,
    favoriteSubject: favorite ? { slug: favorite[0], solved: favorite[1].solved } : null,
    recentCollection: latest
      ? { topicSlug: latest.topicSlug, subjectSlug: latest.subjectSlug }
      : null,
    source,
  };
}

/**
 * A scrapbook of what was actually solved. Guests see the attempts stored in
 * this browser; signed-in players see their account, stickers included, so the
 * journal is the same on every device. Nothing here is estimated.
 */
export function JournalClient({ subjectNames, topicNames, signedIn = false }: Props) {
  const t = useTranslations("journal");
  const [data, setData] = useState<JournalData | null>(null);

  useEffect(() => {
    // Show this browser's copy immediately, then replace it with the account's
    // once it arrives. If the account cannot be read, the local view stands.
    setData(read());
    if (!signedIn) return;
    let cancelled = false;
    void fetchAccountProgress().then((progress) => {
      if (cancelled || !progress) return;
      setData(read(progress.attempts, progress.stickerCounts, "account"));
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!data) {
    return (
      <div
        aria-hidden
        className="mt-6 h-64 rounded-[20px] border-2 border-dashed border-line-soft bg-paper-sunken"
      />
    );
  }

  if (data.stats.solved === 0) {
    return (
      <div className="mt-6 space-y-6">
        <EmptyJournal />
        <StickerSheetPanel counts={{}} />
        <p className="label-caps text-ink-faint">
          {data.source === "account" ? t("thisIsSynced") : t("thisIsLocal")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <JournalFacts
        stats={data.stats}
        noHints={data.noHints}
        favoriteSubject={data.favoriteSubject}
        recentCollection={data.recentCollection}
        subjectNames={subjectNames}
        topicNames={topicNames}
      />

      <section aria-labelledby="journal-months">
        <SectionHead id="journal-months">{t("completed")}</SectionHead>
        <div className="space-y-6">
          {data.months.map((m) => (
            <MonthSpread
              key={m.month}
              month={m.month}
              attempts={m.attempts}
              subjectNames={subjectNames}
            />
          ))}
        </div>
      </section>

      <StickerSheetPanel counts={data.counts} />

      <p className="label-caps text-ink-faint">
        {data.source === "account" ? t("thisIsSynced") : t("thisIsLocal")}
      </p>
    </div>
  );
}
