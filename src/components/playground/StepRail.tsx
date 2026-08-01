"use client";

import { useTranslations } from "next-intl";

export const STEP_IDS = [
  "language",
  "subject",
  "topic",
  "difficulty",
  "size",
  "generate",
  "preview",
  "edit",
  "save",
  "play",
] as const;

export type StepId = (typeof STEP_IDS)[number];

/** The first step that needs a built puzzle. Everything from here is disabled
 * until one exists, rather than shown as a control that does nothing. */
export const FIRST_BUILT_STEP = STEP_IDS.indexOf("preview");

/**
 * The creation strip. Every step already visited stays reachable, so the whole
 * flow is back-navigable — a decision made at step two can be changed without
 * starting again.
 */
export function StepRail({
  current,
  furthest,
  hasPuzzle,
  onGo,
}: {
  current: number;
  furthest: number;
  hasPuzzle: boolean;
  onGo: (index: number) => void;
}) {
  const t = useTranslations("playground");

  return (
    <nav aria-label={t("steps.rail")}>
      <ol className="flex flex-wrap gap-1.5">
        {STEP_IDS.map((id, index) => {
          const reachable =
            index <= furthest && (index < FIRST_BUILT_STEP || hasPuzzle);
          const active = index === current;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => onGo(index)}
                className={`label-caps inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 transition-transform duration-[120ms] ${
                  active
                    ? "border-line bg-butter text-ink shadow-sticker"
                    : reachable
                      ? "border-line-soft bg-paper text-ink-soft hover:-translate-y-px hover:text-ink"
                      : "border-line-soft bg-paper-sunken text-ink-faint opacity-60"
                }`}
              >
                <span className="font-mono">{index + 1}</span>
                {t(`steps.${id}`)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
