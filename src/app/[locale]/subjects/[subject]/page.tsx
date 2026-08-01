import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getSubjectBySlug,
  languagesForSubject,
  listPublishedPuzzles,
  listTopics,
} from "@/lib/db/queries";
import { MotifField, SubjectMotif } from "@/components/ui/SubjectMotif";
import { subjectThemeAttrs } from "@/lib/subject-theme";
import { EmptyForLanguage } from "@/components/ui/EmptyForLanguage";
import { PuzzleList } from "@/components/ui/PuzzleList";

export const dynamic = "force-dynamic";

const PUZZLE_LANGUAGES = ["en", "fr", "ar"];

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; subject: string }>;
  searchParams: Promise<{ language?: string }>;
}) {
  const { locale, subject: subjectSlug } = await params;
  const { language: requested } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("subjects");

  const subject = await getSubjectBySlug(subjectSlug, locale);
  if (!subject) notFound();

  // A subject is browsed in one language at a time, so "there is nothing here"
  // can be answered plainly instead of being hidden behind a filter that
  // silently matches nothing.
  const language =
    requested && PUZZLE_LANGUAGES.includes(requested)
      ? requested
      : PUZZLE_LANGUAGES.includes(locale)
        ? locale
        : "en";

  const [topics, puzzles, available] = await Promise.all([
    listTopics(locale, subjectSlug),
    listPublishedPuzzles(locale, { subjectSlug, language }),
    languagesForSubject(subjectSlug),
  ]);

  const shelfTopics = topics.filter((topic) => topic.languages.includes(language));

  return (
    /* `isolate` keeps the motif field behind the content but above the page. */
    <div {...subjectThemeAttrs(subject.theme, subject.tone)} className="relative isolate">
      <MotifField subject={subject.theme} />

      <header className="flex items-start gap-4">
        <span className="mt-1 shrink-0 text-accent">
          <SubjectMotif subject={subject.theme} className="size-12" />
        </span>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{subject.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">{subject.description}</p>
        </div>
      </header>

      {puzzles.length === 0 ? (
        <div className="mt-6">
          <EmptyForLanguage
            language={language}
            available={available}
            hrefFor={(code) => `/subjects/${subject.slug}?language=${code}`}
          />
        </div>
      ) : (
        <>
          <nav aria-label={t("topicsNav")} className="mt-6 flex flex-wrap gap-2">
            <span
              aria-current="page"
              className="label-caps inline-flex min-h-11 items-center rounded-full border-2 border-line bg-butter px-3 text-ink"
            >
              {t("allTopics")}
            </span>
            {/* Only collections with something in this language are offered. */}
            {shelfTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/subjects/${subject.slug}/${topic.slug}?language=${language}`}
                className="label-caps inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-line bg-paper-sunken px-3 text-ink-soft transition-transform duration-[120ms] hover:-translate-y-px hover:text-ink"
              >
                {topic.name}
                <span className="font-mono text-ink-faint">{topic.puzzleCount}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            <PuzzleList puzzles={puzzles} showLanguageFilter={false} />
          </div>
        </>
      )}
    </div>
  );
}
