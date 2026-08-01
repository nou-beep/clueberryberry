import { Sticker } from "@/components/ui/Sticker";

/**
 * A drawn avatar — never an upload. The `kind` picks the figure (drawn in the
 * sticker language of docs/design-system.md §6) and the `seed` picks the paper
 * behind it and a small stable tilt, so two people who chose the same bunny
 * still get different desks.
 */

export const AVATAR_KINDS = ["bunny", "cherry", "star", "cloud", "planet"] as const;

export type AvatarKind = (typeof AVATAR_KINDS)[number];

export function isAvatarKind(value: string): value is AvatarKind {
  return (AVATAR_KINDS as readonly string[]).includes(value);
}

/** Backing papers. Flat, warm, and all cleared for --ink text sitting beside them. */
const PAPERS = [
  "#FFE28A",
  "#FFC79E",
  "#FFD7E6",
  "#C7E9F7",
  "#D8CDF6",
  "#BFE7D4",
  "#FFD0C4",
  "#E4EBCF",
] as const;

/** Seed → paper. Deterministic, so an avatar never changes between renders. */
export function avatarPaper(seed: number): string {
  return PAPERS[Math.abs(Math.trunc(seed)) % PAPERS.length];
}

/** Seed → a tilt between -6 and +6 degrees. */
function tiltFor(seed: number): number {
  return (Math.abs(Math.trunc(seed) * 7) % 13) - 6;
}

interface Props {
  kind: AvatarKind;
  seed: number;
  /** Pixel size of the whole disc. */
  size?: number;
  /** Accessible name. Omit for a decorative avatar next to a visible name. */
  title?: string;
  className?: string;
}

export function Avatar({ kind, seed, size = 56, title, className = "" }: Props) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-line shadow-sticker ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarPaper(seed),
        transform: `rotate(${tiltFor(seed)}deg)`,
      }}
    >
      <Sticker slug={kind} size={Math.round(size * 0.72)} />
    </span>
  );
}
