import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * What a category says when it has nothing in the language you are browsing in.
 *
 * The rule, applied the same way everywhere: a category with no puzzles in the
 * active language is left off every listing, and a direct visit says so plainly
 * and points at what does exist — the same category in a language that has
 * puzzles, or the library. It is never rendered as an empty shell with a
 * filter bar over nothing.
 */
export async function EmptyForLanguage({
  language,
  available,
  hrefFor,
}: {
  /** The language that was being browsed. */
  language: string;
  /** Languages this category genuinely has published puzzles in. */
  available: string[];
  /** Link to this same category in another language. */
  hrefFor: (language: string) => string;
}) {
  const t = await getTranslations("library");
  const tLang = await getTranslations("languages");

  return (
    <div className="rounded-card border-2 border-dashed border-line bg-paper-sunken p-6">
      {available.length > 0 ? (
        <>
          <p className="text-[15px] text-ink">
            {t("emptyLanguage", { language: tLang(language) })}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t("emptyLanguageOther")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {available.map((code) => (
              <li key={code}>
                <Link
                  href={hrefFor(code)}
                  className="label-caps inline-flex min-h-11 items-center rounded-full border-2 border-line bg-paper px-4 text-ink hover:-translate-y-px"
                >
                  {tLang(code)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[15px] text-ink">{t("emptyEverywhere")}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href="/puzzles"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
        >
          {t("backToLibrary")}
        </Link>
        <Link
          href="/playground/new"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
        >
          {t("makeItLink")}
        </Link>
      </div>
    </div>
  );
}
