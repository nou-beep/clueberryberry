"use client";

import { useTranslations } from "next-intl";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { PipPortrait } from "@/components/pip/PipPortrait";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <PipPortrait pose="thinking" size={96} className="mx-auto" />
      <h1 className="font-display mt-2 text-2xl">{t("somethingWrong")}</h1>
      <GlossyButton variant="primary" className="mt-6" onClick={reset}>
        {t("tryAgain")}
      </GlossyButton>
    </div>
  );
}
