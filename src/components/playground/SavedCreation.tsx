"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import { Window } from "@/components/ui/Window";
import { PlayScreen } from "@/components/game/PlayScreen";
import type { PlaygroundTheme } from "@/lib/playground/banks";
import { toPlayable, type PlaygroundDefinition } from "@/lib/playground/definition";
import type { Visibility } from "@/lib/playground/store";
import { GridPreview } from "./GridPreview";
import { PuzzleEditor } from "./PuzzleEditor";

type Tab = "play" | "preview" | "edit" | "share";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; code: string };

/**
 * A saved Playground puzzle, opened. Editing writes through the owner-checked
 * API and re-validates on the server before anything is stored, so a shared
 * link can never point at a puzzle that does not solve.
 */
export function SavedCreation({
  id,
  seed,
  theme,
  initialDefinition,
  initialVisibility,
  initialShareSlug,
}: {
  id: string;
  seed: number;
  theme: PlaygroundTheme | null;
  initialDefinition: PlaygroundDefinition;
  initialVisibility: Visibility;
  initialShareSlug: string | null;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("play");
  const [definition, setDefinition] = useState(initialDefinition);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [shareSlug, setShareSlug] = useState(initialShareSlug);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const playable = toPlayable(definition, id);
  const sharePath = shareSlug && visibility !== "private" ? `/playground/shared/${shareSlug}` : null;

  const persist = async () => {
    setStatus({ kind: "saving" });
    const response = await fetch(`/api/playground/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ definition, title: definition.title }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        checks?: string[];
      };
      setStatus({ kind: "error", code: body.checks?.[0] ?? body.error ?? "save_failed" });
      return;
    }
    setStatus({ kind: "saved" });
    setDirty(false);
    router.refresh();
  };

  const setSharing = async (next: Visibility) => {
    const response = await fetch(`/api/playground/${id}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { visibility: Visibility; shareSlug: string | null };
    setVisibility(body.visibility);
    setShareSlug(body.shareSlug);
    setCopied(false);
  };

  const duplicate = async () => {
    const response = await fetch(`/api/playground/${id}/duplicate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: t("studio.copyOf", { title: definition.title }).slice(0, 120),
      }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { creation: { id: string } };
    router.push(`/playground/${body.creation.id}`);
  };

  const remove = async () => {
    const response = await fetch(`/api/playground/${id}`, { method: "DELETE" });
    if (response.ok) router.push("/playground");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(definition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const TABS: Tab[] = ["play", "preview", "edit", "share"];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps text-accent">{t("title")}</p>
          <h1 className="font-display text-3xl sm:text-4xl">{definition.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StickerLabel tone="lavender">{t("notOfficial")}</StickerLabel>
            <StickerLabel tone="butter">{t(`save.visibility_${visibility}`)}</StickerLabel>
            {dirty && <StickerLabel tone="peach">{t("editor.unsaved")}</StickerLabel>}
          </div>
        </div>
        <GlossyLink href="/playground">{t("studio.backToStudio")}</GlossyLink>
      </header>

      <nav aria-label={t("studio.sections")}>
        <ul className="flex flex-wrap gap-1.5">
          {TABS.map((item) => (
            <li key={item}>
              <button
                type="button"
                aria-current={tab === item ? "page" : undefined}
                onClick={() => setTab(item)}
                className={`label-caps inline-flex min-h-11 items-center rounded-full border-2 px-4 ${
                  tab === item
                    ? "border-line bg-butter text-ink shadow-sticker"
                    : "border-line-soft bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {t(`steps.${item === "share" ? "save" : item}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "play" && (
        <div data-subject={playable.subjectTheme}>
          <p className="mb-2 text-sm text-ink-soft">{t("officialNote")}</p>
          <PlayScreen key={playable.id} puzzle={playable} nextPuzzle={null} preview />
        </div>
      )}

      {tab === "preview" && (
        <Window title={t("steps.preview")} static>
          <div className="p-4 sm:p-5">
            <GridPreview definition={definition} />
          </div>
        </Window>
      )}

      {tab === "edit" && (
        <Window title={t("steps.edit")} static>
          <PuzzleEditor
            definition={definition}
            theme={theme}
            seed={seed}
            onChange={(next) => {
              setDefinition(next);
              setDirty(true);
              setStatus({ kind: "idle" });
            }}
          />
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-line-soft p-4 sm:p-5">
            <GlossyButton
              variant="primary"
              onClick={persist}
              disabled={!dirty || status.kind === "saving"}
            >
              {status.kind === "saving" ? t("save.saving") : t("save.save")}
            </GlossyButton>
            {status.kind === "saved" && <StickerLabel tone="mint">{t("save.saved")}</StickerLabel>}
            {status.kind === "error" && (
              <span className="text-sm text-wrong">
                {t.has(`checks.${status.code}`)
                  ? t(`checks.${status.code}`)
                  : t("save.errors.save_failed")}
              </span>
            )}
          </div>
        </Window>
      )}

      {tab === "share" && (
        <Window title={t("save.sharing")} static>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {(["private", "link", "public"] as const).map((option) => (
                <GlossyButton
                  key={option}
                  size="sm"
                  variant={option === visibility ? "primary" : "secondary"}
                  onClick={() => setSharing(option)}
                >
                  {t(`save.visibility_${option}`)}
                </GlossyButton>
              ))}
            </div>
            <p className="text-sm text-ink-soft">{t("save.shareNote")}</p>

            {sharePath ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded border-2 border-line-soft bg-paper-sunken px-2 py-1 font-mono text-sm">
                  {sharePath}
                </code>
                <GlossyButton
                  size="sm"
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(`${window.location.origin}/${locale}${sharePath}`)
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false))
                  }
                >
                  {copied ? t("save.copied") : t("save.copy")}
                </GlossyButton>
                <Link
                  href={sharePath}
                  className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
                >
                  {t("save.openLink")}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{t("save.notShared")}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t-2 border-line-soft pt-4">
              <GlossyButton onClick={duplicate}>{t("studio.duplicate")}</GlossyButton>
              <GlossyButton onClick={exportJson}>{t("save.export")}</GlossyButton>
              {confirming ? (
                <>
                  <GlossyButton variant="danger" onClick={remove}>
                    {t("studio.confirmDelete")}
                  </GlossyButton>
                  <GlossyButton variant="quiet" onClick={() => setConfirming(false)}>
                    {t("studio.cancel")}
                  </GlossyButton>
                </>
              ) : (
                <GlossyButton variant="quiet" onClick={() => setConfirming(true)}>
                  {t("studio.delete")}
                </GlossyButton>
              )}
            </div>
          </div>
        </Window>
      )}
    </div>
  );
}
