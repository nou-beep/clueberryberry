"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconSearch } from "@/components/ui/Icons";
import { SearchOverlay } from "./SearchOverlay";

/**
 * The only entry point to search. It lives in the header on every screen, so
 * search does not need — and no longer has — a navigation tab of its own.
 *
 * Shortcuts: ⌘K / Ctrl-K anywhere, and "/" when focus is not already inside a
 * text field (typing a clue answer must never open the search box).
 */
export function SearchButton({ size = "compact" }: { size?: "compact" | "large" }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const large = size === "large";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The overlay owns focus while it is open; the page behind it should not
  // scroll away underneath.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openSearch")}
        className={
          large
            ? // The Puzzles hub opens with this: a full-width bar that reads as
              // the page's first move, not a header afterthought.
              "flex w-full items-center gap-3 rounded-[18px] border-2 border-line bg-paper-bright px-4 py-4 text-start text-base text-ink-faint shadow-card transition-transform duration-[120ms] hover:-translate-y-0.5 hover:shadow-lift"
            : "flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-paper-bright px-3 text-sm text-ink-soft shadow-[var(--shadow-sticker)] transition-transform duration-[120ms] hover:-translate-y-px hover:text-ink sm:px-4"
        }
      >
        <IconSearch className={large ? "size-6 shrink-0" : "size-[18px]"} />
        <span className={large ? "flex-1 truncate" : "hidden lg:inline"}>
          {t("searchHint")}
        </span>
        <kbd
          className={`rounded border border-line-soft px-1.5 py-0.5 text-[11px] text-ink-faint ${
            large ? "hidden sm:inline" : "hidden lg:inline"
          }`}
        >
          /
        </kbd>
      </button>
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
