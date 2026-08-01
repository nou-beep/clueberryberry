"use client";

import { useTranslations } from "next-intl";
import { Menu } from "@/components/ui/Menu";
import { formatTime } from "@/lib/crossword/share";
import { IconCheck, IconClock, IconEye, IconFloppy } from "@/components/ui/Icons";
import type { SyncStatus } from "@/lib/progress/sync";

interface Props {
  elapsed: number;
  paused: boolean;
  completed: boolean;
  showTimer: boolean;
  autoCheck: boolean;
  sound: boolean;
  mistakes: number;
  syncStatus: SyncStatus;
  onTogglePause: () => void;
  onToggleAutoCheck: () => void;
  onToggleSound: () => void;
  onCheck: (scope: "square" | "word" | "puzzle") => void;
  onReveal: (scope: "square" | "word" | "puzzle") => void;
}

/** Small chunky toggle used for auto-check and sound. State carries a glyph. */
function Toggle({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1 rounded-lg border-2 px-2 text-[12px] font-semibold ${
        on
          ? "border-line bg-mint text-ink"
          : "border-line-soft bg-paper-bright text-ink-faint"
      }`}
    >
      {children}
      <span aria-hidden className="font-mono">
        {on ? "✓" : "×"}
      </span>
    </button>
  );
}

/**
 * The save chip. It says only what is true: a write in flight is "saving", a
 * refused write is "sync failed" until a retry succeeds, and a guest is told
 * plainly that the only copy is in this browser. It never blocks play — no
 * dialog, no focus, and a fixed width so nothing shifts as the wording changes.
 */
function SaveChip({ status }: { status: SyncStatus }) {
  const t = useTranslations("game");
  if (status === "idle") {
    return <span aria-hidden className="min-w-[9.5rem]" />;
  }
  const tone =
    status === "failed"
      ? "text-wrong"
      : status === "offline"
        ? "text-ink-soft"
        : status === "saved" || status === "local"
          ? "text-mint-deep"
          : "text-ink-soft";
  const label = {
    local: t("savedInBrowser"),
    saving: t("saving"),
    syncing: t("syncing"),
    saved: t("saved"),
    offline: t("offlineSaved"),
    failed: t("syncFailed"),
  }[status];
  return (
    <span
      className={`flex min-w-[9.5rem] items-center gap-1 text-[11px] transition-opacity duration-[140ms] ${tone}`}
      aria-label={t("saveStatus")}
      aria-live="polite"
    >
      <IconFloppy className="size-4 shrink-0" />
      <span className="label-caps truncate">{label}</span>
    </span>
  );
}

export function GameToolbar({
  elapsed,
  paused,
  completed,
  showTimer,
  autoCheck,
  sound,
  mistakes,
  syncStatus,
  onTogglePause,
  onToggleAutoCheck,
  onToggleSound,
  onCheck,
  onReveal,
}: Props) {
  const t = useTranslations("game");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-line bg-paper-sunken px-2.5 py-2">
      {showTimer && (
        <span className="flex items-center gap-1.5">
          <IconClock className="size-4 text-ink-soft" />
          <span
            className="font-mono text-sm font-medium tabular-nums text-ink"
            aria-label={t("timer")}
          >
            {formatTime(elapsed)}
          </span>
          {!completed && (
            <button
              type="button"
              onClick={onTogglePause}
              className="label-caps min-h-9 rounded-lg border-2 border-line-soft bg-paper-bright px-2 text-ink-soft hover:text-ink"
            >
              {paused ? t("resume") : t("pause")}
            </button>
          )}
        </span>
      )}

      <span className="label-caps text-ink-faint">
        {t("mistakes")}: <span className="font-mono text-ink">{mistakes}</span>
      </span>

      {/* Saving shows a floppy, as promised in the design doc. */}
      <SaveChip status={syncStatus} />

      <span className="flex-1" />

      {!completed && (
        <>
          <Menu
            label={t("check")}
            icon={<IconCheck className="size-4" />}
            items={[
              { label: t("checkSquare"), onSelect: () => onCheck("square") },
              { label: t("checkWord"), onSelect: () => onCheck("word") },
              { label: t("checkPuzzle"), onSelect: () => onCheck("puzzle") },
            ]}
          />
          <Menu
            label={t("reveal")}
            icon={<IconEye className="size-4" />}
            items={[
              { label: t("revealSquare"), onSelect: () => onReveal("square") },
              { label: t("revealWord"), onSelect: () => onReveal("word") },
              {
                label: t("revealPuzzle"),
                onSelect: () => onReveal("puzzle"),
                destructive: true,
              },
            ]}
          />
        </>
      )}

      <Toggle on={autoCheck} label={t("autoCheck")} onClick={onToggleAutoCheck}>
        {t("autoCheck")}
      </Toggle>
      <Toggle on={sound} label={t("sound")} onClick={onToggleSound}>
        <span aria-hidden>♪</span>
      </Toggle>
    </div>
  );
}
