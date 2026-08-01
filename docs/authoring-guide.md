# Clueberry puzzle authoring guide

Puzzles are JSON files in `src/content/puzzles/`, validated with:

```
npx tsx scripts/check-puzzles.ts src/content/puzzles/<file>.json
```

Copy the structure of `en-body-at-a-glance.json`. Entry numbers are computed
automatically — never write them. Every file must pass the checker with zero
errors before it ships.

## Grid geometry (criss-cross style)

The library uses sparse interlocking grids (like printed subject crosswords),
not dense American grids. The validator enforces these rules, so design with
them in mind:

1. **Crossings must match.** Where an across and a down word share a cell, the
   letter must be identical (after normalization — see per-language notes).
2. **No parallel adjacency.** Two same-direction words must never occupy
   adjacent rows/columns with overlapping spans: two across words in rows 3
   and 4 whose columns overlap create phantom 2-cell vertical slots and fail
   validation. Leave at least one empty row/column between parallel words.
3. **No end-to-end touching.** A word must not start in the cell right after
   another word ends on the same line (the runs would merge).
4. **No extending a word.** Never place an open cell directly before the first
   or after the last cell of a perpendicular word's line (it would lengthen
   that word's slot).
5. **Connected.** Every word must be reachable from every other through
   crossings.
6. **No 2-letter answers. No duplicate answers. Answer never in its own clue.**

Practical method: place a long across word near the top; hang two down words
from non-adjacent letters; cross those with new across words on rows at least
2 apart; repeat downward. After placing each word, check its parallel
neighbors and line ends. Then run the checker — it reports exact cells for
any conflict.

Grid size: 9–12 in each dimension. Entries: 7–9 for easy, 8–12 for
medium/hard. Set `width`/`height` to fit the used area tightly (max used
row/col + 1).

## Clue writing

This is an editorial crossword, not a quiz. Rules:

- Mix styles deliberately: definitions ≈25%, trivia ≈15%, cultural/historical
  ≈15%, fill-in-the-blank ≈10%, scientific ≈10%, wordplay/misdirection ≈10%,
  abbreviations ≈5%, the rest free. Tag each clue with its `clueStyle`.
- Keep clues concise — usually 2–7 words. No full sentences ending in a
  period unless quoting.
- Never start multiple clues with the same formula ("A type of…", "The …").
- Easy: familiar words, clear clues, little misdirection.
  Medium: some indirection, cultural references, mild wordplay.
  Hard: concise, more misdirection, deeper knowledge — but every crossing fair.
- `difficultyRating` per entry (1–5). Averages should sit near 1.5–2 (easy),
  2.5–3 (medium), 3.5–4 (hard).
- Facts must be true. If a clue's fact is even slightly uncertain, soften it
  or choose another angle. Add `explanation` for anything non-obvious and
  `sourceNotes` for verifiable claims.
- Never copy published crossword clues.

## Per-language notes

**English** — answers in capital A–Z.

**French** — answers uppercase and unaccented (crossword convention: É shares
a square with E). Clues in natural French with correct accents and
typography. No literal translations of English clues; use French cultural
reference points. `acceptedAlternatives` for genuine spelling variants only
(same length).

**Arabic** — one letter per cell, no diacritics anywhere. The normalizer
folds أ/إ/آ → ا and ى → ي, so crossings are checked on folded letters; write
answers in natural spelling. ة/ه are distinct unless a specific answer lists
an alternative. Keep answers single words. Titles, clues, intro, completion
message, and fact cards all in Arabic. Puzzles must be conceived in Arabic —
not translated grids.

## Fact cards

2–3 per puzzle, tied to puzzle answers. `reviewStatus: "verified"` only for
uncontroversial, easily checked facts with a named source; otherwise
`"needs_review"`. At least one card per puzzle should carry a real
`sourceTitle`.

## Metadata

- `title`, `introduction`, `completionMessage` in the puzzle's language, in
  the voice of a print puzzle page (dry, warm, no exclamation marks).
- `author`: "Clueberry Desk". `editor`: "Clueberry Desk".
- `status`: "published". `estimatedSolveTime` in seconds (240–900).
- `slug`: lowercase-latin-with-dashes, unique across the whole library, even
  for Arabic puzzles (used in URLs).
