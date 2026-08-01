import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreationStrip } from "@/components/playground/CreationStrip";
import { currentUserId } from "@/lib/auth";
import { PRESET_IDS, type PresetId } from "@/lib/playground/presets";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return { title: t("create.title") };
}

/**
 * The creation strip. Generation runs in the browser from the curated banks, so
 * this page only needs to know whether there is an account to save to.
 */
export default async function NewPlaygroundPuzzlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preset?: string; source?: string }>;
}) {
  const { locale } = await params;
  const { preset, source } = await searchParams;
  setRequestLocale(locale);

  const userId = await currentUserId();
  const initialPreset = PRESET_IDS.includes(preset as PresetId)
    ? (preset as PresetId)
    : undefined;

  return (
    <CreationStrip
      signedIn={userId !== null}
      initialPreset={initialPreset}
      initialSource={source === "notes" ? "notes" : undefined}
    />
  );
}
