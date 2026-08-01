import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden className="flex gap-1.5">
          <span className="block size-2 rotate-45 bg-pink" />
          <span className="block size-2 rotate-45 bg-butter" />
          <span className="block size-2 rotate-45 bg-mint" />
        </span>
        <p className="text-sm text-ink-soft">{t("about")}</p>
        <p className="label-caps text-ink-faint">{t("colophon")}</p>
      </div>
    </footer>
  );
}
