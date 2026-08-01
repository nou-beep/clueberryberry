"use client";

import { useTranslations } from "next-intl";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { NotebookPage, TapeStrip } from "@/components/ui/bits";

/**
 * The empty journal: a real blank page with one waiting sticker slot and a
 * pencil line, so it reads as "not started yet" rather than "nothing here".
 */
export function EmptyJournal() {
  const t = useTranslations("journal");
  const tLanding = useTranslations("landing");

  return (
    <NotebookPage className="py-8">
      <TapeStrip className="-top-3 start-10" />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="flex size-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-soft bg-paper-sunken text-3xl text-ink-faint"
        >
          ?
        </span>
        <div>
          <p className="font-display text-2xl">{t("empty")}</p>
          <span aria-hidden className="mt-3 block h-0.5 w-40 max-w-full bg-line-soft" />
          <div className="mt-4">
            <GlossyLink href="/subjects" variant="primary">
              {tLanding("chooseSubject")}
            </GlossyLink>
          </div>
        </div>
      </div>
    </NotebookPage>
  );
}
