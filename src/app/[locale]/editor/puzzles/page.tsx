import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db/prisma";
import { pickLocalized } from "@/lib/db/serialize";
import { PuzzleRowActions } from "@/components/editor/PuzzleRowActions";
import { notFound } from "next/navigation";
import { currentUserIsConstructor } from "@/lib/auth/constructors";
export const dynamic = "force-dynamic";
const STATUS_ORDER = [
  "draft",
  "needs_review",
  "in_review",
  "revisions_requested",
  "approved",
  "scheduled",
  "published",
  "archived",
];
export default async function EditorPuzzlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!(await currentUserIsConstructor())) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("editor");
  const tLang = await getTranslations("languages");
  const tDiff = await getTranslations("difficulty");
  const puzzles = await prisma.puzzle.findMany({
    include: { subject: true, topic: true },
    orderBy: [{ updatedAt: "desc" }],
  });
  const sorted = [...puzzles].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
  return (
    <div>
      <header className="mt-10 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("intro")}</p>
        </div>
        <Link
          href="/editor/puzzles/new"
          className="label-caps border-2 border-ink bg-pink px-4 py-2 text-ink"
        >
          {t("newPuzzle")}
        </Link>
      </header>
      {sorted.length === 0 ? (
        <p className="mt-8 border border-dashed border-line p-8 text-center text-sm text-ink-faint">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-line text-start">
                <th className="label-caps py-2 pe-3 text-start">{t("titleField")}</th>
                <th className="label-caps py-2 pe-3 text-start">{t("language")}</th>
                <th className="label-caps py-2 pe-3 text-start">{t("subject")}</th>
                <th className="label-caps py-2 pe-3 text-start">{t("difficulty")}</th>
                <th className="label-caps py-2 pe-3 text-start">{t("status")}</th>
                <th className="label-caps py-2 text-start">{t("author")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-line-soft align-baseline">
                  <td className="py-2 pe-3">
                    <Link
                      href={`/editor/puzzles/${p.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {p.title}
                    </Link>
                    <span className="label-caps ms-2 text-ink-faint">
                      {p.gridWidth}×{p.gridHeight}
                    </span>
                  </td>
                  <td className="py-2 pe-3">{tLang(p.language)}</td>
                  <td className="py-2 pe-3">
                    {pickLocalized(p.subject.names, locale)} ·{" "}
                    {pickLocalized(p.topic.names, locale)}
                  </td>
                  <td className="py-2 pe-3">{tDiff(p.difficulty)}</td>
                  <td className="py-2 pe-3">
                    <span className="label-caps border border-line px-1.5 py-0.5">
                      {t(`statuses.${p.status}`)}
                    </span>
                  </td>
                  <td className="py-2">{p.author}</td>
                  <td className="py-2 text-end">
                    <PuzzleRowActions puzzleId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}