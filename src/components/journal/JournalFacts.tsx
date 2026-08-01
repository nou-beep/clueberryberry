"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Window } from "@/components/ui/Window";
import { StickerLabel } from "@/components/ui/bits";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { IconBinder, IconCalendar, IconStar } from "@/components/ui/Icons";
import { formatTime } from "@/lib/crossword/share";
import type { ProgressStats } from "@/lib/progress/local";

interface Props {
  stats: ProgressStats;
  /** Completed puzzles finished with no hints at all. */
  noHints: number;
  favoriteSubject: { slug: string; solved: number } | null;
  recentCollection: { topicSlug: string; subjectSlug: string } | null;
  subjectNames: Record<string, string>;
  topicNames: Record<string, string>;
}

/** A small pinned note: one fact, one glyph, no percentages. */
function Note({
  label,
  icon,
  children,
  subject,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  subject?: string;
}) {
  return (
    <div
      data-subject={subject}
      className="rounded-card border-2 border-line bg-paper-bright p-3 shadow-card"
    >
      <p className="label-caps flex items-center gap-1.5 text-ink-faint">
        <span aria-hidden className="text-accent">
          {icon}
        </span>
        {label}
      </p>
      <div className="mt-1.5 font-display text-xl">{children}</div>
    </div>
  );
}

export function JournalFacts({
  stats,
  noHints,
  favoriteSubject,
  recentCollection,
  subjectNames,
  topicNames,
}: Props) {
  const t = useTranslations("journal");
  const tLanding = useTranslations("landing");
  const tLang = useTranslations("languages");
  const tDiff = useTranslations("difficulty");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Note label={t("streak")} icon={<IconCalendar className="size-4" />}>
          {tLanding("streakDays", { count: stats.streak })}
        </Note>

        {favoriteSubject && (
          <Note
            label={t("favoriteSubject")}
            icon={<IconStar className="size-4" />}
            subject={favoriteSubject.slug}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="shrink-0 text-accent">
                <SubjectMotif subject={favoriteSubject.slug} className="size-6" />
              </span>
              <span className="min-w-0 truncate">
                {subjectNames[favoriteSubject.slug] ?? favoriteSubject.slug}
              </span>
            </span>
          </Note>
        )}

        {recentCollection && (
          <Note
            label={t("recentCollection")}
            icon={<IconBinder className="size-4" />}
            subject={recentCollection.subjectSlug}
          >
            <Link
              href={`/collections/${recentCollection.topicSlug}`}
              className="inline-flex min-h-11 items-center underline decoration-line-soft decoration-2 underline-offset-4 hover:decoration-accent"
            >
              {topicNames[recentCollection.topicSlug] ?? recentCollection.topicSlug}
            </Link>
          </Note>
        )}
      </div>

      <Window title={t("totals")} static>
        <dl className="grid grid-cols-1 divide-y-2 divide-line-soft sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
          {[
            [t("solved"), String(stats.solved)],
            [
              t("averageTime"),
              stats.averageSeconds !== null ? formatTime(stats.averageSeconds) : "—",
            ],
            [t("noHints"), String(noHints)],
          ].map(([label, value]) => (
            <div key={label} className="p-3 text-center">
              <dt className="label-caps text-ink-faint">{label}</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-3 border-t-2 border-line-soft p-3 sm:grid-cols-2">
          <div>
            <p className="label-caps text-ink-faint">{t("byLanguage")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(["en", "fr", "ar"] as const)
                .filter((l) => (stats.byLanguage[l]?.solved ?? 0) > 0)
                .map((l) => (
                  <li key={l}>
                    <StickerLabel tone="pink">
                      {tLang(l)} · {stats.byLanguage[l]?.solved ?? 0}
                    </StickerLabel>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="label-caps text-ink-faint">{t("byDifficulty")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(["easy", "medium", "hard"] as const)
                .filter((d) => (stats.byDifficulty[d]?.solved ?? 0) > 0)
                .map((d) => (
                  <li key={d}>
                    <StickerLabel tone="butter">
                      {tDiff(d)} · {stats.byDifficulty[d]?.solved ?? 0}
                    </StickerLabel>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </Window>
    </div>
  );
}
