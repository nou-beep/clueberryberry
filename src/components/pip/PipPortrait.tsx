/**
 * Pip — a small round bunny with a pencil behind one ear.
 * Three static poses, same line weight as the icon set. Pip changes pose;
 * Pip does not animate on a loop. See docs/design-system.md §8.
 */

export type PipPose = "idle" | "thinking" | "cheerful";

const L = "#4a3339";

export function PipPortrait({
  pose = "idle",
  size = 48,
  className = "",
}: {
  pose?: PipPose;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      {/* ears */}
      <ellipse cx="23" cy="17" rx="5" ry="12" fill="#fffdf8" stroke={L} strokeWidth="2" />
      <ellipse
        cx="41"
        cy="18"
        rx="5"
        ry="11"
        fill="#fffdf8"
        stroke={L}
        strokeWidth="2"
        transform={pose === "thinking" ? "rotate(14 41 24)" : undefined}
      />
      <ellipse cx="23" cy="17" rx="2.2" ry="7.5" fill="#ffc0d6" />
      <ellipse
        cx="41"
        cy="18"
        rx="2.2"
        ry="6.5"
        fill="#ffc0d6"
        transform={pose === "thinking" ? "rotate(14 41 24)" : undefined}
      />

      {/* pencil behind the ear */}
      <g transform="rotate(24 46 24)">
        <rect x="43" y="12" width="4.5" height="17" fill="#ffe28a" stroke={L} strokeWidth="1.6" />
        <path d="M43 29h4.5l-2.25 4z" fill="#ffc79e" stroke={L} strokeWidth="1.6" />
        <rect x="43" y="10" width="4.5" height="2.5" fill="#ff7fae" stroke={L} strokeWidth="1.4" />
      </g>

      {/* head */}
      <circle cx="32" cy="40" r="15" fill="#fffdf8" stroke={L} strokeWidth="2" />

      {/* cheeks */}
      <circle cx="20.5" cy="43" r="2.8" fill="#ffc0d6" />
      <circle cx="43.5" cy="43" r="2.8" fill="#ffc0d6" />

      {/* eyes */}
      {pose === "cheerful" ? (
        <>
          <path d="M25 38.5c1.4-2 3.4-2 4.8 0" stroke={L} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M34.2 38.5c1.4-2 3.4-2 4.8 0" stroke={L} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="27" cy="38.5" r="2.1" fill={L} />
          <circle cx="37" cy="38.5" r="2.1" fill={L} />
          <circle cx="26.3" cy="37.8" r="0.7" fill="#fff" />
          <circle cx="36.3" cy="37.8" r="0.7" fill="#fff" />
        </>
      )}

      {/* mouth */}
      {pose === "cheerful" ? (
        <path d="M29 45c1.6 2 4.4 2 6 0" stroke={L} strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M30 44.5c1.1 1.2 2.8 1.2 4 0" stroke={L} strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {/* thinking dots */}
      {pose === "thinking" && (
        <g fill={L}>
          <circle cx="52" cy="35" r="1.5" />
          <circle cx="56.5" cy="31.5" r="2" />
        </g>
      )}
    </svg>
  );
}
