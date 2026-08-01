"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import type { PlaygroundSummary } from "@/lib/playground/store";

/**
 * The player's own saved puzzles. Every control here calls a real endpoint;
 * a row whose stored definition can no longer be read says so instead of
 * offering an Open button that would fail.
 */
export function CreationsList({
  creations,
  showActions = true,
}: {
  creations: PlaygroundSummary[];
  showActions?: boolean;
}) {
  const t = useTranslations("playground");
  const tl = useTranslations("languages");
  const td = useTranslations("difficulty");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duplicate = async (item: PlaygroundSummary) => {
    setBusy(item.id);
    const response = await fetch(`/api/playground/${item.id}/duplicate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t("studio.copyOf", { title: item.title }).slice(0, 120) }),
    });
    setBusy(null);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error === "cap_reached" ? t("save.errors.cap_reached") : t("save.errors.save_failed"));
      return;
    }
    setError(null);
    router.refresh();
  };

  const remove = async (item: PlaygroundSummary) => {
    setBusy(item.id);
    const response = await fetch(`/api/playground/${item.id}`, { method: "DELETE" });
    setBusy(null);
    setConfirming(null);
    if (response.ok) router.refresh();
    else setError(t("save.errors.save_failed"));
  };

  return (
    <div>
      {error && <p className="mb-2 text-sm text-wrong">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creations.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-card border-2 border-line bg-paper-bright p-3 shadow-card"
          >
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="font-display min-w-0 flex-1 text-[17px]">{item.title}</h3>
              <StickerLabel tone="lavender">{t("notOfficial")}</StickerLabel>
            </div>
            <p className="label-caps text-ink-faint">
              {tl(item.language)} · {td(item.difficulty as "easy" | "medium" | "hard")} ·{" "}
              {item.readable
                ? t("studio.gridSummary", {
                    width: item.width,
                    height: item.height,
                    count: item.entryCount,
                  })
                : t("studio.unreadable")}
            </p>
            <p className="label-caps text-ink-faint">
              {t(`save.visibility_${item.visibility}`)}
            </p>

            {showActions && (
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {item.readable && (
                  <Link
                    href={`/playground/${item.id}`}
                    className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
                  >
                    {t("studio.open")}
                  </Link>
                )}
                <GlossyButton
                  size="sm"
                  disabled={busy === item.id || !item.readable}
                  onClick={() => duplicate(item)}
                >
                  {t("studio.duplicate")}
                </GlossyButton>
                {confirming === item.id ? (
                  <>
                    <GlossyButton
                      size="sm"
                      variant="danger"
                      disabled={busy === item.id}
                      onClick={() => remove(item)}
                    >
                      {t("studio.confirmDelete")}
                    </GlossyButton>
                    <GlossyButton size="sm" variant="quiet" onClick={() => setConfirming(null)}>
                      {t("studio.cancel")}
                    </GlossyButton>
                  </>
                ) : (
                  <GlossyButton
                    size="sm"
                    variant="quiet"
                    onClick={() => setConfirming(item.id)}
                  >
                    {t("studio.delete")}
                  </GlossyButton>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
