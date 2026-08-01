import { useTranslations } from "next-intl";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { PipPortrait } from "@/components/pip/PipPortrait";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <PipPortrait pose="thinking" size={96} className="mx-auto" />
      <p className="font-display mt-2 text-5xl text-line-soft">?</p>
      <h1 className="font-display mt-1 text-2xl">{t("notFound")}</h1>
      <GlossyLink href="/" variant="primary" className="mt-6">
        {t("backHome")}
      </GlossyLink>
    </div>
  );
}
