import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDailyPuzzles } from "@/lib/db/queries";
import { toDateString } from "@/lib/crossword/streak";
import { Window } from "@/components/ui/Window";
import { SectionHead } from "@/components/ui/bits";
import { PuzzleCard } from "@/components/ui/PuzzleCard";
import { DailyStreakNote } from "@/components/home/DailyStreakNote";
import { IconCalendar } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

export default async function DailyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("daily");
  const tLang = await getTranslations("languages");

  const today = toDateString(new Date());
  const dailies = await getDailyPuzzles(today, locale);
  const mine = dailies.find((d) => d.language === locale);
  const others = dailies.filter((d) => d !== mine);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="label-caps font-mono text-ink-faint">{today}</p>
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("intro")}</p>
      </header>

      <DailyStreakNote />

      <div className="mt-8 space-y-6">
        {!mine && others.length === 0 && (
          <p className="rounded-card border-2 border-dashed border-line-soft p-8 text-center text-sm text-ink-faint">
            {t("noPuzzle")}
          </p>
        )}
        {mine && (
          <div data-subject={mine.puzzle.subjectSlug}>
            <Window title={t("today")} icon={<IconCalendar className="size-4" />} static>
              <div className="p-4">
                <PuzzleCard puzzle={mine.puzzle} />
              </div>
            </Window>
          </div>
        )}
        {others.length > 0 && (
          <section aria-labelledby="other-editions">
            <SectionHead id="other-editions">{t("otherLanguages")}</SectionHead>
            <ul className="grid gap-4 sm:grid-cols-2">
              {others.map((d) => (
                <li key={d.language}>
                  <p className="label-caps mb-1 text-ink-faint">{tLang(d.language)}</p>
                  <PuzzleCard puzzle={d.puzzle} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="mt-8 text-center">
        <Link href="/archive" className="label-caps text-pink-deep hover:underline">
          {t("archiveLink")} →
        </Link>
      </p>
    </div>
  );
}
