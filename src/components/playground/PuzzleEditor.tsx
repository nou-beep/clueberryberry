"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import type { Direction } from "@/lib/crossword/types";
import type { PlaygroundTheme } from "@/lib/playground/banks";
import type { PlaygroundDefinition } from "@/lib/playground/definition";
import {
  answerPattern,
  regenerateClue,
  regenerateSection,
  rename,
  setAnswer,
  setClue,
  type EditFailure,
  type EntryRef,
} from "@/lib/playground/edit";

const FIELD =
  "min-h-11 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 py-2 text-[15px] text-ink";

/**
 * Post-generation editing.
 *
 * Every control here runs a real edit from src/lib/playground/edit, which
 * re-validates the whole puzzle before the change is accepted. A refused edit
 * says which check refused it; the puzzle on screen is never left invalid.
 */
export function PuzzleEditor({
  definition,
  theme,
  seed,
  onChange,
}: {
  definition: PlaygroundDefinition;
  theme: PlaygroundTheme | null;
  seed: number;
  onChange: (next: PlaygroundDefinition) => void;
}) {
  const t = useTranslations("playground");
  const [title, setTitle] = useState(definition.title);
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { clue: string; answer: string }>>({});
  const [error, setError] = useState<{ key: string; code: EditFailure; checks?: string[] } | null>(
    null
  );
  const [edits, setEdits] = useState(0);

  const keyOf = (ref: EntryRef) => `${ref.number}${ref.direction[0]}`;

  const apply = (
    key: string,
    result: ReturnType<typeof setClue>
  ): boolean => {
    if (!result.ok) {
      setError({ key, code: result.code, checks: result.messages });
      return false;
    }
    setError(null);
    setEdits((n) => n + 1);
    onChange(result.definition);
    return true;
  };

  const explain = (code: EditFailure, checks?: string[]) => {
    if (code === "validation_failed" && checks?.length) {
      const first = checks[0];
      return t.has(`checks.${first}`) ? t(`checks.${first}`) : t("checks.unknown");
    }
    return t(`editor.errors.${code}`);
  };

  const across = definition.entries.filter((entry) => entry.direction === "across");
  const down = definition.entries.filter((entry) => entry.direction === "down");

  const regenSection = (direction: Direction) => {
    const result = regenerateSection(definition, direction, theme, seed + edits + 1);
    apply(`section-${direction}`, result);
  };

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <label className="block max-w-md">
        <span className="label-caps text-ink-faint">{t("editor.rename")}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            className={`${FIELD} flex-1`}
          />
          <GlossyButton
            size="sm"
            onClick={() => apply("title", rename(definition, title))}
            disabled={title.trim() === definition.title}
          >
            {t("editor.applyName")}
          </GlossyButton>
        </span>
      </label>

      {(["across", "down"] as const).map((direction) => {
        const entries = direction === "across" ? across : down;
        if (entries.length === 0) return null;
        return (
          <section key={direction}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="label-caps text-ink-faint">{t(`editor.${direction}`)}</h3>
              <GlossyButton size="sm" variant="quiet" onClick={() => regenSection(direction)}>
                {t("editor.regenerateSection")}
              </GlossyButton>
            </div>
            {error?.key === `section-${direction}` && (
              <p className="mt-1 text-sm text-wrong">{explain(error.code, error.checks)}</p>
            )}
            <ul className="mt-2 divide-y-2 divide-line-soft border-y-2 border-line-soft">
              {entries.map((entry) => {
                const ref: EntryRef = { number: entry.number, direction };
                const key = keyOf(ref);
                const draft = drafts[key] ?? { clue: entry.clue, answer: entry.answer };
                const isOpen = open === key;
                const pattern = isOpen ? answerPattern(definition, ref) : [];
                return (
                  <li key={key} className="py-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpen(isOpen ? null : key);
                        setDrafts((current) => ({
                          ...current,
                          [key]: { clue: entry.clue, answer: entry.answer },
                        }));
                      }}
                      className="flex min-h-11 w-full items-baseline gap-2 text-start"
                    >
                      <span className="font-mono text-ink-faint">{entry.number}</span>
                      <span className="min-w-0 flex-1 text-[15px] text-ink">{entry.clue}</span>
                      <span className="label-caps shrink-0 text-ink-faint">
                        {entry.answer.length}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-2 space-y-3 rounded-card border-2 border-line-soft bg-paper-sunken p-3">
                        <label className="block">
                          <span className="label-caps text-ink-faint">{t("editor.clue")}</span>
                          <textarea
                            rows={2}
                            value={draft.clue}
                            maxLength={400}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [key]: { ...draft, clue: event.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-[10px] border-2 border-line bg-paper px-3 py-2 text-[15px] text-ink"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <GlossyButton
                            size="sm"
                            variant="primary"
                            onClick={() => apply(key, setClue(definition, ref, draft.clue))}
                          >
                            {t("editor.saveClue")}
                          </GlossyButton>
                          <GlossyButton
                            size="sm"
                            onClick={() =>
                              apply(key, regenerateClue(definition, ref, theme, seed + edits + 1))
                            }
                          >
                            {t("editor.regenerateClue")}
                          </GlossyButton>
                        </div>

                        <label className="block">
                          <span className="label-caps text-ink-faint">{t("editor.answer")}</span>
                          <input
                            type="text"
                            value={draft.answer}
                            maxLength={64}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [key]: { ...draft, answer: event.target.value },
                              }))
                            }
                            className={`${FIELD} mt-1 bg-paper font-mono tracking-[0.2em]`}
                          />
                          <span className="mt-1 block font-mono text-sm text-ink-soft">
                            {t("editor.pattern")}{" "}
                            {pattern.map((letter) => letter ?? "·").join(" ")}
                          </span>
                        </label>
                        <GlossyButton
                          size="sm"
                          onClick={() => apply(key, setAnswer(definition, ref, draft.answer))}
                          disabled={draft.answer.trim() === entry.answer}
                        >
                          {t("editor.replaceAnswer")}
                        </GlossyButton>

                        {error?.key === key && (
                          <p className="text-sm text-wrong">{explain(error.code, error.checks)}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <StickerLabel tone="mint">
          {t("wordCount", { count: definition.entries.length })}
        </StickerLabel>
        <StickerLabel tone="butter">{t("editor.validated")}</StickerLabel>
      </div>
    </div>
  );
}
