"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useSettings, type AppSettings } from "@/lib/settings";
import { Window } from "@/components/ui/Window";
import { IconChevron, IconGlobe } from "@/components/ui/Icons";

/**
 * A chunky outlined switch. The knob carries a ✓ or × glyph so the state is
 * never signalled by colour alone.
 */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-line-soft px-4 py-2 last:border-b-0">
      <span className="text-[15px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-16 shrink-0 items-center justify-center"
      >
        <span
          className={`relative flex h-8 w-14 items-center rounded-full border-2 border-line transition-colors ${
            checked ? "bg-mint" : "bg-paper-sunken"
          }`}
        >
          <span
            aria-hidden
            className={`absolute flex size-6 items-center justify-center rounded-full border-2 border-line bg-paper-bright text-[13px] font-bold leading-none text-ink transition-all ${
              checked ? "start-[26px]" : "start-0.5"
            }`}
          >
            {checked ? "✓" : "×"}
          </span>
        </span>
      </button>
    </div>
  );
}

/** A labelled native select in a 2px-outlined wrapper. */
function Choice({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line-soft px-4 py-2 last:border-b-0">
      <span className="text-[15px]">{label}</span>
      <span className="relative inline-flex items-center rounded-[10px] border-2 border-line bg-paper-sunken">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 cursor-pointer appearance-none bg-transparent ps-3 pe-9 text-[15px] text-ink"
        >
          {children}
        </select>
        <span aria-hidden className="pointer-events-none absolute end-2 text-ink-soft">
          <IconChevron className="size-4 rotate-90" />
        </span>
      </span>
    </label>
  );
}

/**
 * The sheet of labelled toggles. Lives inside the Profile hub — Settings is a
 * section of the personal hub, not a top-level destination
 * (docs/information-architecture.md).
 */
export function SettingsPanel() {
  const t = useTranslations("settings");
  const tLang = useTranslations("languages");
  const { settings, update } = useSettings();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const set = (patch: Partial<AppSettings>) => update(patch);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Window title={t("interfaceLanguage")} icon={<IconGlobe className="size-5" />}>
        <Choice
          label={t("interfaceLanguage")}
          value={locale}
          onChange={(v) =>
            router.replace(
              // @ts-expect-error dynamic pathname/params pairing checked by next-intl at runtime
              { pathname, params },
              { locale: v }
            )
          }
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {tLang(l)}
            </option>
          ))}
        </Choice>
        <Choice
          label={t("puzzleLanguage")}
          value={settings.puzzleLanguage}
          onChange={(v) => set({ puzzleLanguage: v as AppSettings["puzzleLanguage"] })}
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {tLang(l)}
            </option>
          ))}
        </Choice>
      </Window>

      <Window title={t("appearance")} static>
        <Choice
          label={t("appearance")}
          value={settings.theme}
          onChange={(v) => set({ theme: v as AppSettings["theme"] })}
        >
          <option value="light">{t("light")}</option>
          <option value="lamp">{t("lamp")}</option>
          <option value="system">{t("system")}</option>
        </Choice>
        <Choice
          label={t("textSize")}
          value={settings.textSize}
          onChange={(v) => set({ textSize: v as AppSettings["textSize"] })}
        >
          <option value="normal">{t("textSizeNormal")}</option>
          <option value="large">{t("textSizeLarge")}</option>
        </Choice>
        <p className="px-4 py-3 text-sm text-ink-soft">{t("appearanceNote")}</p>
      </Window>

      <Window title={t("gameplay")} static>
        <Toggle
          checked={settings.autoCheck}
          onChange={(v) => set({ autoCheck: v })}
          label={t("autoCheck")}
        />
        <Toggle
          checked={settings.showTimer}
          onChange={(v) => set({ showTimer: v })}
          label={t("showTimer")}
        />
        <Toggle
          checked={settings.sound}
          onChange={(v) => set({ sound: v })}
          label={t("sound")}
        />
      </Window>

      <Window title={t("accessibility")} static>
        <Toggle
          checked={settings.reducedMotion}
          onChange={(v) => set({ reducedMotion: v })}
          label={t("reducedMotion")}
        />
        <Toggle
          checked={settings.highContrast}
          onChange={(v) => set({ highContrast: v })}
          label={t("highContrast")}
        />
        <Toggle
          checked={settings.dyslexiaFont}
          onChange={(v) => set({ dyslexiaFont: v })}
          label={t("dyslexiaFont")}
        />
      </Window>

      <Window title={t("arabicSection")} static>
        <p className="border-b-2 border-line-soft px-4 py-3 text-sm text-ink-soft">
          {t("arabicNote")}
        </p>
        <Toggle
          checked={settings.arabicFoldAlef}
          onChange={(v) => set({ arabicFoldAlef: v })}
          label={t("foldAlef")}
        />
        <Toggle
          checked={settings.arabicFoldYa}
          onChange={(v) => set({ arabicFoldYa: v })}
          label={t("foldYa")}
        />
        {/* ؤ and ئ are distinct letters, so these stay off unless asked for. */}
        <Toggle
          checked={settings.arabicFoldHamzaWaw}
          onChange={(v) => set({ arabicFoldHamzaWaw: v })}
          label={t("foldHamzaWaw")}
        />
        <Toggle
          checked={settings.arabicFoldHamzaYa}
          onChange={(v) => set({ arabicFoldHamzaYa: v })}
          label={t("foldHamzaYa")}
        />
      </Window>
    </div>
  );
}
