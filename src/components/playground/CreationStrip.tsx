"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { StickerLabel } from "@/components/ui/bits";
import { Window } from "@/components/ui/Window";
import { PlayScreen } from "@/components/game/PlayScreen";
import type { Difficulty, PuzzleLanguage } from "@/lib/crossword/types";
import { subjectsFor, themesForSubject, type PlaygroundTheme } from "@/lib/playground/banks";
import { toDefinition, toPlayable, type PlaygroundDefinition } from "@/lib/playground/definition";
import { clearDraft, loadDraft, saveDraft } from "@/lib/playground/drafts";
import {
  defaultForm,
  resolveCustomTopic,
  withDifficulty,
  withLanguage,
  withMinutes,
  withSize,
  withSubject,
  withTheme,
  type PlaygroundForm,
} from "@/lib/playground/form";
import { minutesForSize, type PuzzleSize } from "@/lib/playground/generate";
import { applyPreset, presetsFor, type PresetId } from "@/lib/playground/presets";
import { parseRequest, type ParsedRequest } from "@/lib/playground/request";
import { nextSeed, runGeneration, type BuildOutcome } from "@/lib/playground/run";
import { foldStages, type StageLog } from "@/lib/playground/stages";
import { GridPreview } from "./GridPreview";
import { PuzzleEditor } from "./PuzzleEditor";
import { RequestBox } from "./RequestBox";
import { StageList } from "./StageList";
import { FIRST_BUILT_STEP, STEP_IDS, StepRail } from "./StepRail";

const PUZZLE_LANGUAGES: PuzzleLanguage[] = ["en", "fr", "ar"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const SIZES: PuzzleSize[] = ["small", "medium", "large"];
const MINUTES = [5, 10, 15, 20];
const THEME_ENTRIES = [1, 2, 3, 4, 5];

const CHIP =
  "min-h-11 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-transform duration-[120ms] hover:-translate-y-px";
const FIELD =
  "min-h-11 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 py-2 text-[15px] text-ink";
const LEGEND = "label-caps text-ink-faint";

function asLanguage(locale: string): PuzzleLanguage {
  return locale === "fr" || locale === "ar" ? locale : "en";
}

function Chips<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  label,
  tone = "bg-butter",
  allowNone,
  noneLabel,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  label: (option: T) => string;
  tone?: string;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const items: Array<{ key: string; value: T | null; text: string }> = [
    ...(allowNone ? [{ key: "none", value: null, text: noneLabel ?? "" }] : []),
    ...options.map((option) => ({
      key: String(option),
      value: option,
      text: label(option),
    })),
  ];
  return (
    <fieldset>
      <legend className={LEGEND}>{legend}</legend>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(item.value)}
                className={`${CHIP} ${
                  active
                    ? `border-line ${tone} text-ink shadow-sticker`
                    : "border-line-soft bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 rounded-[4px] border-2 border-line accent-pink-deep"
      />
      <span>{label}</span>
      <span className="label-caps text-ink-faint">{checked ? "✓" : "—"}</span>
    </label>
  );
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; id: string }
  | { kind: "error"; code: string };

/**
 * The workshop bench.
 *
 * A back-navigable strip — language, subject, topic, difficulty, size, then
 * build, look, edit, keep, play. The free-text box is one tool on the bench: it
 * fills the same form the player can see and correct, and never replaces it.
 */
export function CreationStrip({
  signedIn,
  initialPreset,
  initialSource,
}: {
  signedIn: boolean;
  initialPreset?: PresetId;
  initialSource?: "bank" | "notes";
}) {
  const t = useTranslations("playground");
  const tl = useTranslations("languages");
  const td = useTranslations("difficulty");
  const locale = asLanguage(useLocale());

  const [form, setForm] = useState<PlaygroundForm>(() => {
    const base = defaultForm(locale);
    const seeded = initialPreset ? applyPreset(base, initialPreset) : base;
    return initialSource ? { ...seeded, source: initialSource } : seeded;
  });
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [requestText, setRequestText] = useState("");
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [log, setLog] = useState<StageLog>({});
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<BuildOutcome | null>(null);
  const [definition, setDefinition] = useState<PlaygroundDefinition | null>(null);
  const [builds, setBuilds] = useState(0);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);
  const generatedSeed = useRef(0);

  const presets = useMemo(() => presetsFor(form.language), [form.language]);
  const subjects = useMemo(() => subjectsFor(form.language), [form.language]);
  const themes = useMemo(
    () => themesForSubject(form.language, form.subject ?? subjects[0]),
    [form.language, form.subject, subjects]
  );

  const goto = useCallback((index: number) => {
    setStep(index);
    setFurthest((current) => Math.max(current, index));
  }, []);

  // Restore an unfinished draft once, and keep saving one as work continues.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setForm(draft.form);
    if (draft.definition) {
      setDefinition(draft.definition);
      generatedSeed.current = draft.seed;
      setFurthest(FIRST_BUILT_STEP);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    saveDraft({
      form,
      definition,
      theme: form.theme,
      seed: generatedSeed.current,
      savedAt: new Date().toISOString(),
    });
  }, [form, definition]);

  const build = useCallback(async () => {
    setRunning(true);
    setLog({});
    setOutcome(null);
    setSave({ kind: "idle" });
    setSharePath(null);
    const seed = nextSeed(builds);
    setBuilds((n) => n + 1);
    const result = await runGeneration({
      form,
      seed,
      onEvent: (event) => setLog((current) => foldStages(current, event)),
    });
    setRunning(false);
    setOutcome(result);
    if (result.ok) {
      generatedSeed.current = seed;
      setDefinition(toDefinition(result.puzzle, { theme: result.theme, seed }));
      setFurthest((current) => Math.max(current, FIRST_BUILT_STEP));
      setStep(FIRST_BUILT_STEP);
    } else {
      setDefinition(null);
    }
  }, [builds, form]);

  const playable = definition ? toPlayable(definition, definition.slug) : null;
  const theme: PlaygroundTheme | null = form.theme;
  const topicResolution = useMemo(
    () => resolveCustomTopic(form.language, form.customTopic),
    [form.language, form.customTopic]
  );

  const interpret = () => {
    const result = parseRequest(requestText, locale, {
      language: form.language,
      subject: form.subject,
      collection: form.collection,
      theme: form.theme,
      difficulty: form.difficulty,
      size: form.size,
      familyFriendly: form.familyFriendly,
      allowProperNouns: form.allowProperNouns,
      allowAbbreviations: form.allowAbbreviations,
    });
    setParsed(result);
    // The assistant fills the form; it never builds behind the player's back.
    setForm((current) => ({ ...current, ...result.request }));
  };

  const persist = async () => {
    if (!definition) return;
    setSave({ kind: "saving" });
    const payload = {
      title: definition.title,
      language: definition.language,
      subject: definition.subjectSlug,
      topic: definition.topicSlug,
      difficulty: definition.difficulty,
      size: form.size,
      seed: generatedSeed.current,
      definition,
    };
    const existing = save.kind === "saved" ? save.id : null;
    const response = await fetch(
      existing ? `/api/playground/${existing}` : "/api/playground",
      {
        method: existing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(existing ? { definition, title: definition.title } : payload),
      }
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setSave({ kind: "error", code: typeof body.error === "string" ? body.error : "save_failed" });
      return;
    }
    const body = (await response.json()) as { creation: { id: string } };
    setSave({ kind: "saved", id: body.creation.id });
    clearDraft();
  };

  const share = async (visibility: "private" | "link" | "public") => {
    if (save.kind !== "saved") return;
    const response = await fetch(`/api/playground/${save.id}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { sharePath: string | null };
    setSharePath(body.sharePath);
    setCopied(false);
  };

  const exportJson = () => {
    if (!definition) return;
    const blob = new Blob([JSON.stringify(definition, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const stepId = STEP_IDS[step];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">{t("create.title")}</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("create.intro")}</p>
      </header>

      <StepRail
        current={step}
        furthest={furthest}
        hasPuzzle={definition !== null}
        onGo={goto}
      />

      {restored && definition && step < FIRST_BUILT_STEP && (
        <p className="rounded-card border-2 border-dashed border-line-soft bg-paper-sunken p-3 text-sm text-ink-soft">
          {t("create.draftRestored")}
        </p>
      )}

      <Window title={t(`steps.${stepId}`)} static>
        <div className="space-y-5 p-4 sm:p-5">
          {stepId === "language" && (
            <>
              <Chips
                legend={t("puzzleLanguage")}
                options={PUZZLE_LANGUAGES}
                value={form.language}
                onChange={(next) => next && setForm((f) => withLanguage(f, next))}
                label={(option) => tl(option)}
              />
              <div>
                <p className={LEGEND}>{t("presets.title")}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <li key={preset}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => applyPreset(current, preset));
                          goto(STEP_IDS.indexOf("generate"));
                        }}
                        className={`${CHIP} border-line-soft bg-paper text-ink-soft hover:text-ink`}
                      >
                        {t(`presets.${preset}`)}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-ink-soft">{t("presets.note")}</p>
              </div>
            </>
          )}

          {stepId === "subject" && (
            <>
              <Chips
                legend={t("create.source")}
                options={["bank", "notes"] as const}
                value={form.source}
                onChange={(next) => next && setForm((f) => ({ ...f, source: next }))}
                label={(option) => t(`create.source_${option}`)}
                tone="bg-mint"
              />
              {form.source === "bank" ? (
                <label className="block max-w-sm">
                  <span className={LEGEND}>{t("subject")}</span>
                  <select
                    className={`${FIELD} mt-2`}
                    value={form.subject ?? subjects[0]}
                    onChange={(event) => setForm((f) => withSubject(f, event.target.value))}
                  >
                    {subjects.map((option) => (
                      <option key={option} value={option}>
                        {t.has(`subjects.${option}`) ? t(`subjects.${option}`) : option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm text-ink-soft">{t("create.notesSubject")}</p>
              )}
            </>
          )}

          {stepId === "topic" && (
            <>
              {form.source === "bank" ? (
                <>
                  <label className="block max-w-sm">
                    <span className={LEGEND}>{t("collection")}</span>
                    <select
                      className={`${FIELD} mt-2`}
                      value={form.theme ?? themes[0]}
                      onChange={(event) =>
                        setForm((f) => withTheme(f, event.target.value as PlaygroundTheme))
                      }
                    >
                      {themes.map((option) => (
                        <option key={option} value={option}>
                          {t.has(`themes.${option}`) ? t(`themes.${option}`) : option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block max-w-sm">
                    <span className={LEGEND}>{t("topic.custom")}</span>
                    <input
                      type="text"
                      value={form.customTopic}
                      maxLength={60}
                      placeholder={t("topic.customPlaceholder")}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, customTopic: event.target.value }))
                      }
                      className={`${FIELD} mt-2`}
                    />
                    <span className="mt-1 block text-sm text-ink-soft">
                      {t("topic.customHelp")}
                    </span>
                  </label>

                  <div aria-live="polite" className="text-sm">
                    {topicResolution.kind === "matched" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <StickerLabel tone="mint">
                          {t.has(`themes.${topicResolution.theme}`)
                            ? t(`themes.${topicResolution.theme}`)
                            : topicResolution.theme}
                        </StickerLabel>
                        <GlossyButton
                          size="sm"
                          onClick={() =>
                            setForm((f) => withTheme(f, topicResolution.theme))
                          }
                        >
                          {t("topic.use")}
                        </GlossyButton>
                      </div>
                    )}
                    {topicResolution.kind === "other-language" && (
                      <p className="text-ink-soft">
                        {t("topic.otherLanguage", {
                          languages: topicResolution.languages
                            .map((code) => tl(code))
                            .join(", "),
                        })}
                      </p>
                    )}
                    {topicResolution.kind === "unknown" && (
                      <p className="text-ink-soft">{t("topic.unknown")}</p>
                    )}
                  </div>

                  <div className="rounded-card border-2 border-dashed border-line-soft bg-paper-sunken p-3">
                    <p className="label-caps text-ink-faint">{t("create.assistant")}</p>
                    <p className="mt-1 text-sm text-ink-soft">{t("create.assistantNote")}</p>
                    <RequestBox
                      value={requestText}
                      onChange={setRequestText}
                      onSubmit={interpret}
                      parsed={parsed}
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className={LEGEND}>{t("notesText")}</span>
                    <textarea
                      rows={8}
                      value={form.notes}
                      onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                      placeholder={t("notesPlaceholder")}
                      className="mt-2 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 py-2 text-[15px] leading-relaxed text-ink"
                    />
                  </label>
                  <label className="block max-w-sm">
                    <span className={LEGEND}>{t("notesTitleLabel")}</span>
                    <input
                      type="text"
                      value={form.title}
                      maxLength={120}
                      onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                      placeholder={t("notesTitlePlaceholder")}
                      className={`${FIELD} mt-2`}
                    />
                  </label>
                  <p className="text-sm text-ink-soft">
                    {t("notesWords", {
                      count: form.notes.trim().split(/\s+/).filter(Boolean).length,
                    })}{" "}
                    · {t("notesLimits")}
                  </p>
                </>
              )}
            </>
          )}

          {stepId === "difficulty" && (
            <Chips
              legend={t("difficultyLabel")}
              options={DIFFICULTIES}
              value={form.difficulty}
              onChange={(next) => setForm((f) => withDifficulty(f, next))}
              label={(option) => td(option)}
              tone="bg-pink"
              allowNone
              noneLabel={t("create.anyDifficulty")}
            />
          )}

          {stepId === "size" && (
            <>
              <Chips
                legend={t("size")}
                options={SIZES}
                value={form.size}
                onChange={(next) => next && setForm((f) => withSize(f, next))}
                label={(option) => t(option)}
              />
              <label className="block max-w-xs">
                <span className={LEGEND}>{t("time")}</span>
                <select
                  className={`${FIELD} mt-2`}
                  value={form.minutes ?? ""}
                  onChange={(event) =>
                    setForm((f) =>
                      withMinutes(f, event.target.value === "" ? null : Number(event.target.value))
                    )
                  }
                >
                  <option value="">{t("anyTime")}</option>
                  {MINUTES.map((option) => (
                    <option key={option} value={option}>
                      {t("minutesValue", { count: option })}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-sm text-ink-soft">
                  {t("timeNote", { minutes: minutesForSize(form.size) })}
                </span>
              </label>

              <Chips
                legend={t("tone.label")}
                options={["playful", "archival"] as const}
                value={form.tone}
                onChange={(next) => setForm((f) => ({ ...f, tone: next }))}
                label={(option) => t(`tone.${option}`)}
                tone="bg-lavender"
                allowNone
                noneLabel={t("tone.auto")}
              />

              <Chips
                legend={t("themeEntries.label")}
                options={THEME_ENTRIES}
                value={form.themeEntries}
                onChange={(next) => next && setForm((f) => ({ ...f, themeEntries: next }))}
                label={(option) => String(option)}
              />
              <p className="-mt-3 text-sm text-ink-soft">{t("themeEntries.help")}</p>

              <fieldset className="space-y-1">
                <legend className={LEGEND}>{t("content")}</legend>
                <Toggle
                  label={t("familyFriendly")}
                  checked={form.familyFriendly}
                  onChange={(next) => setForm((f) => ({ ...f, familyFriendly: next }))}
                />
                <Toggle
                  label={t("properNouns")}
                  checked={form.allowProperNouns}
                  onChange={(next) => setForm((f) => ({ ...f, allowProperNouns: next }))}
                />
                <Toggle
                  label={t("abbreviations")}
                  checked={form.allowAbbreviations}
                  onChange={(next) => setForm((f) => ({ ...f, allowAbbreviations: next }))}
                />
              </fieldset>
            </>
          )}

          {stepId === "generate" && (
            <>
              <p className="text-sm text-ink-soft">{t("create.generateNote")}</p>
              <GlossyButton variant="primary" onClick={build} disabled={running}>
                {running ? t("building") : definition ? t("regenerate") : t("generate")}
              </GlossyButton>
              <StageList log={log} running={running} />
              {outcome && !outcome.ok && (
                <div className="rounded-card border-2 border-wrong bg-paper-bright p-4">
                  <p className="font-semibold text-wrong">{t("failed")}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t.has(`failedReasons.${outcome.reason}`)
                      ? t(`failedReasons.${outcome.reason}`)
                      : t("checks.unknown")}
                  </p>
                  {outcome.check && (
                    <p className="mt-1 text-sm text-ink-soft">
                      {t("create.failedCheck", {
                        stage: outcome.stage ? t(`stages.${outcome.stage}`) : "—",
                        check: t.has(`checks.${outcome.check}`)
                          ? t(`checks.${outcome.check}`)
                          : t("checks.unknown"),
                      })}
                    </p>
                  )}
                </div>
              )}
              {outcome?.ok &&
                outcome.requestedDifficulty &&
                outcome.requestedDifficulty !== outcome.difficulty && (
                  <p className="rounded-card border-2 border-dashed border-line-soft bg-paper-sunken p-3 text-sm text-ink-soft">
                    {t("create.difficultyAdjusted", {
                      requested: td(outcome.requestedDifficulty),
                      actual: td(outcome.difficulty),
                    })}
                  </p>
                )}
            </>
          )}

          {stepId === "preview" && definition && (
            <>
              <GridPreview definition={definition} />
              <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                {definition.entries.map((entry) => (
                  <li key={`${entry.number}${entry.direction}`} className="text-sm text-ink-soft">
                    <span className="font-mono text-ink-faint">
                      {entry.number}
                      {entry.direction === "across" ? "A" : "D"}
                    </span>{" "}
                    {entry.clue}
                  </li>
                ))}
              </ul>
            </>
          )}

          {stepId === "edit" && definition && (
            <div className="-m-4 sm:-m-5">
              <PuzzleEditor
                definition={definition}
                theme={theme}
                seed={generatedSeed.current}
                onChange={(next) => {
                  setDefinition(next);
                  if (save.kind === "saved") setSave({ kind: "saved", id: save.id });
                }}
              />
            </div>
          )}

          {stepId === "save" && definition && (
            <div className="space-y-4">
              {!signedIn ? (
                <div className="rounded-card border-2 border-line bg-butter p-4">
                  <p className="font-semibold text-ink">{t("save.signInTitle")}</p>
                  <p className="mt-1 text-sm text-ink-soft">{t("save.signInNote")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GlossyLink href="/account/sign-in" variant="primary">
                      {t("save.signIn")}
                    </GlossyLink>
                    <GlossyButton onClick={exportJson}>{t("save.export")}</GlossyButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <GlossyButton
                      variant="primary"
                      onClick={persist}
                      disabled={save.kind === "saving"}
                    >
                      {save.kind === "saving"
                        ? t("save.saving")
                        : save.kind === "saved"
                          ? t("save.saveAgain")
                          : t("save.save")}
                    </GlossyButton>
                    <GlossyButton onClick={exportJson}>{t("save.export")}</GlossyButton>
                    {save.kind === "saved" && (
                      <StickerLabel tone="mint">{t("save.saved")}</StickerLabel>
                    )}
                  </div>

                  {save.kind === "error" && (
                    <p className="text-sm text-wrong">
                      {t.has(`save.errors.${save.code}`)
                        ? t(`save.errors.${save.code}`)
                        : t("save.errors.save_failed")}
                    </p>
                  )}

                  {save.kind === "saved" && (
                    <div className="space-y-2 rounded-card border-2 border-line-soft bg-paper-sunken p-3">
                      <p className={LEGEND}>{t("save.sharing")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(["private", "link", "public"] as const).map((option) => (
                          <GlossyButton key={option} size="sm" onClick={() => share(option)}>
                            {t(`save.visibility_${option}`)}
                          </GlossyButton>
                        ))}
                      </div>
                      {sharePath && (
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 truncate rounded border-2 border-line-soft bg-paper px-2 py-1 font-mono text-sm">
                            {sharePath}
                          </code>
                          <GlossyButton
                            size="sm"
                            onClick={() => {
                              navigator.clipboard
                                ?.writeText(`${window.location.origin}/${locale}${sharePath}`)
                                .then(() => setCopied(true))
                                .catch(() => setCopied(false));
                            }}
                          >
                            {copied ? t("save.copied") : t("save.copy")}
                          </GlossyButton>
                        </div>
                      )}
                      <p className="text-sm text-ink-soft">{t("save.shareNote")}</p>
                      <Link
                        href={`/playground/${save.id}`}
                        className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-2 underline-offset-2"
                      >
                        {t("save.openSaved")}
                      </Link>
                    </div>
                  )}
                </>
              )}
              <p className="text-sm text-ink-soft">{t("save.draftNote")}</p>
            </div>
          )}

          {stepId === "play" && playable && (
            <>
              <p className="text-sm text-ink-soft">{t("officialNote")}</p>
              <div className="-mx-4 sm:-mx-5" data-subject={playable.subjectTheme}>
                <PlayScreen key={playable.id} puzzle={playable} nextPuzzle={null} preview />
              </div>
            </>
          )}

          {step >= FIRST_BUILT_STEP && !definition && (
            <p className="text-sm text-ink-soft">{t("create.buildFirst")}</p>
          )}
        </div>
      </Window>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <GlossyButton
          variant="quiet"
          onClick={() => goto(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          {t("steps.back")}
        </GlossyButton>
        <span className="label-caps text-ink-faint">
          {t("steps.counter", { current: step + 1, total: STEP_IDS.length })}
        </span>
        <GlossyButton
          onClick={() => goto(Math.min(STEP_IDS.length - 1, step + 1))}
          disabled={step === STEP_IDS.length - 1 || (step + 1 >= FIRST_BUILT_STEP && !definition)}
        >
          {t("steps.next")}
        </GlossyButton>
      </div>
    </div>
  );
}
