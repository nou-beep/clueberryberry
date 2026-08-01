"use client";

import { useTranslations } from "next-intl";
import { Window } from "@/components/ui/Window";
import { Sticker, STICKER_SLUGS } from "@/components/ui/Sticker";

/**
 * The full sheet of 15 stickers. Earned ones sit in full colour with a count;
 * unearned ones stay as dashed slots, so the sheet reads as a collection with
 * gaps rather than a locked shop.
 */
export function StickerSheetPanel({ counts }: { counts: Record<string, number> }) {
  const t = useTranslations("journal");
  const tStickers = useTranslations("stickers");
  const earned = STICKER_SLUGS.filter((s) => (counts[s] ?? 0) > 0).length;

  return (
    <Window title={t("stickerSheet")} static>
      <div className="p-4">
        <p className="label-caps text-ink-faint">
          {t("stickersEarned", { count: earned, total: STICKER_SLUGS.length })}
        </p>
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {STICKER_SLUGS.map((slug) => {
            const count = counts[slug] ?? 0;
            const name = tStickers(slug);
            return (
              <li
                key={slug}
                className="flex flex-col items-center gap-1 rounded-card border-2 border-line-soft bg-paper-sunken p-2 text-center"
              >
                <span className="relative flex size-14 items-center justify-center">
                  {count > 0 ? (
                    <Sticker slug={slug} size={52} title={name} />
                  ) : (
                    <Sticker slug={slug} size={52} locked />
                  )}
                  {count > 1 && (
                    <span className="label-caps absolute -bottom-1 -end-1 rounded-full border-2 border-line bg-butter px-1.5 text-ink">
                      {t("duplicates", { count })}
                    </span>
                  )}
                </span>
                <span className="text-[12px] leading-tight text-ink">{name}</span>
                <span className="label-caps text-ink-faint">
                  {count > 0 ? tStickers("earned") : tStickers("locked")}
                </span>
              </li>
            );
          })}
        </ul>
        {earned === 0 && (
          <p className="mt-3 text-sm text-ink-soft">{t("noStickers")}</p>
        )}
      </div>
    </Window>
  );
}
