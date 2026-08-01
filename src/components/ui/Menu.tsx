"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function Menu({
  label,
  items,
  icon,
}: {
  label: string;
  items: MenuItem[];
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="gloss relative inline-flex min-h-9 items-center gap-1.5 rounded-lg border-2 border-line bg-paper-bright px-2.5 text-[13px] font-semibold text-ink shadow-sticker active:translate-y-0.5 active:shadow-none"
      >
        {icon}
        {label}
        <span aria-hidden className="text-[10px] text-ink-soft">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className="animate-window-open absolute end-0 top-full z-30 mt-1 min-w-44 overflow-hidden rounded-xl border-2 border-line bg-paper-bright shadow-window"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`block min-h-11 w-full border-b border-line-soft px-3 py-2 text-start text-sm last:border-0 hover:bg-butter/50 ${
                item.destructive ? "text-wrong" : "text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
