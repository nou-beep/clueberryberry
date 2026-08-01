import { setRequestLocale } from "next-intl/server";
import { Window } from "@/components/ui/Window";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import {
  NotebookPage,
  SectionHead,
  Stamp,
  StickerLabel,
  TapeStrip,
} from "@/components/ui/bits";
import { Sticker, STICKER_SLUGS } from "@/components/ui/Sticker";
import { MotifField, SubjectMotif } from "@/components/ui/SubjectMotif";
import {
  SUBJECT_THEMES,
  subjectThemeAttrs,
  type SubjectTheme,
} from "@/lib/subject-theme";
import { PipPortrait } from "@/components/pip/PipPortrait";
import { Logo } from "@/components/layout/Logo";
import {
  IconArchive,
  IconBinder,
  IconCalendar,
  IconCheck,
  IconClock,
  IconEye,
  IconFlask,
  IconFloppy,
  IconGear,
  IconGlobe,
  IconHome,
  IconJournal,
  IconPencil,
  IconStar,
  IconWand,
} from "@/components/ui/Icons";

export const metadata = { title: "Style guide" };

const SWATCHES: Array<[string, string, string]> = [
  ["--desk", "desk", "behind windows"],
  ["--paper", "paper", "page"],
  ["--paper-bright", "paper-bright", "raised card"],
  ["--paper-sunken", "paper-sunken", "wells, title bars"],
  ["--pink", "pink", "fills, decoration"],
  ["--pink-deep", "pink-deep", "pink for text/icons"],
  ["--peach", "peach", "labels"],
  ["--coral", "coral", "margin rule"],
  ["--orange", "orange", "chemistry"],
  ["--butter", "butter", "cursor, highlights"],
  ["--cherry", "cherry", "stamps"],
  ["--mint", "mint", "correct"],
  ["--lavender", "lavender", "movies"],
  ["--sky", "sky", "games"],
  ["--sage", "sage", "biology"],
  ["--ink", "ink", "body text"],
  ["--ink-soft", "ink-soft", "secondary"],
  ["--ink-faint", "ink-faint", "labels only"],
];

/** Themes whose subjects are always presented in the archival tone. */
const ARCHIVAL_THEMES = new Set<SubjectTheme>(["ww1", "ww2"]);

const ICONS = [
  [IconHome, "home"],
  [IconCalendar, "calendar"],
  [IconFlask, "flask"],
  [IconBinder, "binder"],
  [IconJournal, "journal"],
  [IconWand, "wand"],
  [IconArchive, "archive"],
  [IconPencil, "pencil"],
  [IconGear, "gear"],
  [IconFloppy, "floppy"],
  [IconCheck, "check"],
  [IconEye, "eye"],
  [IconClock, "clock"],
  [IconStar, "star"],
  [IconGlobe, "globe"],
] as const;

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64];

/**
 * The living style guide. These are the high-fidelity mockups: real components
 * in real type and color, so they cannot drift from the implementation.
 * Internal page — deliberately not localized.
 */
export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <Logo size={56} />
        <div>
          <h1 className="font-display text-3xl">Clueberry style guide</h1>
          <p className="text-sm text-ink-soft">
            Live components. See <code className="font-mono">docs/design-system.md</code>.
          </p>
        </div>
      </header>

      {/* 1. Color */}
      <section>
        <SectionHead>1 · Color</SectionHead>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map(([token, name, use]) => (
            <li key={token} className="rounded-card border-2 border-line bg-paper-bright p-2">
              <span
                className="mb-1.5 block h-10 rounded-md border-2 border-line"
                style={{ background: `var(${token})` }}
              />
              <span className="label-caps block text-ink">{name}</span>
              <span className="block text-[11px] leading-tight text-ink-faint">{use}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          <strong>The one rule:</strong> <code className="font-mono">--pink</code> fills,{" "}
          <code className="font-mono">--pink-deep</code> writes. Only the deep tone is used for
          text, icons, and focus, so the interface stays cute and legible at once.
        </p>
      </section>

      {/* 2. Typography */}
      <section>
        <SectionHead>2 · Typography</SectionHead>
        <div className="grid gap-4 lg:grid-cols-3">
          <Window title="Display — Fraunces" static>
            <div className="p-4">
              <p className="font-display text-4xl">Pick a subject</p>
              <p className="font-display text-2xl">Inside the Cell</p>
              <p className="font-display text-lg">The Gift of the River</p>
              <p className="mt-2 text-xs text-ink-faint">
                SOFT + WONK axes. Titles, window bars, covers. Never body copy.
              </p>
            </div>
          </Window>
          <Window title="Body — Nunito" static>
            <div className="p-4">
              <p className="text-base">
                Almond-shaped alarm bell. Rounded terminals keep clue text friendly while
                staying legible at fifteen pixels.
              </p>
              <p className="mt-2 text-sm text-ink-soft">Secondary, 14px.</p>
              <p className="mt-2 text-xs text-ink-faint">
                Arabic body pairs to IBM Plex Sans Arabic.
              </p>
            </div>
          </Window>
          <Window title="Accent — Plex Mono" static>
            <div className="p-4">
              <p className="font-mono text-2xl tabular-nums">12:04</p>
              <p className="label-caps mt-1 text-ink">Biology · Easy · EN</p>
              <p className="mt-2 text-xs text-ink-faint">
                Timers, grid numbers, tiny caps labels. Sparingly.
              </p>
            </div>
          </Window>
        </div>
      </section>

      {/* 3. Spacing & elevation */}
      <section>
        <SectionHead>3 · Spacing, radii, elevation</SectionHead>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border-2 border-line bg-paper-bright p-4">
            <p className="label-caps mb-2 text-ink-faint">4px base scale</p>
            <ul className="flex items-end gap-1.5">
              {SPACING.map((s) => (
                <li key={s} className="text-center">
                  <span
                    className="block rounded-sm border-2 border-line bg-pink"
                    style={{ width: 16, height: s }}
                  />
                  <span className="font-mono text-[10px] text-ink-faint">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border-2 border-line bg-paper-bright p-4">
            <p className="label-caps mb-2 text-ink-faint">Hard offsets, never blur clouds</p>
            <div className="flex flex-wrap gap-3">
              {[
                ["shadow-sticker", "shadow-sticker"],
                ["shadow-card", "shadow-card"],
                ["shadow-window", "shadow-window"],
              ].map(([cls, label]) => (
                <span
                  key={label}
                  className={`inline-flex h-12 items-center rounded-xl border-2 border-line bg-paper px-3 font-mono text-[11px] ${cls}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Components */}
      <section>
        <SectionHead>4 · Components</SectionHead>
        <div className="grid gap-4 lg:grid-cols-2">
          <Window title="Buttons" icon={<IconStar className="size-4" />} static>
            <div className="flex flex-wrap items-center gap-2 p-4">
              <GlossyButton variant="primary">Play</GlossyButton>
              <GlossyButton>Check</GlossyButton>
              <GlossyButton variant="quiet">Skip</GlossyButton>
              <GlossyButton variant="danger">Reveal all</GlossyButton>
              <GlossyButton size="sm">Small</GlossyButton>
              <GlossyButton disabled>Disabled</GlossyButton>
              <GlossyLink href="/styleguide">As a link</GlossyLink>
            </div>
            <p className="px-4 pb-4 text-xs text-ink-faint">
              Hover for the 3-dot sparkle; press for the 2px push. 44px minimum target.
            </p>
          </Window>

          <Window title="Sticker labels & stamps" static>
            <div className="flex flex-wrap items-center gap-2.5 p-4">
              <StickerLabel tone="mint">Biology</StickerLabel>
              <StickerLabel tone="butter">Easy</StickerLabel>
              <StickerLabel tone="sky">Games</StickerLabel>
              <StickerLabel tone="pink">Français</StickerLabel>
              <StickerLabel tone="lavender">11 words</StickerLabel>
              <Stamp>Completed</Stamp>
            </div>
          </Window>

          <Window title="Notebook page" static>
            <div className="p-3">
              <NotebookPage className="py-4">
                <p className="font-display text-lg">July</p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>✓ Memory</li>
                  <li>✓ Human Skeleton</li>
                  <li>✓ Ancient Egypt</li>
                </ul>
              </NotebookPage>
            </div>
          </Window>

          <Window title="Window in a window" static>
            <div className="p-4">
              <p className="text-sm text-ink-soft">
                The title bar is pinstriped in the current subject accent at low opacity, with
                three decorative dots on the trailing side.
              </p>
              <div className="relative mt-3 h-16 rounded-card border-2 border-line bg-paper-sunken">
                <TapeStrip className="-top-2 start-6" />
                <TapeStrip className="-top-2 end-6" rotate={4} />
                <p className="p-3 pt-4 text-xs text-ink-faint">Taped down.</p>
              </div>
            </div>
          </Window>
        </div>
      </section>

      {/* 5. Icons */}
      <section>
        <SectionHead>5 · Icons</SectionHead>
        <ul className="flex flex-wrap gap-2">
          {ICONS.map(([Icon, name]) => (
            <li
              key={name}
              className="flex w-20 flex-col items-center gap-1 rounded-card border-2 border-line bg-paper-bright p-2 text-ink"
            >
              <Icon className="size-6" />
              <span className="font-mono text-[10px] text-ink-faint">{name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink-soft">
          24px box, 1.75px round strokes, one charm off-center. Icon-only controls always carry
          an <code className="font-mono">aria-label</code>.
        </p>
      </section>

      {/* 6. Stickers */}
      <section>
        <SectionHead>6 · Stickers</SectionHead>
        <ul className="flex flex-wrap gap-3 rounded-card border-2 border-line bg-paper-bright p-4">
          {STICKER_SLUGS.map((slug) => (
            <li key={slug} className="flex w-[74px] flex-col items-center gap-1">
              <Sticker slug={slug} size={56} />
              <span className="font-mono text-[10px] text-ink-faint">{slug}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-card border-2 border-line bg-paper-bright p-4">
          <span className="label-caps text-ink-faint">Locked slots</span>
          {(["cherry", "bunny", "planet"] as const).map((s) => (
            <Sticker key={s} slug={s} size={56} locked />
          ))}
          <span className="label-caps ms-4 text-ink-faint">Awarded</span>
          <Sticker slug="strawberry" size={56} dropIn />
        </div>
      </section>

      {/* 7. Subject decoration */}
      <section>
        <SectionHead>7 · Subject decoration</SectionHead>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SUBJECT_THEMES.map((theme) => {
            const archival = ARCHIVAL_THEMES.has(theme);
            return (
              <li
                key={theme}
                {...subjectThemeAttrs(theme, archival ? "archival" : "playful")}
                className="rounded-card border-2 border-line bg-paper-bright p-3 text-center"
              >
                <span className="text-accent">
                  <SubjectMotif subject={theme} className="mx-auto size-9" />
                </span>
                <span className="label-caps mt-1 block text-ink">{theme}</span>
                <span
                  className="mt-1.5 block h-3 rounded-full border-2 border-line"
                  style={{ background: "var(--accent)" }}
                />
                {archival ? (
                  <span className="mt-1 block font-mono text-[10px] text-ink-faint">archival</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-sm text-ink-soft">
          Only this layer changes per subject — layout, type, and controls stay identical. Accents
          are used for text and icons, so every one of them clears 4.5:1 on cream in both themes.
        </p>

        <h3 className="label-caps mt-5 text-ink-faint">Playful vs archival</h3>
        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          {(
            [
              ["mythology", "playful", "Mythology · playful"],
              ["ww2", "archival", "Second World War · archival"],
            ] as const
          ).map(([theme, tone, title]) => (
            <div key={theme} {...subjectThemeAttrs(theme, tone)}>
              <Window title={title} icon={<SubjectMotif subject={theme} className="size-4" />} static>
                <div className="relative isolate overflow-hidden p-4">
                  <MotifField subject={theme} />
                  <div className="flex flex-wrap items-center gap-2">
                    <StickerLabel tone="butter">Easy</StickerLabel>
                    <StickerLabel tone="mint">12 words</StickerLabel>
                    <StickerLabel tone="accent">EN</StickerLabel>
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">
                    Same window, same type, same borders.{" "}
                    <span className="text-accent">Accent text</span> keeps its contrast either way.
                  </p>
                  <div className="mt-3">
                    <GlossyButton>Play</GlossyButton>
                  </div>
                </div>
              </Window>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          <code className="font-mono">data-tone=&quot;archival&quot;</code> suppresses the motif
          field, drops the pinstripe from the title bar, drains the saturation out of sticker
          labels, and flattens the button gloss. Ink, borders, focus rings, and the grid are
          untouched — it is a reduction of decoration, not a change of contrast.
        </p>
      </section>

      {/* 8. Grid */}
      <section>
        <SectionHead>8 · The grid (never decorated)</SectionHead>
        <div className="flex flex-wrap items-start gap-6 rounded-card border-2 border-line bg-paper-bright p-4">
          <div className="w-[220px] overflow-hidden rounded-md border-2 border-line bg-cell-line p-px">
            {[
              ["H", "E", "A", "R", "T"],
              [null, null, "P", null, null],
              [null, "O", "R", "B", null],
              [null, null, "I", null, null],
              [null, null, "L", null, null],
            ].map((row, r) => (
              <div key={r} className="grid grid-cols-5">
                {row.map((cell, c) => {
                  const active = r === 0 && c === 0;
                  const inWord = r === 0 && c > 0;
                  return (
                    <span
                      key={c}
                      className={`relative m-px flex aspect-square items-center justify-center rounded-[3px] text-lg font-semibold ${
                        cell === null
                          ? "bg-cell-block"
                          : active
                            ? "bg-cell-active text-cell-ink"
                            : inWord
                              ? "bg-cell-word text-cell-ink"
                              : "bg-cell text-cell-ink"
                      }`}
                    >
                      {cell}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <ul className="space-y-1.5 text-sm">
            <li>
              <span className="inline-block size-4 rounded-[3px] border border-line bg-cell-active align-middle" />{" "}
              cursor
            </li>
            <li>
              <span className="inline-block size-4 rounded-[3px] border border-line bg-cell-word align-middle" />{" "}
              current word
            </li>
            <li className="text-correct">✓ confirmed (glyph, not just color)</li>
            <li className="text-wrong">✗ wrong</li>
            <li className="text-revealed">• revealed</li>
            <li className="pt-1 text-ink-faint">Cell letters: 15:1 contrast, always.</li>
          </ul>
        </div>
      </section>

      {/* 9. Pip */}
      <section>
        <SectionHead>9 · Pip</SectionHead>
        <div className="flex flex-wrap items-end gap-6 rounded-card border-2 border-line bg-paper-bright p-4">
          {(["idle", "thinking", "cheerful"] as const).map((pose) => (
            <div key={pose} className="text-center">
              <PipPortrait pose={pose} size={80} />
              <span className="font-mono text-[11px] text-ink-faint">{pose}</span>
            </div>
          ))}
          <p className="max-w-sm text-sm text-ink-soft">
            Three static poses in the icon line weight. Pip changes pose rather than looping an
            animation, lives in a 260px draggable window, and never becomes a chat transcript.
          </p>
        </div>
      </section>

      {/* 10. Motion */}
      <section>
        <SectionHead>10 · Motion</SectionHead>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Button pop", "120ms · scale 1.03"],
            ["Sparkle", "220ms · 3 dots, staggered"],
            ["Window open", "180ms · scale .97→1"],
            ["Page flip", "200ms · rotateY 6°"],
            ["Stamp", "160ms · scale 1.25→1"],
            ["Sticker drop", "280ms · fall + settle tilt"],
            ["Tab switch", "120ms · 2px shift"],
            ["Save", "140ms · floppy blink"],
          ].map(([name, spec]) => (
            <div key={name} className="rounded-card border-2 border-line bg-paper-bright p-3">
              <p className="font-display text-sm">{name}</p>
              <p className="font-mono text-[11px] text-ink-faint">{spec}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Nothing exceeds 300ms. Reduced motion collapses every transform to a single opacity
          frame — states still appear, they just don&apos;t travel.
        </p>
      </section>
    </div>
  );
}
