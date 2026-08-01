/**
 * Sticker identity — kept free of JSX so it can be used (and tested) apart from
 * the drawing component in src/components/ui/Sticker.tsx.
 */

export const STICKER_SLUGS = [
  "cherry",
  "strawberry",
  "flower",
  "butterfly",
  "bow",
  "cassette",
  "cd",
  "star",
  "heart",
  "bunny",
  "cloud",
  "planet",
  "potion",
  "mushroom",
  "book",
] as const;

export type StickerSlug = (typeof STICKER_SLUGS)[number];

/** Small stable string hash, so nothing here depends on Math.random(). */
function hash(input: string, factor: number, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * factor + input.charCodeAt(i)) % modulo;
  }
  return h;
}

/**
 * The sticker a puzzle awards. Deterministic: the same puzzle always gives the
 * same sticker, so stickers are collectible rather than a random drop.
 */
export function stickerForSlug(slug: string): StickerSlug {
  return STICKER_SLUGS[hash(slug, 131, 100000) % STICKER_SLUGS.length];
}

/** A stable tilt in degrees (-8..8) so a sticker never jitters between renders. */
export function tiltFor(slug: string): number {
  return (hash(slug, 31, 1000) % 17) - 8;
}
