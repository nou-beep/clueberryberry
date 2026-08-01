"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { cellKey } from "@/lib/crossword/types";
import { participantColor } from "@/lib/multiplayer/room";

export interface PeerCursor {
  id: string;
  name: string;
  colorIndex: number;
  row: number;
  column: number;
}

interface Props {
  cursors: PeerCursor[];
  /** The positioned wrapper the markers are placed inside. */
  container: HTMLElement | null;
  /** Live map of grid cell buttons, filled by CrosswordGrid's registerCell. */
  cells: Map<string, HTMLElement>;
}

interface Placed extends PeerCursor {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Other people's cursors, drawn over the grid rather than inside it.
 *
 * Positions are measured from the real cell elements, so the markers stay
 * aligned through resizing, RTL mirroring and horizontal scrolling without the
 * grid component needing to know multiplayer exists.
 */
export function PresenceLayer({ cursors, container, cells }: Props) {
  const [placed, setPlaced] = useState<Placed[]>([]);

  const measure = useCallback(() => {
    if (!container) {
      setPlaced([]);
      return;
    }
    const base = container.getBoundingClientRect();
    const next: Placed[] = [];
    for (const cursor of cursors) {
      const el = cells.get(cellKey(cursor.row, cursor.column));
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      next.push({
        ...cursor,
        top: rect.top - base.top,
        left: rect.left - base.left,
        width: rect.width,
        height: rect.height,
      });
    }
    setPlaced(next);
  }, [container, cells, cursors]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const scroller = container.querySelector(".overflow-x-auto");
    scroller?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      scroller?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [container, measure]);

  if (placed.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {placed.map((cursor) => {
        const color = participantColor(cursor.colorIndex);
        return (
          <span
            key={cursor.id}
            className="absolute rounded-[3px]"
            style={{
              top: cursor.top,
              left: cursor.left,
              width: cursor.width,
              height: cursor.height,
              boxShadow: `inset 0 0 0 2px ${color}`,
            }}
          >
            <span
              className="absolute -top-1.5 flex size-3.5 items-center justify-center rounded-full border border-paper-bright font-sans text-[8px] font-bold leading-none text-paper-bright"
              style={{ backgroundColor: color, insetInlineEnd: -6 }}
            >
              {Array.from(cursor.name)[0]?.toUpperCase() ?? "?"}
            </span>
          </span>
        );
      })}
    </div>
  );
}
