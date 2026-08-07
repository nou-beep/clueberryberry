import type { Tone } from "@/content/taxonomy/types";

/**
 * The decorative theme registry. A theme key resolves to three things:
 *
 *   1. an accent colour   — `[data-subject="<key>"]` in `src/app/globals.css`
 *   2. a motif + field    — `SubjectMotif` / `MotifField`
 *   3. a tone treatment   — `[data-tone="archival"]` in `src/app/globals.css`
 *
 * Adding a theme means adding it to this list, to both accent blocks (light and
 * lamp), and to both maps in `SubjectMotif.tsx` — the maps are typed against
 * `SubjectTheme`, so TypeScript will refuse to compile until they are complete.
 */
export const SUBJECT_THEMES = [
  "biology",
  "psychology",
  "chemistry",
  "geology",
  "geography",
  "finance",
  "geopolitics",
  "history",
  "ww1",
  "ww2",
  "general",
  "funfacts",
  "mythology",
  "greek",
  "egyptian",
  "music",
  "books",
  "literature",
  "movies",
  "games",
  "taylor",
  "onedirection",
  "technology",
  "space",
  "language",
  "animals",
  "food",
  "art",
  "internet",
  "y2k",
  "morocco",
  "arabworld",
  "frenchculture",
  "religion",
] as const;

export type SubjectTheme = (typeof SUBJECT_THEMES)[number];

/** The theme used when a subject names a key the registry does not know. */
export const FALLBACK_THEME: SubjectTheme = "general";

export function isSubjectTheme(value: string): value is SubjectTheme {
  return (SUBJECT_THEMES as readonly string[]).includes(value);
}

/**
 * The attribute pair that turns a subtree into "this subject, this tone".
 * Spread it onto the outermost element a page owns:
 *
 * ```tsx
 * <div {...subjectThemeAttrs(subject.theme, subject.tone)}>…</div>
 * ```
 *
 * `data-subject` swaps `--accent` / `--accent-soft`; `data-tone="archival"`
 * strips decoration (motif field, title-bar pinstripe, sticker saturation)
 * without touching ink, borders, or focus — a reduction, never an inversion.
 * Both are always emitted so a nested playful subtree can override an
 * archival ancestor. Both attributes are always emitted so the pair can be
 * read back off the DOM in tests.
 */
export function subjectThemeAttrs(
  theme: string,
  tone: Tone = "playful"
): { "data-subject": SubjectTheme; "data-tone": Tone } {
  return {
    "data-subject": isSubjectTheme(theme) ? theme : FALLBACK_THEME,
    "data-tone": tone,
  };
}
