"use client";

import { useTranslations } from "next-intl";
import type { ParticipantWire } from "@/lib/multiplayer/protocol";
import { Avatar } from "./Avatar";

interface Props {
  participants: ParticipantWire[];
  names: Map<string, string>;
  youId: string | null;
  /** Ids the viewer chose to block; their cursor and messages are hidden. */
  blocked: string[];
}

/**
 * Who is here, and what they are on. Deliberately one line: presence is
 * context for the puzzle, not the subject of the screen.
 */
export function ParticipantStrip({ participants, names, youId, blocked }: Props) {
  const t = useTranslations("rooms");
  const visible = participants.filter((p) => !blocked.includes(p.id));

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t("people")}>
      {visible.map((p) => {
        const name = names.get(p.id) ?? p.displayName;
        return (
          <li key={p.id} className="flex min-w-0 items-center gap-1.5">
            <Avatar name={name} colorIndex={p.colorIndex} online={p.online} size={26} />
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-ink">
                <span className="truncate">{name}</span>
                {p.id === youId && (
                  <span className="label-caps text-ink-faint">{t("you")}</span>
                )}
                {p.isHost && (
                  <span
                    className="rounded border border-line bg-butter px-1 text-[10px] font-bold uppercase leading-tight text-ink"
                    title={t("host")}
                  >
                    {t("host")}
                  </span>
                )}
                {p.muted && (
                  <span className="text-[11px] text-ink-faint" title={t("mutedBadge")}>
                    🔇
                  </span>
                )}
              </span>
              <span className="block truncate text-[11px] leading-tight text-ink-faint">
                {!p.online
                  ? t("away")
                  : p.cursor?.clue
                    ? t("workingOn", { clue: p.cursor.clue })
                    : t("online")}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
