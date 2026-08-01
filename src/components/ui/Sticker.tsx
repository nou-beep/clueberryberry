/**
 * The collectible sticker set. Each is built to the recipe in
 * docs/design-system.md §6: die-cut white ring, flat base, one shade, one
 * highlight, line details — so they read as printed and peeled, not rendered.
 *
 * Drawn on a 64×64 canvas. Colors are literal (not tokens) because a sticker
 * looks the same in every theme, like a real one would.
 */

import { tiltFor, type StickerSlug } from "@/lib/stickers";

// Re-exported so existing call sites can keep importing from this component.
export { STICKER_SLUGS, stickerForSlug } from "@/lib/stickers";
export type { StickerSlug } from "@/lib/stickers";

const L = "#4a3339"; // outline
const shade = "rgba(74,51,57,0.16)"; // the single shade tone
const gloss = "rgba(255,255,255,0.55)";

/** Shape layers per sticker: base fill(s), shade, highlight, detail lines. */
const ART: Record<StickerSlug, React.ReactNode> = {
  cherry: (
    <>
      <path d="M26 18c6 6 4 14 2 18M38 18c-4 7-2 14 0 17" stroke="#5e9a63" strokeWidth="3" fill="none" />
      <path d="M30 16c4-6 10-6 14-3" stroke="#5e9a63" strokeWidth="3" fill="none" />
      <circle cx="24" cy="42" r="11" fill="#dc2f3c" />
      <circle cx="43" cy="44" r="9" fill="#c22530" />
      <path d="M24 53a11 11 0 0 0 11-11 11 11 0 0 1-11 11z" fill={shade} />
      <ellipse cx="20" cy="37" rx="4" ry="3" fill={gloss} />
      <circle cx="40" cy="40" r="2" fill="rgba(255,255,255,0.5)" />
    </>
  ),
  strawberry: (
    <>
      <path d="M32 54c-9 0-16-8-16-17 0-6 7-11 16-11s16 5 16 11c0 9-7 17-16 17z" fill="#dc2f3c" />
      <path d="M32 54c9 0 16-8 16-17 0 6-7 10-16 10s-16-4-16-10c0 9 7 17 16 17z" fill={shade} />
      <path d="M20 20h24l-5 7H25z" fill="#5e9a63" />
      <path d="M32 12v8" stroke="#5e9a63" strokeWidth="3" />
      <ellipse cx="25" cy="33" rx="4" ry="3" fill={gloss} />
      <g fill="#ffe28a">
        <circle cx="27" cy="38" r="1.6" /><circle cx="36" cy="36" r="1.6" />
        <circle cx="32" cy="44" r="1.6" /><circle cx="40" cy="43" r="1.6" />
        <circle cx="24" cy="45" r="1.6" />
      </g>
    </>
  ),
  flower: (
    <>
      <g fill="#ff7fae">
        <ellipse cx="32" cy="18" rx="7" ry="9" />
        <ellipse cx="32" cy="46" rx="7" ry="9" />
        <ellipse cx="18" cy="32" rx="9" ry="7" />
        <ellipse cx="46" cy="32" rx="9" ry="7" />
      </g>
      <ellipse cx="32" cy="46" rx="7" ry="9" fill={shade} />
      <circle cx="32" cy="32" r="8" fill="#ffe28a" />
      <circle cx="29" cy="29" r="2.5" fill={gloss} />
      <path d="M32 40v0" stroke={L} strokeWidth="1.75" />
    </>
  ),
  butterfly: (
    <>
      <path d="M31 32C24 18 12 16 12 26c0 8 10 12 19 6z" fill="#b8a2ee" />
      <path d="M33 32c7-14 19-16 19-6 0 8-10 12-19 6z" fill="#c4b0f0" />
      <path d="M31 32c-7 14-19 15-19 5 0-8 12-11 19-5z" fill="#a48ce0" />
      <path d="M33 32c7 14 19 15 19 5 0-8-12-11-19-5z" fill="#b09ae8" />
      <rect x="30.5" y="18" width="3" height="28" rx="1.5" fill={L} />
      <path d="M32 18c-2-4-6-5-7-3M32 18c2-4 6-5 7-3" stroke={L} strokeWidth="1.75" fill="none" />
      <circle cx="20" cy="25" r="2" fill="rgba(255,255,255,0.55)" />
    </>
  ),
  bow: (
    <>
      <path d="M30 32 14 22c-3-2-6 1-5 5l3 9c1 4 4 5 7 3z" fill="#ff7fae" />
      <path d="M34 32l16-10c3-2 6 1 5 5l-3 9c-1 4-4 5-7 3z" fill="#f56e9f" />
      <path d="M34 32l16-10c3-2 6 1 5 5-6 0-14 3-21 5z" fill={shade} />
      <circle cx="32" cy="32" r="6" fill="#ffd0e2" />
      <path d="M28 40l-4 12M36 40l4 12" stroke="#ff7fae" strokeWidth="4" strokeLinecap="round" />
      <circle cx="30" cy="30" r="1.8" fill={gloss} />
    </>
  ),
  cassette: (
    <>
      <rect x="9" y="17" width="46" height="30" rx="4" fill="#7fc3ec" />
      <path d="M9 36h46v7a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z" fill={shade} />
      <rect x="16" y="23" width="32" height="13" rx="2" fill="#fffdf8" stroke={L} strokeWidth="1.75" />
      <circle cx="25" cy="29.5" r="3.5" fill="#4a3339" />
      <circle cx="39" cy="29.5" r="3.5" fill="#4a3339" />
      <rect x="19" y="41" width="26" height="2.5" rx="1.25" fill="rgba(255,255,255,0.5)" />
      <rect x="13" y="20" width="10" height="2" rx="1" fill={gloss} />
    </>
  ),
  cd: (
    <>
      <circle cx="32" cy="32" r="21" fill="#c9d8e8" />
      <path d="M32 53a21 21 0 0 0 21-21 21 21 0 0 1-21 21z" fill={shade} />
      <path d="M20 18a21 21 0 0 1 18-3l-3 8a13 13 0 0 0-10 2z" fill="#b8a2ee" opacity="0.9" />
      <path d="M46 20a21 21 0 0 1 5 14h-8a13 13 0 0 0-3-8z" fill="#7fd1ae" opacity="0.9" />
      <circle cx="32" cy="32" r="7" fill="#fffdf8" stroke={L} strokeWidth="1.75" />
      <circle cx="32" cy="32" r="2.5" fill="#c9d8e8" />
    </>
  ),
  star: (
    <>
      <path d="M32 11l6.5 14.5L54 27.5 42.5 38.5 45.5 54 32 46.5 18.5 54l3-15.5L10 27.5l15.5-2z" fill="#ffe28a" />
      <path d="M32 46.5L18.5 54l3-15.5L10 27.5l15.5-2z" fill={shade} />
      <path d="M32 18l3.5 8 8 1" stroke={gloss} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  heart: (
    <>
      <path d="M32 52S12 40 12 27c0-7 5-11 10-11 4 0 8 2 10 6 2-4 6-6 10-6 5 0 10 4 10 11 0 13-20 25-20 25z" fill="#ff7fae" />
      <path d="M32 52s20-12 20-25c0-3-1-5-2-7 0 12-11 22-18 27z" fill={shade} />
      <ellipse cx="24" cy="25" rx="4" ry="3" fill={gloss} transform="rotate(-20 24 25)" />
    </>
  ),
  bunny: (
    <>
      <ellipse cx="24" cy="19" rx="5" ry="11" fill="#fffdf8" />
      <ellipse cx="39" cy="20" rx="5" ry="10" fill="#fffdf8" />
      <ellipse cx="24" cy="19" rx="2.5" ry="7" fill="#ffc0d6" />
      <ellipse cx="39" cy="20" rx="2.5" ry="6" fill="#ffc0d6" />
      <circle cx="32" cy="40" r="14" fill="#fffdf8" />
      <path d="M32 54a14 14 0 0 0 14-14 14 14 0 0 1-14 14z" fill={shade} />
      <circle cx="27" cy="38" r="2" fill={L} />
      <circle cx="37" cy="38" r="2" fill={L} />
      <path d="M30 44c1 1.5 3 1.5 4 0" stroke={L} strokeWidth="1.75" fill="none" strokeLinecap="round" />
      <circle cx="21" cy="43" r="2.5" fill="#ffc0d6" />
      <circle cx="43" cy="43" r="2.5" fill="#ffc0d6" />
    </>
  ),
  cloud: (
    <>
      <path d="M18 44c-5 0-9-4-9-9s4-9 9-9c1-6 6-10 12-10 7 0 12 5 13 11 5 0 9 4 9 9s-4 9-9 9z" fill="#7fc3ec" />
      <path d="M18 44h25c5 0 9-4 9-9 0 3-3 5-7 5H18z" fill={shade} />
      <ellipse cx="24" cy="26" rx="5" ry="3" fill={gloss} />
    </>
  ),
  planet: (
    <>
      <circle cx="32" cy="30" r="15" fill="#b8a2ee" />
      <path d="M32 45a15 15 0 0 0 15-15 15 15 0 0 1-15 15z" fill={shade} />
      <circle cx="26" cy="24" r="3" fill="rgba(255,255,255,0.45)" />
      <circle cx="38" cy="34" r="2" fill="rgba(255,255,255,0.35)" />
      <ellipse cx="32" cy="36" rx="26" ry="7" fill="none" stroke="#ffe28a" strokeWidth="4" transform="rotate(-15 32 36)" />
      <ellipse cx="32" cy="36" rx="26" ry="7" fill="none" stroke={L} strokeWidth="1.5" transform="rotate(-15 32 36)" />
    </>
  ),
  potion: (
    <>
      <path d="M27 12h10v9l7 13a13 13 0 0 1-11 20 13 13 0 0 1-11-20l5-13z" fill="#fffdf8" />
      <path d="M22 36h20a13 13 0 0 1-10 18 13 13 0 0 1-10-18z" fill="#7fd1ae" />
      <path d="M32 54a13 13 0 0 0 10-18c0 6-5 12-10 14z" fill={shade} />
      <rect x="25" y="9" width="14" height="5" rx="2.5" fill="#f0912f" />
      <circle cx="28" cy="42" r="1.8" fill="rgba(255,255,255,0.7)" />
      <circle cx="35" cy="46" r="1.4" fill="rgba(255,255,255,0.6)" />
      <path d="M26 20l3 3" stroke={gloss} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  mushroom: (
    <>
      <path d="M32 12c11 0 20 8 20 16 0 3-2 4-5 4H17c-3 0-5-1-5-4 0-8 9-16 20-16z" fill="#dc2f3c" />
      <path d="M47 32H17c-3 0-5-1-5-4 0 5 4 6 8 6h27z" fill={shade} />
      <g fill="#fffdf8">
        <ellipse cx="24" cy="22" rx="4.5" ry="3.5" />
        <ellipse cx="39" cy="20" rx="3.5" ry="3" />
        <ellipse cx="45" cy="27" rx="3" ry="2.5" />
      </g>
      <path d="M25 32h14v14c0 4-3 6-7 6s-7-2-7-6z" fill="#ffe9d0" />
      <path d="M32 52c4 0 7-2 7-6V38c0 8-3 12-7 14z" fill={shade} />
    </>
  ),
  book: (
    <>
      <path d="M14 14h30a6 6 0 0 1 6 6v30H20a6 6 0 0 1-6-6z" fill="#be5470" />
      <path d="M20 50h30v4H20a6 6 0 0 1-6-6 6 6 0 0 0 6 2z" fill={shade} />
      <rect x="20" y="18" width="26" height="28" rx="2" fill="#fffdf8" />
      <g stroke={L} strokeWidth="1.75" strokeLinecap="round" opacity="0.7">
        <path d="M25 26h16M25 32h16M25 38h10" />
      </g>
      <path d="M40 14v22l-4-4-4 4V14z" fill="#ffe28a" stroke={L} strokeWidth="1.5" />
    </>
  ),
};

interface Props {
  slug: StickerSlug;
  size?: number;
  /** Grayed, dashed placeholder for a sticker not yet earned. */
  locked?: boolean;
  className?: string;
  /** Play the drop-in animation (used when awarding). */
  dropIn?: boolean;
  title?: string;
}

export function Sticker({
  slug,
  size = 56,
  locked = false,
  className = "",
  dropIn = false,
  title,
}: Props) {
  const tilt = tiltFor(slug);
  if (locked) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border-2 border-dashed border-line-soft ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg viewBox="0 0 64 64" width={size * 0.62} height={size * 0.62} className="opacity-25">
          <g stroke={L} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" fill="none">
            {ART[slug]}
          </g>
        </svg>
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${dropIn ? "animate-sticker-drop" : ""} ${className}`}
      style={
        {
          "--tilt": `${tilt}deg`,
          transform: dropIn ? undefined : `rotate(${tilt}deg)`,
          filter: "drop-shadow(0 2px 0 rgba(74,51,57,0.18))",
        } as React.CSSProperties
      }
    >
      {/* Die-cut double edge: white ring, then a thin outline. */}
      <g
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="#ffffff"
      >
        {ART[slug]}
      </g>
      <g stroke={L} strokeWidth="9.5" strokeLinejoin="round" strokeLinecap="round" fill="none" opacity="0.001">
        {ART[slug]}
      </g>
      <g stroke={L} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round">
        {ART[slug]}
      </g>
    </svg>
  );
}

