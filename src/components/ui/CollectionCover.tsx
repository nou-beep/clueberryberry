"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Stamp } from "@/components/ui/bits";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { loadAttempts } from "@/lib/progress/local";

interface Props {
  slug: string;
  title: string;
  subjectName: string;
  /** Subject theme slug — drives --accent for this cover only. */
  subjectTheme: string;
  /** Ids of every published puzzle in the collection, for the completion mark. */
  puzzleIds: string[];
  languages?: string[];
}

/**
 * A binder cover: flat spine on the leading edge, a motif field, the title on a
 * plate, and a stamp once every puzzle inside is done. See design-system §4.
 * Completion comes from local progress, read after mount.
 */
export function CollectionCover({
  slug,
  title,
  subjectName,
  subjectTheme,
  puzzleIds,
  languages,
}: Props) {
  const t = useTranslations("collections");
  const tResults = useTranslations("results");
  const [done, setDone] = useState(0);

  useEffect(() => {
    const attempts = loadAttempts();
    setDone(
      puzzleIds.filter((id) => attempts[id]?.status === "completed").length
    );
  }, [puzzleIds]);

  const total = puzzleIds.length;
  const complete = total > 0 && done === total;

  return (
    <Link
      href={`/collections/${slug}`}
      data-subject={subjectTheme}
      className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-s-[4px] rounded-e-[16px] border-2 border-line bg-paper-bright p-4 ps-6 shadow-card transition-transform duration-[180ms] hover:-rotate-1 hover:shadow-lift"
    >
      {/* spine */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-1 border-e-2 border-line bg-accent"
      />
      {/* motif field, kept out of the text's way */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 -end-4 text-accent opacity-15"
      >
        <SubjectMotif subject={subjectTheme} className="size-24" />
      </span>

      <span className="label-caps relative text-accent">{subjectName}</span>

      <span className="relative mt-3">
        {/* the title plate */}
        <span className="font-display inline-block rounded-xl border-2 border-line bg-paper px-3 py-1.5 text-lg leading-tight text-ink ring-2 ring-white">
          {title}
        </span>
      </span>

      <span className="relative mt-3 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="label-caps block text-ink-faint">
            {t("progressLabel", { done, total })}
          </span>
          {languages && languages.length > 0 && (
            <span className="label-caps block text-ink-faint">
              {languages.map((l) => l.toUpperCase()).join(" · ")}
            </span>
          )}
        </span>
        {complete ? (
          <Stamp className="shrink-0">{tResults("completedStamp")}</Stamp>
        ) : (
          <span className="label-caps shrink-0 text-ink-soft group-hover:text-accent">
            {t("openBinder")} →
          </span>
        )}
      </span>
    </Link>
  );
}
