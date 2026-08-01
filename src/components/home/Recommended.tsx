"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHead } from "@/components/ui/bits";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { loadAttempts } from "@/lib/progress/local";
import { estimateMinutes } from "@/lib/estimate";
import type { Difficulty } from "@/lib/crossword/types";

interface IndexEntry {
  slug: string;
  title: string;
  language: string;
  difficulty: Difficulty;
  subject: string;
  topic: string;
  entryCount: number;
}

interface Pick extends IndexEntry {
  /** The subject slug that earned this recommendation, for the "because" line. */
  because: string;
}

/**
 * Recommendations built from what this player has actually done: the subjects
 * they've played most, at the difficulty they've been playing, in the language
 * they're reading the site in, minus anything they've already touched.
 *
 * If there is no history there is no recommendation — the section does not
 * render. A generic "popular puzzles" list dressed up as a personal pick is a
 * small lie, and this page is the first thing a new player reads.
 */
export function Recommended({ subjectNames }: { subjectNames: Record<string, string> }) {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [picks, setPicks] = useState<Pick[]>([]);

  useEffect(() => {
    const attempts = Object.values(loadAttempts());
    if (attempts.length === 0) return;

    // Weight subjects by how recently and how often they were played.
    const byRecency = [...attempts].sort((a, b) =>
      (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt)
    );
    const weights = new Map<string, number>();
    byRecency.forEach((attempt, position) => {
      weights.set(
        attempt.subjectSlug,
        (weights.get(attempt.subjectSlug) ?? 0) + 1 / (position + 1)
      );
    });
    const favourites = [...weights.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug);

    // The difficulty they've been choosing lately, not the one we'd like them at.
    const recentDifficulty = byRecency[0]?.difficulty ?? "easy";
    const played = new Set(attempts.map((a) => a.slug));

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/library/index?language=${locale}`);
        if (!response.ok) return;
        const data = (await response.json()) as { puzzles: IndexEntry[] };
        const candidates = data.puzzles.filter((p) => !played.has(p.slug));

        const chosen: Pick[] = [];
        const seen = new Set<string>();
        for (const subject of favourites) {
          const match =
            candidates.find(
              (p) => p.subject === subject && p.difficulty === recentDifficulty && !seen.has(p.slug)
            ) ?? candidates.find((p) => p.subject === subject && !seen.has(p.slug));
          if (match) {
            seen.add(match.slug);
            chosen.push({ ...match, because: subject });
          }
          if (chosen.length === 3) break;
        }
        if (!cancelled) setPicks(chosen);
      } catch {
        // A failed fetch means no recommendations, not an error message.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="recommended-title">
      <SectionHead id="recommended-title">{t("recommended")}</SectionHead>
      <ul className="grid gap-3 sm:grid-cols-3">
        {picks.map((pick) => (
          <li key={pick.slug}>
            <Link
              href={`/play/${pick.slug}`}
              data-subject={pick.subject}
              className="group flex h-full flex-col gap-1.5 rounded-card border-2 border-line bg-paper-bright p-3 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="flex items-center gap-2 text-accent">
                <SubjectMotif subject={pick.subject} className="size-4" />
                <span className="label-caps truncate text-ink-faint">
                  {t("recommendedWhy", {
                    subject: subjectNames[pick.because] ?? pick.because,
                  })}
                </span>
              </span>
              <span className="font-display truncate text-base group-hover:text-accent">
                {pick.title}
              </span>
              <span className="label-caps text-ink-faint">
                {t("estMinutes", {
                  minutes: estimateMinutes(pick.entryCount, pick.difficulty),
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
