# Clueberry — Design System

> A little notebook of crosswords.

## 0. The idea in one paragraph

Clueberry looks like a website someone made in 2004 for a club they loved, and
then kept tending for twenty years — so the charm survived but the craft caught
up. Rounded windows with title bars. Binder tabs instead of a nav bar. Stickers
you actually collect. A tiny helper in the corner of the screen. Cream paper,
bubblegum pink, a strawberry here and a bow there. **The crossword grid is the
one place decoration never goes**: it stays white, square, and high-contrast,
because the puzzle is the point and everything else is the room the puzzle sits
in.

**Mascot:** *Pip*, a small round bunny with a pencil tucked behind one ear.
Pip lives in a tiny draggable window called **Pip's Corner**, offers hints,
recommends puzzles, and helps build new ones. Pip is never a chat bubble and
never takes over the screen.

**Anti-brief (hard rules).** No SaaS cards, no glassmorphism, no purple
gradient hero, no giant rounded dashboard, no 3D stock icons, no confetti
explosion, no "You're crushing it!", no streak-shaming, no energy/loot systems,
no futuristic-AI visuals, no oceans of empty whitespace.

---

## 1. Color palette

Warm, paper-based, deliberately non-neutral. Every value below is a token in
`src/app/globals.css`. Light is the primary theme; **Lamp** (dark) is a
warm evening mode, not a black cyberpunk mode.

### Surfaces

| Token | Light | Lamp (dark) | Use |
| --- | --- | --- | --- |
| `--desk` | `#FFE6EE` | `#2A2228` | the pink desk *behind* windows |
| `--paper` | `#FFF8EE` | `#332A2E` | page / window body |
| `--paper-bright` | `#FFFDF8` | `#3B3135` | raised card, notebook page |
| `--paper-sunken` | `#FFEFDF` | `#291F24` | wells, inputs, sunken strips |
| `--tape` | `#FFE9B8` | `#5A4A32` | washi-tape accents |

### Ink (text)

| Token | Light | Lamp | Notes |
| --- | --- | --- | --- |
| `--ink` | `#3B2A2F` | `#FBF3EA` | body + headings. 11.4:1 on `--paper` |
| `--ink-soft` | `#6A5158` | `#D8C6C0` | secondary text. 5.4:1 |
| `--ink-faint` | `#8A6E76` | `#B49E9C` | labels only, never body. 4.6:1 |
| `--line` | `#4A3339` | `#EADFD8` | the 2px "sticker outline" border |
| `--line-soft` | `#E7CFC1` | `#4B3E43` | hairlines, dotted rules |

Warm brown-plum instead of black: black on cream reads as a corporate print
stylesheet; `#3B2A2F` reads as pencil on a notebook page.

### Primary

`--pink` `#FF7FAE` · `--pink-deep` `#C62E68` · `--peach` `#FFC79E`
`--coral` `#FF8A6B` · `--orange` `#F0912F` · `--butter` `#FFE28A`
`--cream` `#FFF8EE`

`--pink` is for fills and decoration. **`--pink-deep` is the only pink allowed
for text, icons, and focus** — it clears 4.5:1 on cream. This split is the
single most important rule in the palette: it is what keeps the interface cute
*and* legible.

### Accents

`--cherry` `#DC2F3C` · `--mint` `#7FD1AE` · `--lavender` `#B8A2EE`
`--sky` `#7FC3EC` · `--sage` `#9DBB93`

Accents are for stickers, subject decoration, and state (mint = correct,
cherry = wrong). Never as page backgrounds.

### Grid (never themed decoratively)

| Token | Light | Lamp |
| --- | --- | --- |
| `--cell` | `#FFFFFF` | `#F6EFE6` |
| `--cell-ink` | `#231A1D` | `#231A1D` |
| `--cell-block` | `#F4E7D9` | `#2A2228` |
| `--cell-active` | `#FFDD7A` | `#F2C64F` |
| `--cell-word` | `#FFE3EE` | `#FFD7E6` |

In Lamp mode the grid stays a light paper card — a dark crossword is harder to
read and loses the "puzzle page" feel. Cell letters are always near-black on
near-white: 15:1. Blank squares are pale paper rather than heavy black: the
library uses sparse criss-cross grids, where unused cells should read as empty
page. High-contrast mode switches them to solid black for maximum separation.

### Subject decoration

Only the decorative layer changes per subject; layout, type, and controls stay
identical. The full accent table with contrast ratios lives in
`src/app/globals.css`; the registry of theme keys is
`src/lib/subject-theme.ts`, and both motif maps are typed against it so a theme
cannot be added without being drawn.

| Subject | Accent | Motifs |
| --- | --- | --- |
| Biology | sage-green | pressed flowers, leaves, microscope, sprout |
| Psychology | ink pink | hearts, notebook lines, ink drops, stars |
| Chemistry | warm orange | beakers, bottles, bubbles, formulas |
| History | vintage sepia | postage stamps, postcards, map fragments |
| Games | sky cobalt | pixel hearts, controllers, cartridges, stars |
| Movies | lavender | tickets, popcorn, film strip |
| Literature | rose | books, bookmarks, pressed flower |
| Geology | amethyst | crystal, rock sample, earth layers |
| Geography | map green | globe with meridians |
| Finance Facts | coin gold-green | calculator, coin, receipt paper |
| Geopolitics | globe ink blue | globe, postal stamp, passport plate |
| General Knowledge | neutral ink | notebook tab, question mark |
| Fun Facts | stamp red-orange | exclamation stamp, star, envelope |
| Mythology | deep terracotta | temple, crescent moon |
| Greek myth | pottery blue | column, laurel |
| Egyptian myth | gold | papyrus, decorative band, star |
| Music | cassette teal | cassette, headphones |
| Books | mulberry | bookmark in a book |
| Taylor Swift | pink-violet | friendship bracelet, star |
| One Direction | magazine red | concert ticket, heart |
| World War I / II | sepia / oxidised slate | dispatch sheet, folded map |

**Fandom decoration never uses official branding** — no album artwork, no
logos, no trademarked wordmarks. Generic craft and magazine objects only.

### Tone: playful and archival

`tone` is data on the subject (and optionally overridden per collection), not a
per-page decision. `playful` is the default. **`archival`** is for subjects
where cheerfulness would be inappropriate — the world wars, and the Holocaust
collection specifically. Applying `data-tone="archival"` to a subtree:

- suppresses the repeating motif field entirely
- removes the pinstripe from window title bars and the gloss from buttons
- mutes sticker-label saturation
- restricts the accent to desaturated sepia/slate

It is a *reduction* of decoration, never a colour inversion: ink, borders,
focus rings, and contrast are untouched, so nothing becomes harder to read.
Use `subjectThemeAttrs(theme, tone)` from `src/lib/subject-theme.ts` on the
outermost element a page owns.

### High-contrast mode

`[data-contrast="high"]` drops decorative tints, forces `#000` ink on `#FFF`,
promotes every border to 2px solid black, and removes gloss gradients. Stickers
keep their shapes but gain a black outline. Nothing decorative is load-bearing,
so nothing breaks.

---

## 2. Typography

Three **roles**. Because the app is trilingual, two roles carry a script-paired
face — a single family cannot serve Latin and Arabic display well.

| Role | Latin | Arabic | Use |
| --- | --- | --- | --- |
| Display | **Fraunces** (opsz, SOFT 80, WONK 1) | **Baloo Bhaijaan 2** | page titles, window titles, puzzle titles, numbers on covers |
| Body | **Nunito** | **IBM Plex Sans Arabic** | everything readable: clues, paragraphs, buttons, labels |
| Accent | **IBM Plex Mono** | (Plex Mono digits + Plex Sans Arabic words) | timers, grid numbers, tiny caps labels, stats |

Fraunces with high SOFT and WONK is a magazine serif with a wobble — scrapbook
title energy without a novelty font. Nunito's rounded terminals match the
glossy buttons and stay legible at 14px. Plex Mono is the nerdy stationery
detail: stamped label text, `12:04` timers, cell numbers.

**Rules**
- Body copy is never Fraunces and never mono. Clues are Nunito 15–16px /1.5.
- Display sizes: `2.5rem` page title, `1.5rem` window title, `1.125rem` card
  title. Line-height 1.1, letter-spacing `-0.01em`.
- `.label-caps`: Plex Mono, uppercase, `0.14em` tracking, 11px, `--ink-faint`.
  Arabic drops uppercase and tracking (meaningless in Arabic) and uses Plex
  Sans Arabic at 12px.
- Minimum body size 15px. `[data-textsize="large"]` scales the root to 118%.
- Optional dyslexia-friendly override swaps body to Verdana/Tahoma with looser
  letter- and word-spacing. It is a preference, never a default.
- Never set a paragraph in all caps; never letterspace Arabic.

---

## 3. Spacing, radii, elevation

**Base 4px.** Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Section rhythm is
32 (mobile) / 48 (desktop). Card padding 16–20. Window padding 20–24.

**Radii:** window `20px` · card `16px` · tab `14px 14px 0 0` · button `12px`
(pill `999px` for sticker-labels) · input `10px` · **grid cell `3px`** (the grid
stays square-ish on purpose) · sticker `999px` or die-cut path.

**Borders:** `2px solid var(--line)` is the default everywhere — the outline is
the brand. `3px` for the active binder tab and primary buttons. Hairline
`1px var(--line-soft)` for internal rules; dotted for notebook lines.

**Elevation** is a hard offset shadow, never a soft blur cloud:

```
--shadow-sticker: 0 2px 0 0 var(--line);        /* buttons at rest */
--shadow-card:    3px 3px 0 0 rgba(74,51,57,.18);
--shadow-window:  5px 5px 0 0 rgba(74,51,57,.20);
--shadow-lift:    5px 6px 0 0 rgba(74,51,57,.24); /* hover */
```

In RTL every horizontal offset mirrors (`-3px 3px …`) via a `[dir="rtl"]`
override, so light appears to come from the same side as the reading direction.

**Touch targets:** minimum 44×44px. Grid cells are minimum 34px on mobile and
never shrink below it — if the grid would get smaller than the viewport allows,
the grid scrolls, the cells don't shrink.

---

## 4. Component library

Every component is 2px-outlined, warm-surfaced, and has a real focus state
(`3px solid var(--focus)` + 2px offset, `--focus: #2B5FD9`, which clears 3:1
against both cream and pink).

### `Window`
The workhorse container. Rounded 20px, 2px ink border, `--shadow-window`, and a
**title bar**: 32px tall, pinstriped in the subject accent at 12% opacity, with
a display-font title, an optional tiny icon on the leading side, and three
decorative dots on the trailing side (`--mint`, `--butter`, `--pink`). Variants:
`plain` (no bar), `tabbed` (tabs sit on top and merge into the border).

### `BinderTabs`
Main navigation. Tabs are 14px-radius-on-top, 2px-outlined, overlap each other
by 2px, and the active tab sits 2px lower with its bottom border removed so it
visually merges into the page below. Each tab has a tiny icon + label. On mobile
the tab strip scrolls horizontally with `scroll-snap`, and a "…" tab opens the
rest in a sheet. Semantics: `<nav>` + `<a aria-current="page">`, not a listbox.

### `GlossyButton`
The 2004 pill: 12px radius, 2px ink border, a top-half gradient from
`rgba(255,255,255,.55)` to transparent, `0 2px 0 var(--line)` at rest. Hover
lifts 1px and gains a **3-dot sparkle** in the trailing corner. Active presses
into `0 0` shadow with `translateY(2px)`. Variants: `primary` (pink fill,
`--ink` text — checked at 4.9:1), `secondary` (cream fill), `quiet` (no fill,
border only), `danger` (cherry). Sizes 44 / 36 (compact toolbar only, with a
44px hit-area pseudo-element).

### `StickerLabel`
A pill "sticker" for metadata: subject, difficulty, language, status. White
die-cut ring, flat accent fill, `--ink` text, optional 12px icon, rotated
`-1.5deg` by default so it looks stuck on rather than laid out. Non-interactive.

### `Stamp`
Rubber-stamp mark used for completion. Rotated `-8deg`, 2.5px double outline in
`--cherry` at 85% opacity, display font, uppercase, slightly blotchy via a
mask. Used for "COMPLETED", subject mastery, and daily archive marks.

### `TapeStrip`
A strip of washi tape (`--tape`, 8% noise, torn edges via mask) that anchors
photos/cards to the page at a slight angle. Purely decorative, `aria-hidden`.

### `NotebookPage`
Cream page with a dotted 28px baseline grid, a red left margin rule
(`--coral` at 40%, mirrored in RTL), and three punch-holes on the leading edge.
The Journal and Collections use it.

### `CollectionCover`
A book/binder cover: 16px radius on the trailing side, 4px flat spine on the
leading side, an illustrated motif field, a display-font title on a
`StickerLabel`-style plate, and a `Stamp` when complete. Hover: rotates
`-1deg` and lifts.

### `StickerSheet` / `StickerSlot`
The collectible grid. Slots are dashed 2px circles at 30% opacity when empty
(with a faint silhouette of the sticker to be earned) and hold a full-color
die-cut sticker when earned. Earned stickers are draggable onto journal pages;
placement persists.

### `PipWindow`
The helper. 260×auto, `Window` with a `plain` bar, always ≥16px from the
viewport edge, draggable by its bar, collapsible to a 56px "Pip button" that
docks to the trailing-bottom corner. Contains: Pip's portrait (SVG, 3 poses:
idle / thinking / cheerful), one line of text, and 2–3 `GlossyButton`s of
concrete actions. **Never a message list, never a text stream, never a typing
indicator.** Announced to screen readers via `role="complementary"` +
`aria-live="polite"` on its line of text.

### Form controls
Inputs: cream fill, 2px border, 10px radius, 44px tall, focus ring as above.
Toggles: a 2px-outlined track with a *chunky* 20px knob and a tiny check/× so
state is not color-only. Selects keep the native control (accessibility) with a
custom 2px-outlined wrapper and a small caret icon.

### Grid components (`CrosswordGrid`, `CluePanel`, `ActiveClueBar`)
Unchanged in structure from the engine; restyled: 2px outer border, 1px
`--line-soft` cell gridlines, `--cell-active` for the cursor, `--cell-word` for
the current word, mint check-marks and cherry ✗ overlays (shape + color, never
color alone). **No decoration inside the grid frame.** Decoration may sit in the
margins of the *page*, never over cells.

---

## 5. Icon style

- 24×24 box, **1.75px stroke**, `round` caps and joins, no fills except an
  occasional 2px accent dot.
- Geometry is simple and slightly plump: a leaf is one closed curve, a
  controller is a rounded rectangle with two circles.
- One optional charm per icon (a sparkle, a dot, a tiny heart) placed
  off-center — this is the "handmade" tell.
- Icons inherit `currentColor` and never carry meaning alone: every icon-only
  control has an `aria-label`, and stateful icons pair with text or shape.
- 16px variant thickens to 2px stroke and drops the charm.

## 6. Sticker style guide

Stickers are the collectible currency; they must feel *printed*, not rendered.

**Construction (64×64 canvas, exported as inline SVG):**
1. **Die-cut ring** — 3px `#FFF` outline offset around the whole silhouette,
   then a 1.5px `--line` outline outside that. This double edge is what reads as
   "peeled off a sheet".
2. **Flat base fill** — one accent color at full saturation.
3. **One shade** — a single darker tone (multiply-equivalent, no gradient) on
   the lower-trailing third.
4. **One highlight** — a soft white blob at 55% in the upper-leading third,
   plus a 2px white speck for gloss.
5. **Detail lines** — 1.75px `--line` at 70% opacity, matching the icon
   language.
6. **Shadow** — `0 2px 0 rgba(74,51,57,.18)`, tightened when placed.

**Rotation:** each sticker carries a stable pseudo-random tilt between `-8deg`
and `+8deg`, derived from its slug so it never jitters between renders.

**The set (15):** cherry, strawberry, flower, butterfly, bow, cassette, CD,
star, heart, bunny, cloud, planet, potion, mushroom, book.

**Awarding:** one sticker per completed puzzle, assigned deterministically from
the puzzle slug so the same puzzle always yields the same sticker (collectible,
not random-loot). Duplicates increase a count rather than being discarded.
Never purchasable, never time-gated, never lost.

## 7. Animation principles

Tiny, tactile, and short. Everything is 120–220ms `cubic-bezier(.2,.8,.3,1)`
except the sticker drop (280ms).

| Motion | Spec |
| --- | --- |
| Button pop | `scale(1) → 1.03`, 120ms; press `translateY(2px)` + shadow to 0 |
| Sparkle | 3 dots, 4px, staggered 40ms, fade+rise 6px, 200ms, on hover only |
| Window open | `scale(.97) → 1` + opacity, 180ms, origin at the invoking control |
| Page flip | `rotateY(-6deg) → 0` on the leading edge, 200ms |
| Stamp | `scale(1.25) → 1` + opacity 0→.9, 160ms, `-8deg` hold |
| Sticker drop | `translateY(-10px) rotate(0) → rest tilt`, 280ms, one 4% squash |
| Tab switch | 2px vertical shift + border merge, 120ms, no crossfade |
| Save | floppy icon blinks once (140ms), then the word "Saved" fades in |

**Banned:** confetti bursts, full-screen wipes, parallax, floating blobs,
looping gradients, anything over 300ms, anything that moves the grid.

`prefers-reduced-motion` (and the in-app Reduce motion setting) collapse every
transform animation to a 1-frame opacity change; the stamp and sticker still
*appear*, they just don't travel. No motion is required to understand any state.

## 8. Illustration direction

- **Line + flat fill.** 2px outlines, 2–3 flat tones per object, one highlight.
  No airbrush, no 3D, no photographic texture.
- **Objects, not people.** Stationery, plants, lab glass, stamps, cartridges,
  snacks. Avoids the corporate-illustration trap entirely.
- **Corner-dwellers.** Decorations occupy margins, corners, and the space
  *between* sections. Density is capped: at most 3 decorative elements per
  viewport, and 0 inside the grid frame.
- **Subject fields.** Each subject page gets a repeating motif field at 6–8%
  opacity behind the *page*, never behind text or cells.
- **Pip** is 3 static SVG poses, drawn in the same line weight as the icons:
  round body, long ears, pencil behind the ear, two dot eyes and a small
  stitch-mouth. Pip has no animation loop — Pip changes pose.
- Everything decorative is `aria-hidden` and inert to pointer events.

## 9. Accessibility contract

Non-negotiable, and checked per screen:

- Body text ≥ 4.5:1, large text and UI borders ≥ 3:1. Verified pairs are listed
  in §1.
- Focus is always visible: `3px --focus` + 2px offset, never `outline: none`.
- Every state has a non-color signal: ✗ glyph for wrong, ✓ for confirmed, a
  dot for revealed, text on every badge.
- Full keyboard play: arrows, Tab/Shift+Tab between clues, Space to flip
  direction, Backspace semantics matching print apps. Shortcuts documented in
  the UI.
- Screen readers: `role="grid"` with per-cell labels ("Row 3, column 5, H"),
  clue lists as ordered lists with `aria-current`, `aria-live` regions for
  check/reveal results and for Pip.
- RTL is a first-class layout: logical properties throughout, mirrored shadows
  and tabs, Arabic on-screen keyboard, and arrow keys that follow the screen.
- Reduced motion, high contrast, large text, and dyslexia-friendly font are all
  user settings, persisted, applied pre-paint.
- Sound is off-by-default-able, and no information is conveyed by sound alone.

## 9a. Library organisation

The browser never shows every category at once. Subjects are grouped into four
shelves, and the grouping is stored in the database (`Subject.section`):

| Shelf | Contents |
| --- | --- |
| **Learn** | Biology, Psychology, Chemistry, Geology, Geography, Finance Facts, Geopolitics, History, World War I, World War II |
| **Know** | General Knowledge, Fun Facts, Mythology, Greek Mythology, Egyptian Mythology |
| **Culture** | Music, Books, Literature, Games |
| **Fandom** | Taylor Swift, One Direction, and future artist collections |

Whole-library search (`/search`) covers subject names, collection names, and
puzzle titles, folding case and Latin accents so "genetique" finds
"Génétique".

**No interface component contains a subject list.** Subjects, collections, and
puzzle metadata live in the database, seeded from `src/content/taxonomy/*`; a
new category is a data change plus (if it needs its own look) a motif and an
accent in the registry.

## 10. Screen inventory (mockups)

The high-fidelity mockups are **live** at `/styleguide` — real components in the
real type and color, so they cannot drift from the implementation. Screens:

1. **Home** — an open notebook: featured puzzle window, Continue strip, subject
   binder covers, daily challenge card, recent collections, journal peek.
2. **Daily** — today's window + the three language editions + streak ribbon.
3. **Puzzle** — grid hero, clue panels (desktop) / active clue + keyboard
   (mobile), compact toolbar, Pip docked.
4. **Subjects index & subject page** — motif field, topic tabs, puzzle cards.
5. **Collections** — shelf of binder covers; collection page as a binder.
6. **Journal** — scrapbook months, completed list, earned stickers, streak.
7. **Playground / Create** — theme picker + generated puzzle, clearly separated
   from official puzzles.
8. **Profile** — a desk: favorite stickers, language badges, recent puzzles.
9. **Settings** — a sheet of labeled toggles.
10. **Editor** — the constructor desk, kept plainer on purpose (it is a tool).
