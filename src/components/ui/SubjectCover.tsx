import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import type { SubjectRow } from "@/lib/db/queries";

/**
 * A subject binder on the shelf: coloured spine on the leading edge, motif,
 * name and counts. Archival subjects lose the decorative flourishes via
 * `data-tone`, which the stylesheet keys off.
 */
export function SubjectCover({ subject }: { subject: SubjectRow }) {
  const t = useTranslations("subjects");

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      data-subject={subject.theme}
      data-tone={subject.tone}
      className="group relative flex h-full gap-3 overflow-hidden rounded-s-[4px] rounded-e-[16px] border-2 border-line bg-paper-bright p-4 ps-6 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-1 border-e-2 border-line bg-accent"
      />
      <span className="mt-0.5 shrink-0 text-accent">
        <SubjectMotif subject={subject.theme} className="size-8" />
      </span>
      <span className="min-w-0">
        <span className="font-display block text-base leading-snug group-hover:text-accent">
          {subject.name}
        </span>
        <span className="label-caps mt-1 block text-ink-faint">
          {t("collections", { count: subject.topicCount })}
          {subject.puzzleCount > 0 && ` · ${t("puzzles", { count: subject.puzzleCount })}`}
        </span>
      </span>
    </Link>
  );
}
