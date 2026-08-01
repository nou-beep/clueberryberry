"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  closeLabel: string;
}

/**
 * Accessible modal on the native <dialog> element: focus trapping, Escape, and
 * backdrop click come free. Styled as a rounded window.
 */
export function Modal({ open, onClose, labelledBy, children, closeLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(94vw,34rem)] rounded-[20px] border-2 border-line bg-paper-bright p-0 text-ink shadow-window backdrop:bg-[#4a3339]/45"
    >
      <div className="relative p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-lg border-2 border-line bg-paper-sunken text-sm text-ink-soft hover:text-ink"
        >
          ✕
        </button>
        {children}
      </div>
    </dialog>
  );
}
