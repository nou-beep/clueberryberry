"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { IconChevron, IconGlobe } from "@/components/ui/Icons";

const LABELS: Record<string, string> = { en: "EN", fr: "FR", ar: "ع" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <span className="relative inline-flex items-center gap-1 rounded-full border-2 border-line bg-butter ps-2.5 shadow-sticker">
      <IconGlobe className="size-4 shrink-0 text-ink" />
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(e) => {
          // Route params (slugs, ids) are locale-independent; swap the prefix.
          router.replace(
            // @ts-expect-error dynamic pathname + params pairing is validated at runtime by next-intl
            { pathname, params },
            { locale: e.target.value }
          );
        }}
        className="label-caps min-h-11 cursor-pointer appearance-none bg-transparent pe-7 ps-1 text-ink"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l] ?? l.toUpperCase()}
          </option>
        ))}
      </select>
      <IconChevron
        className="pointer-events-none absolute end-2 size-4 rotate-90 text-ink-soft"
      />
    </span>
  );
}
