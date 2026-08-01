"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listSeatCodes } from "@/lib/multiplayer/identity";
import type { RoomCard as RoomCardData } from "@/lib/rooms/queries";
import { RoomCard } from "./RoomCard";

interface Props {
  locale: string;
}

/**
 * Rooms this browser still holds a seat in. Entirely client-side, because the
 * seats live in localStorage — a guest has no account to hang them off. Renders
 * nothing until there is something real to show.
 */
export function RecentlyJoined({ locale }: Props) {
  const t = useTranslations("rooms");
  const [rooms, setRooms] = useState<RoomCardData[]>([]);

  useEffect(() => {
    const codes = listSeatCodes();
    if (codes.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/rooms/recent?codes=${encodeURIComponent(codes.join(","))}&locale=${locale}`
        );
        if (!response.ok) return;
        const data = (await response.json()) as { rooms: RoomCardData[] };
        if (!cancelled) setRooms(data.rooms);
      } catch {
        /* Offline: the section stays absent rather than showing stale rooms. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (rooms.length === 0) return null;

  return (
    <section aria-labelledby="recent-rooms-title">
      <h2 id="recent-rooms-title" className="font-display mb-2 text-2xl">
        {t("recentlyJoined")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <li key={room.code} className="min-w-0">
            <RoomCard room={room} />
          </li>
        ))}
      </ul>
    </section>
  );
}
