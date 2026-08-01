import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import { PlayScreen } from "@/components/game/PlayScreen";
import { currentUserId } from "@/lib/auth";
import { toPlayable } from "@/lib/playground/definition";
import { getShared } from "@/lib/playground/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const record = await getShared(slug);
  const t = await getTranslations({ locale, namespace: "playground" });
  return {
    title: record ? `${record.title} — ${t("title")}` : t("title"),
    // A shared link is for the people it was sent to, not for search engines.
    robots: { index: false, follow: false },
  };
}

/**
 * A Playground puzzle someone shared by link.
 *
 * Anyone holding the link can solve it; nobody can edit it. It is labelled a
 * Playground puzzle throughout and is never listed with the reviewed library.
 */
export default async function SharedPlaygroundPuzzlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  const record = await getShared(slug);
  if (!record) notFound();

  const userId = await currentUserId();
  const puzzle = toPlayable(record.definition, record.id);
  const mine = userId !== null && userId === record.ownerId;

  return (
    <div className="space-y-5">
      <header>
        <p className="label-caps text-accent">{t("shared.label")}</p>
        <h1 className="font-display text-3xl sm:text-4xl">{record.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StickerLabel tone="lavender">{t("notOfficial")}</StickerLabel>
          <span className="text-sm text-ink-soft">{t("shared.note")}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {mine && <GlossyLink href={`/playground/${record.id}`}>{t("shared.manage")}</GlossyLink>}
          <GlossyLink href="/playground" variant={mine ? "secondary" : "primary"}>
            {t("shared.makeYourOwn")}
          </GlossyLink>
        </div>
      </header>

      <div data-subject={puzzle.subjectTheme}>
        <PlayScreen key={puzzle.id} puzzle={puzzle} nextPuzzle={null} preview />
      </div>
    </div>
  );
}
