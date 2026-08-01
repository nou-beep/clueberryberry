"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { isRoomCode, normalizeRoomCode } from "@/lib/multiplayer/room";
import { useRealtimeReachable } from "@/lib/multiplayer/useRoomSocket";
import { GlossyButton } from "@/components/ui/GlossyButton";

/**
 * The page's one primary action: put in a code, go to that room. The realtime
 * probe above it is honest about the room server being down, and blocks
 * nothing — the rest of Clueberry is unaffected either way.
 */
export function JoinByCode() {
  const t = useTranslations("rooms");
  const router = useRouter();
  const reachable = useRealtimeReachable();
  const [code, setCode] = useState("");

  const normalized = normalizeRoomCode(code);

  return (
    <div className="space-y-3">
      {reachable === false && (
        <div
          role="status"
          className="rounded-xl border-2 border-wrong bg-paper-sunken px-3 py-2.5"
        >
          <p className="text-[15px] font-semibold text-wrong">{t("serverDown")}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {t("serverDownHint")}
          </p>
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-line bg-paper-bright p-3 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (isRoomCode(normalized)) router.push(`/rooms/${normalized}`);
        }}
      >
        <div className="min-w-0 flex-1">
          <label className="label-caps block text-ink-soft" htmlFor="join-code">
            {t("roomCode")}
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("roomCodePlaceholder")}
            maxLength={8}
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-lg border-2 border-line bg-paper px-2 font-mono text-xl uppercase tracking-[0.3em] text-ink"
          />
        </div>
        <GlossyButton type="submit" variant="primary" disabled={!isRoomCode(normalized)}>
          {t("joinARoom")}
        </GlossyButton>
      </form>
    </div>
  );
}
