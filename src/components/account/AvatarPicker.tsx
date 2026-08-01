"use client";

import { useTranslations } from "next-intl";
import { AVATAR_KINDS, Avatar, avatarPaper, type AvatarKind } from "@/components/ui/Avatar";

/** Eight papers, matching the eight the Avatar cycles through. */
const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Pick the figure and the paper behind it. Two radio groups rather than a file
 * input — there are no uploads anywhere in Clueberry.
 */
export function AvatarPicker({
  kind,
  seed,
  onChange,
  disabled = false,
}: {
  kind: AvatarKind;
  seed: number;
  onChange: (next: { kind: AvatarKind; seed: number }) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("account");
  const tKind = useTranslations("account.avatarKinds");

  return (
    <div className="space-y-3">
      <fieldset disabled={disabled}>
        <legend className="mb-2 block text-[15px] font-semibold text-ink">
          {t("avatarKind")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_KINDS.map((option) => {
            const active = option === kind;
            return (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-card border-2 px-2 py-1.5 text-[12px] ${
                  active ? "border-line bg-butter/60 shadow-sticker" : "border-line-soft bg-paper"
                }`}
              >
                <input
                  type="radio"
                  name="avatar-kind"
                  value={option}
                  checked={active}
                  onChange={() => onChange({ kind: option, seed })}
                  className="sr-only"
                />
                <Avatar kind={option} seed={seed} size={44} />
                <span className={active ? "font-semibold text-ink" : "text-ink-soft"}>
                  {active ? "✓ " : ""}
                  {tKind(option)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="mb-2 block text-[15px] font-semibold text-ink">
          {t("avatarPaper")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEEDS.map((option) => {
            const active = Math.abs(seed) % SEEDS.length === option;
            return (
              <label
                key={option}
                className="inline-flex size-11 cursor-pointer items-center justify-center"
              >
                <input
                  type="radio"
                  name="avatar-seed"
                  value={option}
                  checked={active}
                  onChange={() => onChange({ kind, seed: option })}
                  className="sr-only"
                />
                <span
                  className={`flex size-9 items-center justify-center rounded-full border-2 text-[13px] font-bold text-ink ${
                    active ? "border-line shadow-sticker" : "border-line-soft"
                  }`}
                  style={{ backgroundColor: avatarPaper(option) }}
                >
                  {active ? "✓" : ""}
                </span>
                <span className="sr-only">{t("avatarPaperOption", { number: option + 1 })}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
