"use client";

import { useTranslations } from "next-intl";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import type { PuzzleSize } from "@/lib/playground/generate";
import type { MatchedField, ParsedRequest } from "@/lib/playground/request";

/**
 * The request box. What happens when you press the button is a local keyword
 * parse — no network, no model — so the panel underneath shows exactly which
 * words were understood and which were not, and never guesses a subject.
 */
export function RequestBox({
  value,
  onChange,
  onSubmit,
  parsed,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  parsed: ParsedRequest | null;
}) {
  const t = useTranslations("playground");
  const tl = useTranslations("languages");
  const td = useTranslations("difficulty");

  const labelFor = (field: MatchedField): string => {
    switch (field.field) {
      case "language":
        return tl(field.value as PuzzleLanguage);
      case "difficulty":
        return td(field.value as Difficulty);
      case "size":
        return t(field.value as PuzzleSize);
      case "subject":
        return t(`subjects.${field.value}`);
      case "collection":
        return t(`themes.${field.value}`);
      case "minutes":
        return t("minutesValue", { count: Number(field.value) });
      case "repeat":
        return t("fields.repeatValue");
      default:
        return field.value === "false" ? t("off") : t("on");
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <label className="block">
        <span className="label-caps text-ink-faint">{t("request")}</span>
        <textarea
          value={value}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("requestPlaceholder")}
          className="mt-2 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 py-2 text-[15px] leading-relaxed text-ink"
        />
      </label>
      <p className="text-sm text-ink-soft">{t("requestHelp")}</p>

      <div className="flex flex-wrap items-center gap-3">
        <GlossyButton variant="primary" onClick={onSubmit}>
          {t("interpret")}
        </GlossyButton>
      </div>

      <div aria-live="polite">
        {parsed && (
          <div className="rounded-card border-2 border-line-soft bg-paper p-3">
            <p className="label-caps text-ink-faint">
              {t("understood", { percent: Math.round(parsed.confidence * 100) })}
            </p>
            {parsed.matched.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {parsed.matched.map((field) => (
                  <li key={`${field.field}-${field.value}`}>
                    <StickerLabel tone="mint">
                      {t(`fields.${field.field}`)}: {labelFor(field)}
                    </StickerLabel>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">{t("understoodNothing")}</p>
            )}

            {parsed.unmatched.length > 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                {t("unrecognised", { words: parsed.unmatched.join(", ") })}
              </p>
            )}
            {parsed.missingBank && (
              <p className="mt-2 text-sm text-ink-soft">
                {t("bankMissing", {
                  topic: t(`themes.${parsed.missingBank}`),
                  language: tl(parsed.request.language),
                })}
              </p>
            )}
            {parsed.needsTopic && (
              <p className="mt-2 text-sm text-ink">{t("needTopic")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
