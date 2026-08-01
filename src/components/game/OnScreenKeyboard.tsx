"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { IconChevron } from "@/components/ui/Icons";
import { playKeyClick } from "@/lib/sound";
import type { Direction, PuzzleLanguage } from "@/lib/crossword/types";

/** The two letters a lam-alef key writes, one per cell. */
export const LAM_ALEF: readonly [string, string] = ["ل", "ا"];

type KeyDef =
  | { kind: "letter"; letter: string }
  | { kind: "ligature"; letters: readonly [string, string] };

const letters = (row: string): KeyDef[] =>
  Array.from(row).map((letter) => ({ kind: "letter", letter }));

/**
 * Arabic follows the familiar ض ص ث layout so muscle memory transfers from a
 * physical Arabic keyboard. `لا` is a double-width ligature key; `ذ` closes the
 * bottom row (on hardware it lives on the number row, which we do not render,
 * and Arabic answers need it).
 */
const LAYOUTS: Record<PuzzleLanguage, KeyDef[][]> = {
  en: [letters("QWERTYUIOP"), letters("ASDFGHJKL"), letters("ZXCVBNM")],
  fr: [letters("AZERTYUIOP"), letters("QSDFGHJKLM"), letters("WXCVBN")],
  ar: [
    letters("ضصثقفغعهخحجد"),
    letters("شسيبلاتنمكط"),
    [
      ...letters("ئءؤر"),
      { kind: "ligature", letters: LAM_ALEF },
      ...letters("ىةوزظذ"),
    ],
  ],
};

interface Props {
  language: PuzzleLanguage;
  /** Current typing direction, shown on the direction key. */
  direction: Direction;
  onLetter: (letter: string) => void;
  /** Write ل + ا into the next two cells of the current entry. */
  onLigature: () => void;
  /** False when the current entry has no room left for two letters. */
  ligatureEnabled: boolean;
  onBackspace: () => void;
  onClearSquare: () => void;
  onPrevSquare: () => void;
  onNextSquare: () => void;
  onToggleDirection: () => void;
  onClose: () => void;
  sound: boolean;
}

const KEY_BASE =
  "gloss relative flex h-11 items-center justify-center rounded-lg border-2 border-line shadow-sticker transition-transform duration-[120ms] sm:h-12";
const KEY_PRESS =
  "active:translate-y-0.5 active:bg-butter active:shadow-none data-[pressed=true]:translate-y-0.5 data-[pressed=true]:bg-butter data-[pressed=true]:shadow-none";
const LETTER_KEY = `${KEY_BASE} ${KEY_PRESS} min-w-0 flex-1 basis-0 bg-paper-bright text-[15px] font-semibold text-ink sm:text-[18px]`;
const CONTROL_KEY = `${KEY_BASE} ${KEY_PRESS} min-w-0 flex-1 basis-0 bg-peach text-[15px] font-semibold text-ink`;
const DISABLED_KEY = `${KEY_BASE} min-w-0 flex-1 basis-0 cursor-not-allowed border-line-soft bg-paper-sunken text-[15px] text-ink-faint shadow-none`;

/** Two-headed arrow: horizontal for Across, vertical for Down. */
function IconDirection({ direction }: { direction: Direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      {direction === "across" ? (
        <path d="M4 12h16M7.5 8.5 4 12l3.5 3.5M16.5 8.5 20 12l-3.5 3.5" />
      ) : (
        <path d="M12 4v16M8.5 7.5 12 4l3.5 3.5M8.5 16.5 12 20l3.5-3.5" />
      )}
    </svg>
  );
}

/** A square with an × through it: clear this square without moving. */
function IconClearSquare() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

function IconSpaceBar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <path d="M4 10v4h16v-4" />
    </svg>
  );
}

/**
 * A full built-in keyboard so no player needs matching hardware. Keys are 44px
 * tall (48 from `sm`) and shrink only in width; the whole thing mirrors in RTL.
 * See docs/design-system.md §3 and §9.
 */
export function OnScreenKeyboard({
  language,
  direction,
  onLetter,
  onLigature,
  ligatureEnabled,
  onBackspace,
  onClearSquare,
  onPrevSquare,
  onNextSquare,
  onToggleDirection,
  onClose,
  sound,
}: Props) {
  const t = useTranslations("game");
  const tPuzzle = useTranslations("puzzle");
  const rtl = language === "ar";
  const rows = LAYOUTS[language];
  const [pressed, setPressed] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  /** Every key routes through here so the click cue has exactly one home. */
  const press = useCallback(
    (run: () => void) => () => {
      if (sound) playKeyClick();
      run();
    },
    [sound]
  );

  const pressHandlers = (id: string) => ({
    onPointerDown: () => setPressed(id),
    onPointerUp: () => setPressed(null),
    onPointerCancel: () => setPressed(null),
    onPointerLeave: () => setPressed(null),
    onBlur: () => setPressed(null),
    "data-pressed": pressed === id ? "true" : "false",
  });

  return (
    <div
      role="group"
      aria-label={t("keyboardLabel")}
      data-onscreen-keyboard
      dir={rtl ? "rtl" : "ltr"}
      className="select-none rounded-t-[20px] border-t-2 border-line bg-paper-sunken px-1.5 pb-2 pt-2 shadow-window"
    >
      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {/* Keys stop growing past a comfortable reach on wide screens. */}
      <div className="mx-auto w-full max-w-2xl">
        {rows.map((row, i) => (
          <div key={i} className="mb-1.5 flex justify-center gap-1">
            {row.map((key) =>
              key.kind === "letter" ? (
                <button
                  key={key.letter}
                  type="button"
                  lang={rtl ? "ar" : undefined}
                  onClick={press(() => onLetter(key.letter))}
                  className={LETTER_KEY}
                  {...pressHandlers(key.letter)}
                >
                  {key.letter}
                </button>
              ) : ligatureEnabled ? (
                <button
                  key="ligature"
                  type="button"
                  lang="ar"
                  aria-label={t("lamAlef")}
                  onClick={press(() => {
                    setStatus(t("lamAlefInserted"));
                    onLigature();
                  })}
                  className={`${LETTER_KEY} flex-[2]`}
                  {...pressHandlers("ligature")}
                >
                  {key.letters.join("")}
                </button>
              ) : (
                // Skipped rather than silently writing one letter into one cell.
                <span
                  key="ligature"
                  lang="ar"
                  aria-hidden
                  title={t("lamAlefUnavailable")}
                  className={`${DISABLED_KEY} flex-[2]`}
                >
                  {key.letters.join("")}
                </span>
              )
            )}
          </div>
        ))}

        <div className="flex justify-center gap-1">
          <button
            type="button"
            aria-label={t("closeKeyboard")}
            onClick={press(onClose)}
            className={CONTROL_KEY}
            {...pressHandlers("close")}
          >
            <span aria-hidden className="text-[17px] leading-none">
              ✕
            </span>
          </button>
          <button
            type="button"
            aria-label={`${t("switchDirection")} — ${tPuzzle(direction)}`}
            onClick={press(() => {
              setStatus(tPuzzle(direction === "across" ? "down" : "across"));
              onToggleDirection();
            })}
            className={CONTROL_KEY}
            {...pressHandlers("direction")}
          >
            <IconDirection direction={direction} />
          </button>
          <button
            type="button"
            aria-label={t("prevSquare")}
            onClick={press(onPrevSquare)}
            className={CONTROL_KEY}
            {...pressHandlers("prev")}
          >
            <IconChevron className="size-5" flip={!rtl} />
          </button>
          <button
            type="button"
            aria-label={t("nextSquare")}
            onClick={press(onNextSquare)}
            className={CONTROL_KEY}
            {...pressHandlers("next")}
          >
            <IconChevron className="size-5" flip={rtl} />
          </button>
          <button
            type="button"
            aria-label={t("clearSquare")}
            onClick={press(onClearSquare)}
            className={CONTROL_KEY}
            {...pressHandlers("clear")}
          >
            <IconClearSquare />
          </button>
          {/*
          Answers in this library are single words, so a space would only ever
          be an invalid character. The key stays visible and focusable, and says
          why it does nothing, instead of vanishing or misbehaving.
        */}
          <button
            type="button"
            aria-disabled="true"
            aria-label={`${t("space")} — ${t("spaceUnavailable")}`}
            title={t("spaceUnavailable")}
            onClick={() => setStatus(t("spaceUnavailable"))}
            className={DISABLED_KEY}
          >
            <IconSpaceBar />
          </button>
          <button
            type="button"
            aria-label={t("backspace")}
            onClick={press(onBackspace)}
            className={CONTROL_KEY}
            {...pressHandlers("backspace")}
          >
            <span aria-hidden className="text-[17px] leading-none">
              ⌫
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
