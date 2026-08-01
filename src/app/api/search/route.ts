import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { TAXONOMY } from "@/content/taxonomy/index";
import { foldForSearch, matches, score } from "@/lib/search/query";
import { rateLimit } from "@/lib/rate-limit";

/**
 * One search endpoint behind the global overlay. It answers across everything a
 * player can reach — subjects, collections, puzzles, live rooms, creators and
 * shared Playground puzzles — so search never needs a page of its own.
 *
 * Groups with no hits are omitted rather than returned empty, and a group whose
 * underlying feature has no data yet simply never appears. The overlay renders
 * exactly what comes back, so it cannot advertise something that isn't there.
 */

const LOCALES = ["en", "fr", "ar"] as const;
type Locale = (typeof LOCALES)[number];

export interface SearchHit {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  /** Subject slug, so the overlay can tint the row with the subject accent. */
  subject?: string;
  badge?: string;
}

const PER_GROUP = 5;

/** Drops the internal relevance score before a hit goes over the wire. */
function stripScore(hit: SearchHit & { _s: number }): SearchHit {
  const { _s, ...rest } = hit;
  void _s;
  return rest;
}

export async function GET(request: Request) {
  // Unauthenticated and it touches the database, so it gets a budget.
  const limited = rateLimit(request, "search", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const raw = (url.searchParams.get("q") ?? "").slice(0, 80);
  const localeParam = url.searchParams.get("locale");
  const locale: Locale = LOCALES.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : "en";

  const q = foldForSearch(raw);
  if (q.length < 2) return NextResponse.json({ groups: [] });

  // Subjects and collections come from the taxonomy module rather than the
  // database: names are localized JSON blobs that SQLite cannot search, and the
  // whole taxonomy is a few hundred rows held in memory anyway.
  const subjects: Array<SearchHit & { _s: number }> = [];
  const collections: Array<SearchHit & { _s: number }> = [];

  for (const subject of TAXONOMY) {
    const name = subject.names[locale];
    if (matches(name, q) || matches(subject.names.en, q) || matches(subject.slug, q)) {
      subjects.push({
        _s: score(name, q),
        id: `subject:${subject.slug}`,
        label: name,
        sublabel: subject.descriptions[locale],
        href: `/subjects/${subject.slug}`,
        subject: subject.theme,
      });
    }
    for (const collection of subject.collections) {
      const cName = collection.names[locale];
      if (
        matches(cName, q) ||
        matches(collection.names.en, q) ||
        matches(collection.slug, q)
      ) {
        collections.push({
          _s: score(cName, q),
          id: `collection:${collection.slug}`,
          label: cName,
          sublabel: name,
          href: `/collections/${collection.slug}`,
          subject: subject.theme,
        });
      }
    }
  }

  const [puzzleRows, roomRows, creatorRows, playgroundRows] = await Promise.all([
    prisma.puzzle.findMany({
      where: { status: "published", title: { contains: raw.trim() } },
      select: {
        slug: true,
        title: true,
        language: true,
        difficulty: true,
        subject: { select: { slug: true, theme: true, names: true } },
      },
      take: 24,
    }),
    prisma.multiplayerRoom.findMany({
      where: {
        visibility: "public",
        endedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ code: { contains: raw.trim() } }, { puzzle: { title: { contains: raw.trim() } } }],
      },
      select: {
        code: true,
        voiceEnabled: true,
        puzzle: { select: { title: true, language: true, subject: { select: { theme: true } } } },
        _count: { select: { participants: true } },
      },
      take: PER_GROUP,
    }),
    prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: foldForSearch(raw) } },
          { displayName: { contains: raw.trim() } },
        ],
      },
      select: { username: true, usernameDisplay: true, displayName: true },
      take: PER_GROUP,
    }),
    prisma.playgroundPuzzle.findMany({
      where: {
        visibility: "public",
        title: { contains: raw.trim() },
        shareSlug: { not: null },
      },
      select: { shareSlug: true, title: true, language: true, subject: true },
      take: PER_GROUP,
    }),
  ]);

  const puzzles: SearchHit[] = puzzleRows
    .map((p) => {
      let subjectName = p.subject.slug;
      try {
        subjectName = (JSON.parse(p.subject.names) as Record<string, string>)[locale] ?? subjectName;
      } catch {
        // A malformed name blob shouldn't take the search box down with it.
      }
      return {
        id: `puzzle:${p.slug}`,
        label: p.title,
        sublabel: subjectName,
        href: `/play/${p.slug}`,
        subject: p.subject.theme,
        badge: `${p.language.toUpperCase()} · ${p.difficulty}`,
        _s: score(p.title, q),
      };
    })
    .sort((a, b) => a._s - b._s)
    .slice(0, PER_GROUP)
    .map(stripScore);

  const rooms: SearchHit[] = roomRows.map((r) => ({
    id: `room:${r.code}`,
    label: r.puzzle.title,
    sublabel: r.code,
    href: `/rooms/${r.code}`,
    subject: r.puzzle.subject.theme,
    badge: `${r._count.participants} · ${r.puzzle.language.toUpperCase()}${r.voiceEnabled ? " · 🎙" : ""}`,
  }));

  const creators: SearchHit[] = creatorRows.map((c) => ({
    id: `creator:${c.username}`,
    label: c.displayName,
    sublabel: `@${c.usernameDisplay}`,
    href: `/profile/${c.username}`,
  }));

  const playground: SearchHit[] = playgroundRows.map((p) => ({
    id: `playground:${p.shareSlug}`,
    label: p.title,
    sublabel: p.subject,
    href: `/playground/shared/${p.shareSlug}`,
    badge: p.language.toUpperCase(),
  }));

  const strip = (list: Array<SearchHit & { _s: number }>): SearchHit[] =>
    list
      .sort((a, b) => a._s - b._s || a.label.localeCompare(b.label))
      .slice(0, PER_GROUP)
      .map(stripScore);

  const groups = [
    { key: "subjects", hits: strip(subjects) },
    { key: "collections", hits: strip(collections) },
    { key: "puzzles", hits: puzzles },
    { key: "rooms", hits: rooms },
    { key: "creators", hits: creators },
    { key: "playground", hits: playground },
  ].filter((group) => group.hits.length > 0);

  return NextResponse.json({ groups });
}
