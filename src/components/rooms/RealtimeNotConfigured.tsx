import { getTranslations } from "next-intl/server";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { Window } from "@/components/ui/Window";

/**
 * What Rooms looks like on a deployment with no realtime server.
 *
 * Not an error and not a spinner: rooms need a long-lived WebSocket process,
 * and this build was not given one. Saying so plainly is better than offering
 * a Create button that would produce a room nobody could ever connect to.
 */
export async function RealtimeNotConfigured({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "rooms" });
  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-4">
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
      </header>
      <Window title={t("notConfiguredTitle")}>
        <div className="space-y-3 p-4">
          <p className="text-[15px] leading-snug text-ink">{t("notConfiguredBody")}</p>
          <p className="text-[14px] leading-snug text-ink-soft">
            {t("notConfiguredHint")}
          </p>
          <GlossyLink href="/puzzles" variant="primary">
            {t("notConfiguredAction")}
          </GlossyLink>
        </div>
      </Window>
    </div>
  );
}
