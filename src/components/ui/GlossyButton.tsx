"use client";

import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-pink text-ink border-line",
  secondary: "bg-paper-bright text-ink border-line",
  quiet: "bg-transparent text-ink-soft border-line-soft hover:text-ink",
  danger: "bg-paper-bright text-wrong border-wrong",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 py-2 text-[15px]",
  sm: "min-h-9 px-3 py-1.5 text-[13px]",
};

function Sparkles() {
  return (
    <span aria-hidden className="pointer-events-none absolute -top-1 end-1.5">
      <span className="sparkle-dot absolute block size-1 rounded-full bg-butter" />
      <span className="sparkle-dot absolute start-2 block size-1 rounded-full bg-pink" />
      <span className="sparkle-dot absolute start-1 top-1.5 block size-1 rounded-full bg-mint" />
    </span>
  );
}

const base =
  "sparkle-host gloss relative inline-flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold shadow-sticker transition-transform duration-[120ms] hover:-translate-y-px active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0";

/** The glossy 2004 pill. Sizes keep a 44px hit area via padding. */
export function GlossyButton({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      <Sparkles />
      {children}
    </button>
  );
}

/** Same look, rendered as a locale-aware link. */
export function GlossyLink({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      <Sparkles />
      {children}
    </Link>
  );
}
