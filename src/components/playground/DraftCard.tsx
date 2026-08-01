"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { SectionHead } from "@/components/ui/bits";
import { clearDraft, loadDraft, type PlaygroundDraft } from "@/lib/playground/drafts";

/**
 * Unfinished work in the browser's own storage. The section only appears when a
 * draft genuinely exists, and it is explicit that a draft lives on this device
 * rather than in an account.
 */
export function DraftCard() {
  const t = useTranslations("playground");
  const [draft, setDraft] = useState<PlaygroundDraft | null>(null);

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  if (!draft) return null;

  return (
    <section aria-labelledby="playground-draft">
      <SectionHead id="playground-draft">{t("studio.drafts")}</SectionHead>
      <div className="rounded-card border-2 border-dashed border-line bg-paper-sunken p-4">
        <p className="text-[15px] text-ink">
          {draft.definition ? draft.definition.title : t("studio.draftUnbuilt")}
        </p>
        <p className="label-caps mt-1 text-ink-faint">{t("studio.draftLocal")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <GlossyLink href="/playground/new" variant="primary">
            {t("studio.resume")}
          </GlossyLink>
          <GlossyButton
            variant="quiet"
            onClick={() => {
              clearDraft();
              setDraft(null);
            }}
          >
            {t("studio.discardDraft")}
          </GlossyButton>
        </div>
      </div>
    </section>
  );
}
