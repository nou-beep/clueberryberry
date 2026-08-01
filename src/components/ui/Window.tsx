import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  /** Small leading glyph in the title bar. */
  icon?: ReactNode;
  /** Trailing content in the title bar (before the dots). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Omit the pinstriped title bar. */
  plain?: boolean;
  /** Skip the open animation (e.g. for above-the-fold content). */
  static?: boolean;
  as?: "section" | "div" | "article" | "aside";
}

/**
 * The workhorse container: rounded, 2px-outlined, hard-offset shadow, with a
 * pinstriped title bar and three decorative dots. See docs/design-system.md §4.
 */
export function Window({
  title,
  icon,
  action,
  children,
  className = "",
  plain = false,
  static: isStatic = false,
  as: Tag = "section",
}: Props) {
  return (
    <Tag
      className={`overflow-hidden rounded-[20px] border-2 border-line bg-paper-bright shadow-window ${
        isStatic ? "" : "animate-window-open"
      } ${className}`}
    >
      {!plain && (
        <div className="pinstripe flex items-center gap-2 border-b-2 border-line bg-paper-sunken px-3 py-1.5">
          {icon && <span className="shrink-0 text-accent">{icon}</span>}
          {title && (
            <h2 className="font-display min-w-0 flex-1 truncate text-[15px] text-ink">
              {title}
            </h2>
          )}
          {action}
          <span aria-hidden className="flex shrink-0 gap-1">
            <span className="block size-2.5 rounded-full border border-line bg-mint" />
            <span className="block size-2.5 rounded-full border border-line bg-butter" />
            <span className="block size-2.5 rounded-full border border-line bg-pink" />
          </span>
        </div>
      )}
      {children}
    </Tag>
  );
}
