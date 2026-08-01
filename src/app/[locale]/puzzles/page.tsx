import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SearchButton } from "@/components/search/SearchButton";
import { SectionHead, StickerLabel } from "@/components/ui/bits";
import { SubjectCover } from "@/components/ui/SubjectCover";
import { CollectionCover } from "@/components/ui/CollectionCover";
import { PuzzleCard } from "@/components/ui/PuzzleCard";
import { FilteredPuzzleGrid } from "@/components/ui/FilteredPuzzleGrid";
import { LibraryFilters } from "@/components/ui/LibraryFilters";
import { currentUserId } from "@/lib/auth";
import {
  libraryFacets,
  listDailyHistory,
  listLibraryPuzzles,
  listNewestPuzzles,
  listPopularPuzzles,
  listSavedPuzzles,
  listSubjects,
  listTopics,
  puzzleCountsBySubjectLanguage,
  suggestNearMatches,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

const FILTER_KEYS = [
  "language",
  "subject",
  "topic",
  "difficulty",
  "size",
  "time",
  "origin",
  "status",
  "sort",
  "q",
] as const;

type Search = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

/**
 * The Puzzles hub — one destination for finding something to solve
 * (docs/information-architecture.md). Search sits at the top, then shelves.
 *
 * Two rules run through the whole page. Filters live in the URL and are applied
 * on the server, so a filtered view is a link. And a section with nothing in it
 * for the active language is not rendered at all, rather than rendered empty.
 */
export default async function PuzzlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("library");
  const tSections = await getTranslations("sections");

  // The active language: whatever was asked for, otherwise the interface one.
  const language = search.language ?? (["en", "fr", "ar"].includes(locale) ? locale : "en");
  const filtering = FILTER_KEYS.some(
    (key) => key !== "language" && (search[key] ?? "") !== ""
  );

  const facets = await libraryFacets(locale, search.language);

  if (filtering) {
    const { rows, popularityAvailable } = await listLibraryPuzzles(locale, {
      language: search.language,
      subject: search.subject,
      topic: search.topic,
      difficulty: search.difficulty,
      size: search.size,
      time: search.time,
      origin: search.origin,
      sort: search.sort,
    });
    const near = rows.length === 0 ? await suggestNearMatches(locale, search.subject ?? "") : [];

    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("resultCount", { count: rows.length })}</p>
        </header>
        <LibraryFilters facets={{ ...facets, popularityAvailable }} />
        <FilteredPuzzleGrid
          rows={rows}
          status={search.status}
          emptyMessage={t("noMatches")}
        />
        {rows.length === 0 && (
          <div className="rounded-card border-2 border-dashed border-line-soft p-6">
            {near.length > 0 && (
              <>
                <p className="text-sm text-ink-soft">{t("tryInstead")}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {near.map((item) => (
                    <li key={`${item.kind}-${item.slug}`}>
                      <Link
                        href={
                          item.kind === "subject"
                            ? `/subjects/${item.slug}`
                            : `/collections/${item.slug}`
                        }
                        className="label-caps inline-flex min-h-11 items-center rounded-full border-2 border-line-soft bg-paper px-3 text-ink-soft hover:text-ink"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-sm text-ink-soft">{t("makeItYourself")}</p>
            <Link
              href="/playground/new"
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
            >
              {t("makeItLink")}
            </Link>
          </div>
        )}
      </div>
    );
  }

  const userId = await currentUserId();
  const [subjects, topics, countsBySubject, daily, newest, popular, saved] =
    await Promise.all([
      listSubjects(locale),
      listTopics(locale),
      puzzleCountsBySubjectLanguage(),
      listDailyHistory(locale, undefined, 8),
      listNewestPuzzles(locale, language, 6),
      listPopularPuzzles(locale, language, 6),
      userId ? listSavedPuzzles(locale, userId, language) : Promise.resolve([]),
    ]);

  // A subject or collection with nothing in the active language is left off the
  // shelf entirely — see the detail pages for what a direct visit says instead.
  const shelfSubjects = subjects.filter(
    (subject) => (countsBySubject[subject.slug]?.[language] ?? 0) > 0
  );
  const shelfCollections = topics
    .filter((topic) => topic.languages.includes(language))
    .slice(0, 6);
  const dailyForLanguage = daily.filter((row) => row.language === language);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("intro")}</p>
      </header>

      <section
        aria-labelledby="puzzles-search"
        className="rounded-card border-2 border-line bg-paper-bright p-4 shadow-card sm:p-5"
      >
        <h2 id="puzzles-search" className="font-display text-[19px]">
          {t("searchTitle")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{t("searchNote")}</p>
        <div className="mt-3">
          <SearchButton size="large" />
        </div>
      </section>

      <section aria-labelledby="puzzles-filters">
        <SectionHead id="puzzles-filters">{t("filters.title")}</SectionHead>
        <LibraryFilters facets={facets} />
      </section>

      {shelfSubjects.length > 0 && (
        <section aria-labelledby="puzzles-subjects">
          <SectionHead id="puzzles-subjects">{t("browseBySubject")}</SectionHead>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shelfSubjects.map((subject) => (
              <li key={subject.slug}>
                <SubjectCover subject={subject} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-soft">
            {tSections("learnNote")}
          </p>
        </section>
      )}

      {shelfCollections.length > 0 && (
        <section aria-labelledby="puzzles-collections">
          <SectionHead id="puzzles-collections">{t("featuredCollections")}</SectionHead>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shelfCollections.map((topic) => (
              <li key={`${topic.subjectSlug}-${topic.slug}`}>
                <CollectionCover
                  slug={topic.slug}
                  title={topic.name}
                  subjectName={topic.subjectName}
                  subjectTheme={topic.subjectTheme}
                  puzzleIds={[]}
                  languages={topic.languages}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {dailyForLanguage.length > 0 && (
        <section aria-labelledby="puzzles-daily">
          <SectionHead id="puzzles-daily">{t("dailyArchive")}</SectionHead>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dailyForLanguage.map((row) => (
              <li key={`${row.date}-${row.language}`}>
                <Link
                  href={`/daily/${row.date}`}
                  className="flex min-h-11 items-baseline gap-3 rounded-card border-2 border-line-soft bg-paper-bright px-3 py-2 hover:border-line"
                >
                  <span className="label-caps shrink-0 font-mono text-accent">{row.date}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{row.puzzle.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {newest.length > 0 && (
        <section aria-labelledby="puzzles-newest">
          <SectionHead id="puzzles-newest">{t("newest")}</SectionHead>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newest.map((row) => (
              <li key={row.id}>
                <PuzzleCard puzzle={row} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* "Popular" is attempt counts and nothing else. With no attempts
          recorded the section does not exist rather than showing an order the
          data cannot justify. */}
      {popular.length > 0 && (
        <section aria-labelledby="puzzles-popular">
          <SectionHead id="puzzles-popular">{t("popular")}</SectionHead>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((row) => (
              <li key={row.id} className="relative">
                <PuzzleCard puzzle={row} />
                <span className="mt-1 block">
                  <StickerLabel tone="sky">
                    {t("attempts", { count: row.attempts })}
                  </StickerLabel>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="puzzles-saved">
          <SectionHead id="puzzles-saved">{t("favourites")}</SectionHead>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((row) => (
              <li key={row.id}>
                <PuzzleCard puzzle={row} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
