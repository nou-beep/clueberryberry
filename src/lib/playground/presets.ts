import type { PuzzleLanguage } from "@/lib/crossword/types";
import { themesFor, THEME_META, type PlaygroundTheme } from "./banks";
import { defaultForm, reconcile, type PlaygroundForm } from "./form";

/**
 * One-tap starting points.
 *
 * Every preset resolves to a bank that actually exists — `presetsFor` drops any
 * whose word bank is missing in the language it needs, so a chip never promises
 * a puzzle the generator cannot build.
 */
export const PRESET_IDS = [
  "easy-biology",
  "medium-general",
  "hard-music",
  "french-literature",
  "arabic-mythology",
  "one-direction",
  "from-notes",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

interface PresetDef {
  id: PresetId;
  /** Pinned puzzle language, or null to keep whatever the form already has. */
  language: PuzzleLanguage | null;
  /** Bank the preset builds from. Absent for the notes preset. */
  theme?: PlaygroundTheme;
  patch: Partial<PlaygroundForm>;
}

const PRESETS: PresetDef[] = [
  {
    id: "easy-biology",
    language: null,
    theme: "plants",
    patch: { difficulty: "easy", size: "small", source: "bank" },
  },
  {
    id: "medium-general",
    language: null,
    theme: "general-knowledge",
    patch: { difficulty: "medium", size: "medium", source: "bank" },
  },
  {
    id: "hard-music",
    language: "en",
    theme: "taylor-swift",
    patch: { difficulty: "hard", size: "medium", source: "bank" },
  },
  {
    id: "french-literature",
    language: "fr",
    theme: "literature",
    patch: { difficulty: "medium", size: "medium", source: "bank" },
  },
  {
    id: "arabic-mythology",
    language: "ar",
    theme: "greek-mythology",
    patch: { difficulty: "medium", size: "medium", source: "bank" },
  },
  {
    id: "one-direction",
    language: "en",
    theme: "one-direction",
    patch: { difficulty: "hard", size: "medium", source: "bank" },
  },
  {
    id: "from-notes",
    language: null,
    patch: { source: "notes", size: "small" },
  },
];

/** Presets whose bank exists, given the language the player is working in. */
export function presetsFor(language: PuzzleLanguage): PresetId[] {
  return PRESETS.filter((preset) => {
    if (!preset.theme) return true;
    return themesFor(preset.language ?? language).includes(preset.theme);
  }).map((preset) => preset.id);
}

/** The language a preset will switch the form to, for the chip's caption. */
export function presetLanguage(id: PresetId): PuzzleLanguage | null {
  return PRESETS.find((preset) => preset.id === id)?.language ?? null;
}

/** Apply a preset to the current form. Unknown ids leave the form untouched. */
export function applyPreset(form: PlaygroundForm, id: PresetId): PlaygroundForm {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) return form;

  const language = preset.language ?? form.language;
  const base: PlaygroundForm = { ...defaultForm(language), ...preset.patch, language };
  if (!preset.theme) {
    // The notes preset keeps whatever text has already been pasted.
    return reconcile({ ...base, notes: form.notes, title: form.title });
  }
  return reconcile({
    ...base,
    theme: preset.theme,
    subject: THEME_META[preset.theme].subject,
    collection: THEME_META[preset.theme].collection,
  });
}
