import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { pickLocalized } from "@/lib/db/serialize";
import { languagesForTopic, listPublishedPuzzles } from "@/lib/db/queries";
import { NotebookPage, StickerLabel } from "@/components/ui/bits";
import { MotifField, SubjectMotif } from "@/components/ui/SubjectMotif";
import { subjectThemeAttrs } from "@/lib/subject-theme";
import { EmptyForLanguage } from "@/components/ui/EmptyForLanguage";
import { PuzzleList } from "@/components/ui/PuzzleList";

export const dynamic = "force-dynamic";

const PUZZLE_LANGUAGES = ["en", "fr", "ar"];

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ language?: string }>;
}) {
  const { locale, slug } = await params;
  const { language: requested } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("collections");

  const topic = await prisma.topic.findFirst({
    where: { slug },
    include: { subject: true },
  });
  if (!topic) notFound();

  // One language at a time, so an empty collection can say so plainly.
  const language =
    requested && PUZZLE_LANGUAGES.includes(requested)
      ? requested
      : PUZZLE_LANGUAGES.includes(locale)
        ? locale
        : "en";

  const [puzzles, languages] = await Promise.all([
    listPublishedPuzzles(locale, { topicSlug: slug, language }),
    languagesForTopic(slug),
  ]);
  const theme = topic.subject.theme;
  const tone = (topic.tone ?? topic.subject.tone) === "archival" ? "archival" : "playful";

  return (
    /* The binder, opened: cover material behind, notebook page in front. */
    <div {...subjectThemeAttrs(theme, tone)} className="relative isolate">
      <MotifField subject={theme} />

      <header className="flex items-start gap-4">
        <span className="mt-1 shrink-0 text-accent">
          <SubjectMotif subject={theme} className="size-10" />
        </span>
        <div className="min-w-0">
          <p className="label-caps text-accent">{pickLocalized(topic.subject.names, locale)}</p>
          <h1 className="font-display text-3xl sm:text-4xl">
            {pickLocalized(topic.names, locale)}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            {pickLocalized(topic.descriptions, locale)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StickerLabel tone="peach">
              {t("puzzleCount", { count: puzzles.length })}
            </StickerLabel>
            {languages.map((l) => (
              <StickerLabel key={l} tone="sky">
                {l.toUpperCase()}
              </StickerLabel>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6">
        {puzzles.length === 0 ? (
          <EmptyForLanguage
            language={language}
            available={languages}
            hrefFor={(code) => `/collections/${slug}?language=${code}`}
          />
        ) : (
          <NotebookPage className="py-6">
            <PuzzleList puzzles={puzzles} showLanguageFilter={false} />
          </NotebookPage>
        )}
      </div>
    </div>
  );
}
