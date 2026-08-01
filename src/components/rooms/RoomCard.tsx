"use client";

import { useTranslations } from "next-intl";
import type { RoomCard as RoomCardData } from "@/lib/rooms/queries";
import { GlossyLink } from "@/components/ui/GlossyButton";

interface Props {
  room: RoomCardData;
  /** Compact cards drop the subject line; used in the Home strip. */
  compact?: boolean;
}

function Facet({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-tight ${
        on ? "border-line bg-butter/70 text-ink" : "border-line-soft text-ink-faint"
      }`}
    >
      {on ? label : `${label} ✕`}
    </span>
  );
}

/**
 * One room, told honestly: what is being solved, in which language, how many
 * people are in it, and whether chat and voice are actually available.
 */
export function RoomCard({ room, compact = false }: Props) {
  const t = useTranslations("rooms");
  const tLang = useTranslations("languages");
  const full = room.participantCount >= room.participantLimit;

  return (
    <article
      data-subject={room.subjectTheme}
      className="flex h-full flex-col gap-2 rounded-xl border-2 border-line bg-paper-bright p-3 shadow-card"
    >
      <div className="min-w-0">
        <h3 className="font-display truncate text-[17px] leading-tight text-ink">
          {room.puzzleTitle}
        </h3>
        {!compact && (
          <p className="label-caps truncate text-accent">{room.subjectName}</p>
        )}
        <p className="mt-0.5 text-[12px] text-ink-soft">
          {tLang(room.language)}
          {room.hostName ? ` · ${t("hostedBy", { name: room.hostName })}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-line bg-paper-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {room.participantCount}/{room.participantLimit}
        </span>
        <Facet label={t("chat")} on={room.chatEnabled} />
        <Facet label={t("voice")} on={room.voiceEnabled} />
        {room.locked && (
          <span className="text-[12px]" title={t("roomLocked")} aria-label={t("roomLocked")}>
            🔒
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] tracking-[0.2em] text-ink-faint">
          {room.code}
        </span>
        {full || room.locked ? (
          <span className="text-[12px] font-semibold text-ink-faint">
            {full ? t("errors.full") : t("errors.locked")}
          </span>
        ) : (
          <GlossyLink href={`/rooms/${room.code}`} size="sm">
            {t("join")}
          </GlossyLink>
        )}
      </div>
    </article>
  );
}
