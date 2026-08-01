import type { ReactNode } from "react";

/* Small shared pieces of the design language. See docs/design-system.md §4. */

type Tone = "pink" | "mint" | "butter" | "sky" | "lavender" | "peach" | "accent";

const TONES: Record<Tone, string> = {
  pink: "bg-pink",
  mint: "bg-mint",
  butter: "bg-butter",
  sky: "bg-sky",
  lavender: "bg-lavender",
  peach: "bg-peach",
  accent: "bg-accent-soft",
};

/**
 * A pill that looks stuck on rather than laid out. Metadata only —
 * never interactive, and always carries text (not color alone).
 */
export function StickerLabel({
  children,
  tone = "peach",
  icon,
  className = "",
  tilt = true,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  return (
    <span
      className={`label-caps inline-flex items-center gap-1 rounded-full border-2 border-line px-2 py-0.5 text-ink ring-2 ring-white ${TONES[tone]} ${className}`}
      style={tilt ? { transform: "rotate(-1.5deg)" } : undefined}
    >
      {icon}
      {children}
    </span>
  );
}

/** Rubber-stamp mark. Used for completion and archive marks. */
export function Stamp({
  children,
  className = "",
  animate = false,
}: {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={`font-display inline-block rounded-md border-[2.5px] border-wrong px-2.5 py-1 text-sm uppercase tracking-wide text-wrong opacity-90 ${
        animate ? "animate-stamp" : "-rotate-8"
      } ${className}`}
      style={animate ? undefined : { transform: "rotate(-8deg)" }}
    >
      <span className="block rounded-sm border border-wrong/50 px-1.5">{children}</span>
    </span>
  );
}

/** A strip of washi tape. Decorative only. */
export function TapeStrip({
  className = "",
  rotate = -3,
  width = 84,
}: {
  className?: string;
  rotate?: number;
  width?: number;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute block h-6 border-x border-line/20 bg-tape/80 ${className}`}
      style={{
        width,
        transform: `rotate(${rotate}deg)`,
        maskImage:
          "linear-gradient(90deg, transparent 0, #000 3px, #000 calc(100% - 3px), transparent 100%)",
      }}
    />
  );
}

/**
 * Cream page with a dotted baseline grid, a margin rule, and punch holes on
 * the leading edge. Used by the Journal and collection pages.
 */
export function NotebookPage({
  children,
  className = "",
  holes = true,
}: {
  children: ReactNode;
  className?: string;
  holes?: boolean;
}) {
  return (
    <div
      className={`paper-dots relative rounded-[20px] border-2 border-line bg-paper-bright shadow-window ${className}`}
    >
      {/* margin rule */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-10 w-px bg-coral/40 sm:start-14"
      />
      {holes && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3 flex flex-col justify-around sm:start-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block size-3.5 rounded-full border-2 border-line-soft bg-desk"
            />
          ))}
        </span>
      )}
      <div className="relative ps-12 pe-4 sm:ps-20 sm:pe-8">{children}</div>
    </div>
  );
}

/** Section heading in the scrapbook voice: display type on a dotted rule. */
export function SectionHead({
  children,
  action,
  id,
}: {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="dotted-rule mb-3 flex flex-wrap items-baseline justify-between gap-2 pb-1.5">
      <h2 id={id} className="font-display text-xl text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}
