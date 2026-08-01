"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { PipPortrait, type PipPose } from "./PipPortrait";
import { usePip } from "@/lib/pip/context";
import { loadAttempts } from "@/lib/progress/local";

/**
 * Pip: a small desk helper in a draggable window. Not a chat — a portrait, one
 * line of text, and two or three concrete buttons. Every ability runs locally
 * against the real puzzle engine or the local library index.
 */
export function PipCorner() {
  const t = useTranslations("pip");
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pose, setPose] = useState<PipPose>("idle");
  const [line, setLine] = useState<string>("");
  const { abilities } = usePip();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onPuzzle = pathname.startsWith("/play");
  const onJournal = pathname.startsWith("/journal");

  // Reset Pip's line when the context changes.
  useEffect(() => {
    setLine(onPuzzle ? t("greetPuzzle") : onJournal ? t("greetJournal") : t("greetHome"));
    setPose("idle");
  }, [onPuzzle, onJournal, t]);

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = { x: clientX, y: clientY, ox: offset.x, oy: offset.y };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragState.current;
      if (!d) return;
      setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
    };
    const up = () => {
      dragState.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const revealSquare = useCallback(() => {
    const a = abilities;
    if (!a) return;
    const ok = a.revealSquare();
    setLine(ok ? t("onIt") : t("pickACell"));
    setPose(ok ? "cheerful" : "idle");
  }, [abilities, t]);

  const revealWord = useCallback(() => {
    const a = abilities;
    if (!a) return;
    const ok = a.revealWord();
    setLine(ok ? t("onIt") : t("pickACell"));
    setPose(ok ? "cheerful" : "idle");
  }, [abilities, t]);

  const explain = useCallback(() => {
    const a = abilities;
    if (!a) return;
    const info = a.explainActive();
    if (!info) {
      setLine(t("pickACell"));
      setPose("idle");
      return;
    }
    setPose("thinking");
    setLine(
      info.explanation
        ? t("explained", { answer: info.answer, explanation: info.explanation })
        : t("noExplanation", { answer: info.answer })
    );
  }, [abilities, t]);

  /** Recommend from what the player has actually not finished, locally. */
  const recommend = useCallback(async () => {
    setPose("thinking");
    const done = new Set(
      Object.values(loadAttempts())
        .filter((a) => a.status === "completed")
        .map((a) => a.slug)
    );
    try {
      const res = await fetch("/api/library/index");
      if (!res.ok) throw new Error("index unavailable");
      const data = (await res.json()) as {
        puzzles: Array<{ slug: string; language: string; title: string }>;
      };
      const candidates = data.puzzles.filter((p) => !done.has(p.slug));
      const pick = (candidates.length ? candidates : data.puzzles)[0];
      if (!pick) {
        setLine(t("greetHome"));
        setPose("idle");
        return;
      }
      setLine(t("recommended"));
      setPose("cheerful");
      router.push(`/play/${pick.slug}`);
    } catch {
      setPose("idle");
      setLine(t("greetHome"));
    }
  }, [router, t]);

  const buildOne = useCallback(() => {
    setPose("cheerful");
    setLine(t("onIt"));
    router.push("/playground");
  }, [router, t]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="gloss sparkle-host fixed bottom-4 end-4 z-40 flex size-14 items-center justify-center rounded-full border-2 border-line bg-butter shadow-window transition-transform duration-[120ms] hover:-translate-y-0.5 active:translate-y-0.5"
      >
        <PipPortrait pose="idle" size={40} />
      </button>
    );
  }

  const puzzleActive = abilities !== null && !abilities.isComplete;

  return (
    <aside
      role="complementary"
      aria-label={t("title")}
      className="animate-window-open fixed bottom-4 end-4 z-40 w-[260px] overflow-hidden rounded-[20px] border-2 border-line bg-paper-bright shadow-window"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div
        onPointerDown={(e) => startDrag(e.clientX, e.clientY)}
        title={t("dragHint")}
        className="pinstripe flex cursor-grab touch-none items-center gap-2 border-b-2 border-line bg-paper-sunken px-2.5 py-1.5 active:cursor-grabbing"
      >
        <h2 className="font-display flex-1 text-sm text-ink">{t("title")}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="flex size-6 items-center justify-center rounded-md border border-line bg-paper-bright text-xs text-ink-soft hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2.5 p-3">
        <PipPortrait pose={pose} size={52} className="mt-0.5 shrink-0" />
        <p aria-live="polite" className="min-w-0 flex-1 text-[13px] leading-snug text-ink">
          {line}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        {puzzleActive ? (
          <>
            <GlossyButton size="sm" variant="primary" onClick={revealSquare}>
              {t("hintSquare")}
            </GlossyButton>
            <div className="flex gap-1.5">
              <GlossyButton size="sm" className="flex-1" onClick={revealWord}>
                {t("hintWord")}
              </GlossyButton>
              <GlossyButton size="sm" className="flex-1" onClick={explain}>
                {t("explain")}
              </GlossyButton>
            </div>
          </>
        ) : (
          <>
            <GlossyButton size="sm" variant="primary" onClick={recommend}>
              {t("recommend")}
            </GlossyButton>
            <GlossyButton size="sm" onClick={buildOne}>
              {t("buildOne")}
            </GlossyButton>
          </>
        )}
      </div>
    </aside>
  );
}
