import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getDailyPuzzles, listPublishedPuzzles, listSubjects } from "@/lib/db/queries";
import { toDateString } from "@/lib/crossword/streak";
import { estimateMinutes } from "@/lib/estimate";
import { Window } from "@/components/ui/Window";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { SectionHead, StickerLabel } from "@/components/ui/bits";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { Greeting } from "@/components/home/Greeting";
import { ContinueStrip } from "@/components/home/ContinueStrip";
import { LiveRooms } from "@/components/home/LiveRooms";
import { Recommended } from "@/components/home/Recommended";
import { IconCalendar, IconClock } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

/**
 * Home answers one question — "what should I play right now?" — and then stops.
 *
 * Six sections, in this order, and no more: greeting, today's puzzle, continue,
 * live rooms, recommended, recently added. Browsing lives in Puzzles; anything
 * personal lives in Profile. See docs/information-architecture.md.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tLang = await getTranslations("languages");
  const tDiff = await getTranslations("difficulty");

  const today = toDateString(new Date());
  const [session, dailies, allPuzzles, subjects] = await Promise.all([
    auth(),
    getDailyPuzzles(today, locale),
    listPublishedPuzzles(locale),
    listSubjects(locale),
  ]);

  // The greeting only uses a real profile name; guests are greeted without one.
  const profile = session?.user?.id
    ? await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { displayName: true },
      })
    : null;

  const daily = dailies.find((d) => d.language === locale) ?? dailies[0];
  const dailyEntryCount = daily
    ? await prisma.entry.count({ where: { puzzleId: daily.puzzle.id } })
    : 0;

  // Only the language being read. Mixing languages here reads as a bug, and
  // the rule against silent fallback cuts both ways: an English reader should
  // not be handed French puzzles either.
  const recentlyAdded = allPuzzles
    .filter((p) => p.language === locale)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const subjectNames = Object.fromEntries(subjects.map((s) => [s.slug, s.name]));

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="pt-1">
        <Greeting name={profile?.displayName.split(" ")[0]} />
      </header>

      {/* 1 · Today. The largest, most pressable thing on the page, by a margin. */}
      {daily && (
        <section aria-labelledby="today-title" data-subject={daily.puzzle.subjectSlug}>
          <Window
            title={t("todaysPuzzle")}
            icon={<IconCalendar className="size-4" />}
            action={<span className="label-caps font-mono text-ink-faint">{today}</span>}
            static
          >
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StickerLabel tone="accent">{daily.puzzle.subjectName}</StickerLabel>
                  <StickerLabel tone="butter">{tDiff(daily.puzzle.difficulty)}</StickerLabel>
                  <StickerLabel tone="sky">{tLang(daily.language)}</StickerLabel>
                </div>
                <h2 id="today-title" className="font-display mt-3 text-3xl sm:text-5xl">
                  {daily.puzzle.title}
                </h2>
                <p className="label-caps mt-2 flex items-center gap-1.5 text-ink-faint">
                  <IconClock className="size-4" />
                  {t("estMinutes", {
                    minutes: estimateMinutes(dailyEntryCount, daily.puzzle.difficulty),
                  })}
                  <span aria-hidden>·</span>
                  {daily.puzzle.topicName}
                </p>
              </div>
              {/* The one primary button on this screen. */}
              <GlossyLink
                href={`/play/${daily.puzzle.slug}`}
                variant="primary"
                className="shrink-0 px-8 text-lg"
              >
                {t("play")} →
              </GlossyLink>
            </div>
          </Window>
        </section>
      )}

      {/* 2 · Continue — at most three, and only real in-progress attempts. */}
      <ContinueStrip />

      {/* 3 · Live rooms — omitted entirely when nobody is playing. */}
      <LiveRooms locale={locale} />

      {/* 4 · Recommended — omitted entirely for a player with no history. */}
      <Recommended subjectNames={subjectNames} />

      {/* 5 · Recently added, and then the page ends. */}
      {recentlyAdded.length > 0 && (
        <section aria-labelledby="recent-title">
          <SectionHead
            id="recent-title"
            action={
              <Link href="/puzzles" className="label-caps text-pink-deep hover:underline">
                {t("seeAll")} →
              </Link>
            }
          >
            {t("recentlyAdded")}
          </SectionHead>
          <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {recentlyAdded.map((puzzle) => (
              <li key={puzzle.id} className="w-52 shrink-0 snap-start">
                <Link
                  href={`/play/${puzzle.slug}`}
                  data-subject={puzzle.subjectTheme}
                  className="group flex h-full flex-col gap-1.5 rounded-card border-2 border-line bg-paper-bright p-3 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="flex items-center gap-2 text-accent">
                    <SubjectMotif subject={puzzle.subjectTheme} className="size-4" />
                    <span className="label-caps truncate text-ink-faint">
                      {puzzle.subjectName}
                    </span>
                  </span>
                  <span className="font-display truncate text-base group-hover:text-accent">
                    {puzzle.title}
                  </span>
                  <span className="label-caps text-ink-faint">
                    {tDiff(puzzle.difficulty)} · {tLang(puzzle.language)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
