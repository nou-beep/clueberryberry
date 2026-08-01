import { prisma } from "./prisma";
import { pickLocalized, toPlayablePuzzle, type PlayablePuzzle } from "./serialize";
import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import type { Tone } from "@/content/taxonomy/types";

/**
 * Tones are stored as strings for SQLite portability; narrow them here so the
 * rest of the app works with the domain type and unknown values degrade to the
 * safe default rather than leaking through.
 */
function asTone(value: string | null | undefined): Tone {
  return value === "archival" ? "archival" : "playful";
}

/** Lightweight index row used by browsing pages and client-side progress joins. */
export interface PuzzleIndexRow {
  id: string;
  slug: string;
  title: string;
  language: PuzzleLanguage;
  subjectSlug: string;
  subjectName: string;
  subjectTheme: string;
  /** Drives how decorated the card is allowed to be. */
  tone: Tone;
  topicSlug: string;
  topicName: string;
  difficulty: Difficulty;
  width: number;
  height: number;
  entryCount: number;
  estimatedSolveTime: number | null;
  origin: string;
  featured: boolean;
  /** Used by the homepage's "recently added" carousel. */
  createdAt: Date;
}

const puzzleIndexInclude = {
  subject: true,
  topic: true,
  _count: { select: { entries: true } },
} as const;

type PuzzleForIndex = Awaited<
  ReturnType<typeof prisma.puzzle.findMany<{ include: typeof puzzleIndexInclude }>>
>[number];

function toIndexRow(p: PuzzleForIndex, locale: string): PuzzleIndexRow {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    language: p.language as PuzzleLanguage,
    subjectSlug: p.subject.slug,
    subjectName: pickLocalized(p.subject.names, locale),
    subjectTheme: p.subject.theme,
    tone: asTone(p.topic.tone ?? p.subject.tone),
    topicSlug: p.topic.slug,
    topicName: pickLocalized(p.topic.names, locale),
    difficulty: p.difficulty as Difficulty,
    width: p.gridWidth,
    height: p.gridHeight,
    entryCount: p._count.entries,
    createdAt: p.createdAt,
    estimatedSolveTime: p.estimatedSolveTime,
    origin: p.origin,
    featured: p.featured,
  };
}

export async function listPublishedPuzzles(
  locale: string,
  where: { subjectSlug?: string; topicSlug?: string; language?: string } = {}
): Promise<PuzzleIndexRow[]> {
  const puzzles = await prisma.puzzle.findMany({
    where: {
      status: "published",
      ...(where.subjectSlug ? { subject: { slug: where.subjectSlug } } : {}),
      ...(where.topicSlug ? { topic: { slug: where.topicSlug } } : {}),
      ...(where.language ? { language: where.language } : {}),
    },
    include: puzzleIndexInclude,
    orderBy: [{ subjectId: "asc" }, { topicId: "asc" }, { difficulty: "asc" }],
  });
  return puzzles.map((p) => toIndexRow(p, locale));
}

export async function getPlayablePuzzle(
  idOrSlug: string,
  locale: string
): Promise<PlayablePuzzle | null> {
  const puzzle = await prisma.puzzle.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { entries: true, subject: true, topic: true, factCards: true },
  });
  if (!puzzle) return null;
  return toPlayablePuzzle(puzzle, locale);
}

/** A published puzzle from the same topic (then subject), excluding one slug. */
export async function getNextPuzzle(
  current: { subjectId: string; topicId: string; slug: string; language: string },
  locale: string
): Promise<{ slug: string; title: string } | null> {
  const sameTopic = await prisma.puzzle.findFirst({
    where: {
      status: "published",
      topicId: current.topicId,
      language: current.language,
      slug: { not: current.slug },
    },
  });
  if (sameTopic) return { slug: sameTopic.slug, title: sameTopic.title };
  const sameSubject = await prisma.puzzle.findFirst({
    where: {
      status: "published",
      subjectId: current.subjectId,
      slug: { not: current.slug },
      language: current.language,
    },
  });
  if (sameSubject) return { slug: sameSubject.slug, title: sameSubject.title };
  const any = await prisma.puzzle.findFirst({
    where: { status: "published", slug: { not: current.slug }, language: current.language },
  });
  void locale;
  return any ? { slug: any.slug, title: any.title } : null;
}

export interface SubjectRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  theme: string;
  section: string;
  tone: Tone;
  topicCount: number;
  puzzleCount: number;
}

export async function listSubjects(locale: string): Promise<SubjectRow[]> {
  const subjects = await prisma.subject.findMany({
    where: { status: "active" },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { topics: true } },
      puzzles: { where: { status: "published" }, select: { id: true } },
    },
  });
  return subjects.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: pickLocalized(s.names, locale),
    description: pickLocalized(s.descriptions, locale),
    theme: s.theme,
    section: s.section,
    tone: asTone(s.tone),
    topicCount: s._count.topics,
    puzzleCount: s.puzzles.length,
  }));
}

export interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjectSlug: string;
  subjectName: string;
  subjectTheme: string;
  tone: Tone;
  puzzleCount: number;
  languages: string[];
}

export async function listTopics(
  locale: string,
  subjectSlug?: string
): Promise<TopicRow[]> {
  const topics = await prisma.topic.findMany({
    where: {
      status: "active",
      ...(subjectSlug ? { subject: { slug: subjectSlug } } : {}),
    },
    orderBy: { order: "asc" },
    include: {
      subject: true,
      puzzles: { where: { status: "published" }, select: { language: true } },
    },
  });
  return topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: pickLocalized(t.names, locale),
    description: pickLocalized(t.descriptions, locale),
    subjectSlug: t.subject.slug,
    subjectName: pickLocalized(t.subject.names, locale),
    subjectTheme: t.subject.theme,
    tone: asTone(t.tone ?? t.subject.tone),
    puzzleCount: t.puzzles.length,
    languages: [...new Set(t.puzzles.map((p) => p.language))],
  }));
}

export async function getSubjectBySlug(slug: string, locale: string) {
  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) return null;
  return {
    id: subject.id,
    slug: subject.slug,
    name: pickLocalized(subject.names, locale),
    description: pickLocalized(subject.descriptions, locale),
    theme: subject.theme,
    section: subject.section,
    tone: asTone(subject.tone),
  };
}

export async function getTopicBySlug(
  subjectSlug: string,
  topicSlug: string,
  locale: string
) {
  const topic = await prisma.topic.findFirst({
    where: { slug: topicSlug, subject: { slug: subjectSlug } },
    include: { subject: true },
  });
  if (!topic) return null;
  return {
    id: topic.id,
    slug: topic.slug,
    name: pickLocalized(topic.names, locale),
    description: pickLocalized(topic.descriptions, locale),
    subjectSlug: topic.subject.slug,
    subjectName: pickLocalized(topic.subject.names, locale),
    theme: topic.subject.theme,
    tone: asTone(topic.tone ?? topic.subject.tone),
  };
}

export async function getDailyPuzzles(date: string, locale: string) {
  const rows = await prisma.dailyPuzzle.findMany({
    where: { date },
    include: {
      puzzle: { include: { subject: true, topic: true, _count: { select: { entries: true } } } },
    },
  });
  return rows.map((row) => ({
    date: row.date,
    language: row.language as PuzzleLanguage,
    puzzle: toIndexRow(row.puzzle, locale),
  }));
}

export async function listDailyHistory(locale: string, before?: string, limit = 60) {
  const rows = await prisma.dailyPuzzle.findMany({
    where: before ? { date: { lte: before } } : {},
    orderBy: { date: "desc" },
    take: limit,
    include: {
      puzzle: { include: { subject: true, topic: true, _count: { select: { entries: true } } } },
    },
  });
  return rows.map((row) => ({
    date: row.date,
    language: row.language as PuzzleLanguage,
    puzzle: toIndexRow(row.puzzle, locale),
  }));
}

/* ————————————————————————————————————————————————————————————————
   Library organisation and search
   ———————————————————————————————————————————————————————————————— */

export interface SectionGroup {
  section: string;
  subjects: SubjectRow[];
}

/**
 * Subjects grouped into the library's shelves so the browser can show a few
 * sections rather than every category at once. Section membership is data,
 * read from the database.
 */
export async function listSubjectsBySection(
  locale: string
): Promise<SectionGroup[]> {
  const subjects = await listSubjects(locale);
  const order = ["learn", "know", "culture", "fandom"];
  const groups = new Map<string, SubjectRow[]>();
  for (const subject of subjects) {
    const list = groups.get(subject.section);
    if (list) list.push(subject);
    else groups.set(subject.section, [subject]);
  }
  return [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([section, list]) => ({ section, subjects: list }));
}

export interface SearchResults {
  query: string;
  subjects: SubjectRow[];
  collections: TopicRow[];
  puzzles: PuzzleIndexRow[];
}

/**
 * Search the whole library. Localized names live in JSON blobs, so matching
 * happens in memory over the (small, cacheable) subject and collection lists;
 * puzzle titles are matched in the database.
 */
export async function searchLibrary(
  locale: string,
  rawQuery: string,
  options: { language?: string; limit?: number } = {}
): Promise<SearchResults> {
  const query = rawQuery.trim();
  const limit = options.limit ?? 40;
  if (query.length < 2) {
    return { query, subjects: [], collections: [], puzzles: [] };
  }

  // Fold case and Latin accents so "genetique" finds "Génétique".
  const fold = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const needle = fold(query);
  const matches = (value: string) => fold(value).includes(needle);

  const [allSubjects, allCollections, puzzles] = await Promise.all([
    listSubjects(locale),
    listTopics(locale),
    prisma.puzzle.findMany({
      where: {
        status: "published",
        ...(options.language ? { language: options.language } : {}),
        title: { contains: query },
      },
      include: puzzleIndexInclude,
      take: limit,
    }),
  ]);

  return {
    query,
    subjects: allSubjects.filter((s) => matches(s.name) || matches(s.slug)),
    collections: allCollections.filter(
      (c) => matches(c.name) || matches(c.slug) || matches(c.subjectName)
    ),
    puzzles: puzzles.map((p) => toIndexRow(p, locale)),
  };
}

/** Featured puzzles for the front page, newest first. */
export async function listFeaturedPuzzles(
  locale: string,
  language?: string,
  limit = 6
): Promise<PuzzleIndexRow[]> {
  const puzzles = await prisma.puzzle.findMany({
    where: {
      status: "published",
      featured: true,
      ...(language ? { language } : {}),
    },
    include: puzzleIndexInclude,
    orderBy: { publicationDate: "desc" },
    take: limit,
  });
  return puzzles.map((p) => toIndexRow(p, locale));
}

/* ————————————————————————————————————————————————————————————————
   Discovery: URL-driven filters, language completeness, popularity
   ———————————————————————————————————————————————————————————————— */

/** Grid-size bands. The boundaries match the Playground's own size specs. */
export const LIBRARY_SIZES = ["small", "medium", "large"] as const;
export type LibrarySize = (typeof LIBRARY_SIZES)[number];

/** Estimated-solve-time bands, in seconds. */
export const LIBRARY_TIMES = ["short", "medium", "long"] as const;
export type LibraryTime = (typeof LIBRARY_TIMES)[number];

export const LIBRARY_SORTS = ["new", "popular", "title"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export function sizeBandOf(row: { width: number; height: number }): LibrarySize {
  const largest = Math.max(row.width, row.height);
  if (largest <= 11) return "small";
  if (largest <= 13) return "medium";
  return "large";
}

/** null when a puzzle carries no estimate — such a row is never claimed to fit a band. */
export function timeBandOf(seconds: number | null): LibraryTime | null {
  if (seconds === null) return null;
  if (seconds <= 300) return "short";
  if (seconds <= 900) return "medium";
  return "long";
}

export interface LibraryFilters {
  language?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  size?: string;
  time?: string;
  origin?: string;
  sort?: string;
}

export interface LibraryResult {
  rows: PuzzleIndexRow[];
  /** Attempts recorded per puzzle id. Empty when nothing has been played yet. */
  attempts: Record<string, number>;
  /**
   * True only when at least one attempt exists. "Popular" is offered to the
   * player exclusively when it can be answered from real play data.
   */
  popularityAvailable: boolean;
}

/**
 * Real attempt counts per puzzle. This is the only definition of "popular" in
 * the application: how many attempts the database has actually recorded. When
 * the table is empty the map is empty and every caller hides the option rather
 * than inventing an order.
 */
export async function attemptCountsByPuzzle(): Promise<Record<string, number>> {
  const grouped = await prisma.puzzleAttempt.groupBy({
    by: ["puzzleId"],
    _count: { puzzleId: true },
  });
  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.puzzleId] = row._count.puzzleId;
  return counts;
}

/**
 * The filters that cannot be expressed in SQL: the size and time bands are
 * derived from stored columns, and the popularity order comes from a separate
 * count. Kept pure and exported so the rules are testable without a database.
 */
export function applyDerivedFilters(
  rows: PuzzleIndexRow[],
  filters: LibraryFilters,
  attempts: Record<string, number>,
  locale = "en"
): PuzzleIndexRow[] {
  let out = rows;
  if (filters.size) out = out.filter((row) => sizeBandOf(row) === filters.size);
  if (filters.time) {
    out = out.filter((row) => timeBandOf(row.estimatedSolveTime) === filters.time);
  }
  if (filters.sort === "title") {
    out = out.slice().sort((a, b) => a.title.localeCompare(b.title, locale));
  } else if (filters.sort === "popular" && Object.keys(attempts).length > 0) {
    // Popularity is attempt counts and nothing else. With no attempts recorded
    // the requested order is ignored rather than approximated.
    out = out
      .slice()
      .sort(
        (a, b) =>
          (attempts[b.id] ?? 0) - (attempts[a.id] ?? 0) ||
          a.title.localeCompare(b.title, locale)
      );
  }
  return out;
}

/**
 * The filtered library. Everything that can be answered in SQL is; the rest
 * goes through `applyDerivedFilters` above.
 */
export async function listLibraryPuzzles(
  locale: string,
  filters: LibraryFilters = {}
): Promise<LibraryResult> {
  const [puzzles, attempts] = await Promise.all([
    prisma.puzzle.findMany({
      where: {
        status: "published",
        ...(filters.language ? { language: filters.language } : {}),
        ...(filters.subject ? { subject: { slug: filters.subject } } : {}),
        ...(filters.topic ? { topic: { slug: filters.topic } } : {}),
        ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
        ...(filters.origin ? { origin: filters.origin } : {}),
      },
      include: puzzleIndexInclude,
      orderBy: [{ publicationDate: "desc" }, { title: "asc" }],
    }),
    attemptCountsByPuzzle(),
  ]);

  const rows = applyDerivedFilters(
    puzzles.map((p) => toIndexRow(p, locale)),
    filters,
    attempts,
    locale
  );
  return { rows, attempts, popularityAvailable: Object.keys(attempts).length > 0 };
}

export interface LibraryFacets {
  languages: string[];
  subjects: Array<{ slug: string; name: string }>;
  difficulties: string[];
  sizes: LibrarySize[];
  times: LibraryTime[];
  origins: string[];
  popularityAvailable: boolean;
}

/**
 * The filter options that would actually return something. A value with no
 * puzzles behind it is not offered — a filter that can only produce an empty
 * page is a control that does nothing.
 */
export async function libraryFacets(
  locale: string,
  language?: string
): Promise<LibraryFacets> {
  const [puzzles, attempts, subjects] = await Promise.all([
    prisma.puzzle.findMany({
      where: { status: "published" },
      select: {
        language: true,
        difficulty: true,
        origin: true,
        gridWidth: true,
        gridHeight: true,
        estimatedSolveTime: true,
        subject: { select: { slug: true } },
      },
    }),
    attemptCountsByPuzzle(),
    listSubjects(locale),
  ]);

  const scoped = language ? puzzles.filter((p) => p.language === language) : puzzles;
  const nameBySlug = new Map(subjects.map((s) => [s.slug, s.name]));
  const uniq = <T>(values: T[]) => [...new Set(values)];

  return {
    languages: uniq(puzzles.map((p) => p.language)).sort(),
    subjects: uniq(scoped.map((p) => p.subject.slug))
      .map((slug) => ({ slug, name: nameBySlug.get(slug) ?? slug }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
    difficulties: ["easy", "medium", "hard"].filter((value) =>
      scoped.some((p) => p.difficulty === value)
    ),
    sizes: LIBRARY_SIZES.filter((band) =>
      scoped.some((p) => sizeBandOf({ width: p.gridWidth, height: p.gridHeight }) === band)
    ),
    times: LIBRARY_TIMES.filter((band) =>
      scoped.some((p) => timeBandOf(p.estimatedSolveTime) === band)
    ),
    origins: uniq(scoped.map((p) => p.origin)).sort(),
    popularityAvailable: Object.keys(attempts).length > 0,
  };
}

/** Newest published puzzles in one language. */
export async function listNewestPuzzles(
  locale: string,
  language?: string,
  limit = 6
): Promise<PuzzleIndexRow[]> {
  const puzzles = await prisma.puzzle.findMany({
    where: { status: "published", ...(language ? { language } : {}) },
    include: puzzleIndexInclude,
    orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return puzzles.map((p) => toIndexRow(p, locale));
}

/**
 * The most-attempted puzzles, from recorded attempts only. Returns an empty
 * list when nothing has been played — never a stand-in ordering.
 */
export async function listPopularPuzzles(
  locale: string,
  language?: string,
  limit = 6
): Promise<Array<PuzzleIndexRow & { attempts: number }>> {
  const grouped = await prisma.puzzleAttempt.groupBy({
    by: ["puzzleId"],
    _count: { puzzleId: true },
    orderBy: { _count: { puzzleId: "desc" } },
    take: limit * 3,
  });
  if (grouped.length === 0) return [];

  const puzzles = await prisma.puzzle.findMany({
    where: {
      id: { in: grouped.map((row) => row.puzzleId) },
      status: "published",
      ...(language ? { language } : {}),
    },
    include: puzzleIndexInclude,
  });
  const counts = new Map(grouped.map((row) => [row.puzzleId, row._count.puzzleId]));
  return puzzles
    .map((p) => ({ ...toIndexRow(p, locale), attempts: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, limit);
}

/** Puzzles this account has bookmarked. */
export async function listSavedPuzzles(
  locale: string,
  userId: string,
  language?: string
): Promise<PuzzleIndexRow[]> {
  const rows = await prisma.savedPuzzle.findMany({
    where: {
      userId,
      puzzle: { status: "published", ...(language ? { language } : {}) },
    },
    orderBy: { savedAt: "desc" },
    include: { puzzle: { include: puzzleIndexInclude } },
  });
  return rows.map((row) => toIndexRow(row.puzzle, locale));
}

/** How many published puzzles each language holds, per subject slug. */
export async function puzzleCountsBySubjectLanguage(): Promise<
  Record<string, Record<string, number>>
> {
  const rows = await prisma.puzzle.findMany({
    where: { status: "published" },
    select: { language: true, subject: { select: { slug: true } } },
  });
  const counts: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const bucket = (counts[row.subject.slug] ??= {});
    bucket[row.language] = (bucket[row.language] ?? 0) + 1;
  }
  return counts;
}

/** The languages a subject actually has published puzzles in. */
export async function languagesForSubject(subjectSlug: string): Promise<string[]> {
  const rows = await prisma.puzzle.findMany({
    where: { status: "published", subject: { slug: subjectSlug } },
    select: { language: true },
    distinct: ["language"],
  });
  return rows.map((row) => row.language).sort();
}

/** The languages a collection actually has published puzzles in. */
export async function languagesForTopic(topicSlug: string): Promise<string[]> {
  const rows = await prisma.puzzle.findMany({
    where: { status: "published", topic: { slug: topicSlug } },
    select: { language: true },
    distinct: ["language"],
  });
  return rows.map((row) => row.language).sort();
}

export interface NearMatch {
  kind: "subject" | "collection";
  slug: string;
  name: string;
  /** Where the name matched: a shared prefix, or a shared word. */
  reason: "prefix" | "word";
}

/**
 * Near matches for a query that found nothing.
 *
 * Deliberately conservative: a shared opening or a shared whole word, both
 * accent-folded. It suggests categories that exist rather than guessing at what
 * the player meant.
 */
export async function suggestNearMatches(
  locale: string,
  rawQuery: string,
  limit = 6
): Promise<NearMatch[]> {
  const fold = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const needle = fold(rawQuery.trim());
  if (needle.length < 3) return [];
  const stem = needle.slice(0, Math.max(3, Math.floor(needle.length * 0.6)));
  const words = needle.split(/\s+/).filter((word) => word.length >= 3);

  const [subjects, collections] = await Promise.all([
    listSubjects(locale),
    listTopics(locale),
  ]);

  const out: NearMatch[] = [];
  const consider = (
    kind: NearMatch["kind"],
    slug: string,
    name: string,
    count: number
  ) => {
    if (count === 0) return;
    const folded = fold(name);
    if (folded.startsWith(stem) || fold(slug).startsWith(stem)) {
      out.push({ kind, slug, name, reason: "prefix" });
      return;
    }
    if (words.some((word) => folded.includes(word))) {
      out.push({ kind, slug, name, reason: "word" });
    }
  };

  for (const subject of subjects) {
    consider("subject", subject.slug, subject.name, subject.puzzleCount);
  }
  for (const collection of collections) {
    consider("collection", collection.slug, collection.name, collection.puzzleCount);
  }
  return out.slice(0, limit);
}
