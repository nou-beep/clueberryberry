"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function PuzzleRowActions({ puzzleId }: { puzzleId: string }) {
  const t = useTranslations("editor");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const duplicate = async () => {
    setBusy(true);
    const res = await fetch(`/api/editor/puzzles/${puzzleId}/duplicate`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      router.push(`/editor/puzzles/${id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={duplicate}
      disabled={busy}
      className="label-caps border border-line px-2 py-1 text-ink-soft hover:text-ink disabled:opacity-50"
    >
      {t("duplicate")}
    </button>
  );
}
