import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { SectionHead, StickerLabel } from "@/components/ui/bits";
import { CreationsList } from "@/components/playground/CreationsList";
import { DraftCard } from "@/components/playground/DraftCard";
import { currentUserId } from "@/lib/auth";
import { presetsFor } from "@/lib/playground/presets";
import { listCreations, listSharedWithMe, CREATION_CAP } from "@/lib/playground/store";
import type { PuzzleLanguage } from "@/lib/crossword/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return { title: t("title") };
}

const asLanguage = (locale: string): PuzzleLanguage =>
  locale === "fr" || locale === "ar" ? locale : "en";

const BENCH = [
  { key: "assisted", href: "/playground/new" },
  { key: "importNotes", href: "/playground/new?source=notes" },
  { key: "fromScratch", href: "/editor" },
] as const;

/**
 * The studio.
 *
 * A workshop, not a chatbot: the bench comes first and the player's own work
 * second. Sections with nothing in them are not rendered at all — an empty
 * "shared with me" shelf would advertise content that does not exist.
 */
export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  const userId = await currentUserId();
  const [creations, shared] = await Promise.all([
    userId ? listCreations(userId) : Promise.resolve([]),
    listSharedWithMe(userId),
  ]);
  const presets = presetsFor(asLanguage(locale));
  const recent = creations.slice(0, 4);
  const rest = creations.slice(4);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("studio.intro")}</p>
        <div className="mt-4">
          <GlossyLink href="/playground/new" variant="primary">
            {t("studio.createNew")}
          </GlossyLink>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StickerLabel tone="lavender">{t("notOfficial")}</StickerLabel>
          <span className="text-sm text-ink-soft">{t("officialNote")}</span>
        </div>
      </header>

      <section aria-labelledby="playground-bench">
        <SectionHead id="playground-bench">{t("studio.bench")}</SectionHead>
        <ul className="grid gap-3 sm:grid-cols-3">
          {BENCH.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex min-h-11 flex-col gap-1 rounded-card border-2 border-line bg-paper-bright p-4 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5"
              >
                <span className="font-display text-[17px]">{t(`studio.${item.key}`)}</span>
                <span className="text-sm text-ink-soft">{t(`studio.${item.key}Note`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {presets.length > 0 && (
        <section aria-labelledby="playground-templates">
          <SectionHead id="playground-templates">{t("studio.templates")}</SectionHead>
          <ul className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <li key={preset}>
                <Link
                  href={`/playground/new?preset=${preset}`}
                  className="label-caps inline-flex min-h-11 items-center rounded-full border-2 border-line-soft bg-paper px-4 text-ink-soft transition-transform duration-[120ms] hover:-translate-y-px hover:text-ink"
                >
                  {t(`presets.${preset}`)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-soft">{t("presets.note")}</p>
        </section>
      )}

      <DraftCard />

      {recent.length > 0 && (
        <section aria-labelledby="playground-recent">
          <SectionHead id="playground-recent">{t("studio.recent")}</SectionHead>
          <CreationsList creations={recent} />
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="playground-mine">
          <SectionHead id="playground-mine">{t("studio.myCreations")}</SectionHead>
          <CreationsList creations={rest} />
          <p className="mt-2 text-sm text-ink-soft">
            {t("studio.capNote", { saved: creations.length, cap: CREATION_CAP })}
          </p>
        </section>
      )}

      {shared.length > 0 && (
        <section aria-labelledby="playground-shared">
          <SectionHead id="playground-shared">{t("studio.sharedWithMe")}</SectionHead>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/playground/shared/${item.shareSlug}`}
                  className="flex min-h-11 flex-col gap-1 rounded-card border-2 border-line bg-paper-bright p-3 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5"
                >
                  <span className="font-display text-[17px]">{item.title}</span>
                  <span className="label-caps text-ink-faint">
                    {item.language.toUpperCase()} · {item.difficulty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!userId && (
        <p className="rounded-card border-2 border-dashed border-line-soft bg-paper-sunken p-4 text-sm text-ink-soft">
          {t("studio.signedOutNote")}{" "}
          <Link
            href="/account/sign-in"
            className="font-semibold text-accent underline decoration-2 underline-offset-2"
          >
            {t("save.signIn")}
          </Link>
        </p>
      )}
    </div>
  );
}
