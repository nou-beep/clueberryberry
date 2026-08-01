import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SavedCreation } from "@/components/playground/SavedCreation";
import { currentUserId } from "@/lib/auth";
import { PLAYGROUND_THEMES, type PlaygroundTheme } from "@/lib/playground/banks";
import { getOwned } from "@/lib/playground/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const userId = await currentUserId();
  const record = userId ? await getOwned(id, userId) : null;
  const t = await getTranslations({ locale, namespace: "playground" });
  return { title: record ? `${record.title} — ${t("title")}` : t("title") };
}

/** One of the player's own saved puzzles. Owner-checked before anything renders. */
export default async function SavedPlaygroundPuzzlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const userId = await currentUserId();
  if (!userId) redirect(`/${locale}/account/sign-in`);

  const record = await getOwned(id, userId);
  if (!record) notFound();

  const stored = record.definition.theme;
  const theme = PLAYGROUND_THEMES.includes(stored as PlaygroundTheme)
    ? (stored as PlaygroundTheme)
    : null;

  return (
    <SavedCreation
      id={record.id}
      seed={record.seed}
      theme={theme}
      initialDefinition={record.definition}
      initialVisibility={record.visibility}
      initialShareSlug={record.shareSlug}
    />
  );
}
