import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getTopicBySlug,
  languagesForTopic,
  listPublishedPuzzles,
  listTopics,
} from "@/lib/db/queries";
import { MotifField } from "@/components/ui/SubjectMotif";
import { subjectThemeAttrs } from "@/lib/subject-theme";
import { EmptyForLanguage } from "@/components/ui/EmptyForLanguage";
import { PuzzleList } from "@/components/ui/PuzzleList";

export const dynamic = "force-dynamic";

const PUZZLE_LANGUAGES = ["en", "fr", "ar"];

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; subject: string; topic: string }>;
  searchParams: Promise<{ language?: string }>;
}) {
  const { locale, subject: subjectSlug, topic: topicSlug } = await params;
  const { language: requested } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("subjects");

  const topic = await getTopicBySlug(subjectSlug, topicSlug, locale);
  if (!topic) notFound();

  const language =
    requested && PUZZLE_LANGUAGES.includes(requested)
      ? requested
      : PUZZLE_LANGUAGES.includes(locale)
        ? locale
        : "en";

  const [siblings, puzzles, available] = await Promise.all([
    listTopics(locale, subjectSlug),
    listPublishedPuzzles(locale, { subjectSlug, topicSlug, language }),
    languagesForTopic(topicSlug),
  ]);

  return (
    <div {...subjectThemeAttrs(topic.theme, topic.tone)} className="relative isolate">
      <MotifField subject={topic.theme} />

      <header>
        <p className="label-caps text-accent">
          <Link href={`/subjects/${topic.subjectSlug}`} className="hover:underline">
            ← {topic.subjectName}
          </Link>
        </p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">{topic.name}</h1>
        {topic.description && (
          <p className="mt-1 max-w-xl text-sm text-ink-soft">{topic.description}</p>
        )}
      </header>

      <nav aria-label={t("topicsNav")} className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/subjects/${topic.subjectSlug}`}
          className="label-caps inline-flex min-h-11 items-center rounded-full border-2 border-line bg-paper-sunken px-3 text-ink-soft transition-transform duration-[120ms] hover:-translate-y-px hover:text-ink"
        >
          {t("allTopics")}
        </Link>
        {/* Siblings with nothing in this language are left off the row. */}
        {siblings
          .filter(
            (sibling) => sibling.slug === topic.slug || sibling.languages.includes(language)
          )
          .map((sibling) => {
          const current = sibling.slug === topic.slug;
          return (
            <Link
              key={sibling.slug}
              href={`/subjects/${topic.subjectSlug}/${sibling.slug}?language=${language}`}
              aria-current={current ? "page" : undefined}
              className={`label-caps inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-line px-3 transition-transform duration-[120ms] ${
                current
                  ? "bg-butter text-ink"
                  : "bg-paper-sunken text-ink-soft hover:-translate-y-px hover:text-ink"
              }`}
            >
              {current && <span aria-hidden>✓</span>}
              {sibling.name}
              <span className="font-mono text-ink-faint">{sibling.puzzleCount}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {puzzles.length === 0 ? (
          <EmptyForLanguage
            language={language}
            available={available}
            hrefFor={(code) =>
              `/subjects/${topic.subjectSlug}/${topic.slug}?language=${code}`
            }
          />
        ) : (
          <PuzzleList puzzles={puzzles} showLanguageFilter={false} />
        )}
      </div>
    </div>
  );
}
