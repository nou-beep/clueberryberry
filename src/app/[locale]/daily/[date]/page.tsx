import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDailyPuzzles } from "@/lib/db/queries";
import { PuzzleCard } from "@/components/ui/PuzzleCard";

export const dynamic = "force-dynamic";

export default async function DailyDatePage({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}) {
  const { locale, date } = await params;
  setRequestLocale(locale);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const t = await getTranslations("daily");
  const tLang = await getTranslations("languages");
  const dailies = await getDailyPuzzles(date, locale);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="label-caps font-mono text-ink-faint">{date}</p>
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
      </header>
      <div className="mt-8">
        {dailies.length === 0 ? (
          <p className="rounded-card border-2 border-dashed border-line-soft p-8 text-center text-sm text-ink-faint">
            {t("noPuzzle")}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dailies.map((d) => (
              <li key={d.language}>
                <p className="label-caps mb-1 text-ink-faint">{tLang(d.language)}</p>
                <PuzzleCard puzzle={d.puzzle} />
              </li>
            ))}
          </ul>
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
