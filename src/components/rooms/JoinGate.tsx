"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { PlayablePuzzle } from "@/lib/db/serialize";
import {
  loadGuestName,
  loadSeat,
  saveGuestName,
  saveSeat,
  type StoredSeat,
} from "@/lib/multiplayer/identity";
import {
  MAX_DISPLAY_NAME,
  MIN_DISPLAY_NAME,
  validateDisplayName,
} from "@/lib/multiplayer/room";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { Window } from "@/components/ui/Window";
import { RoomView } from "./RoomView";

interface Props {
  puzzle: PlayablePuzzle;
  code: string;
  signedIn: boolean;
  allowGuests: boolean;
  invite: string | null;
  locale: string;
}

interface SeatResponse {
  seat: {
    roomId: string;
    code: string;
    participantId: string;
    displayName: string;
    token: string;
    expiresAt: number;
  };
}

/**
 * Takes a seat before the room renders. A stored seat is reused, so refreshing
 * returns you to the same participant rather than spawning a second one.
 */
export function JoinGate({
  puzzle,
  code,
  signedIn,
  allowGuests,
  invite,
  locale,
}: Props) {
  const t = useTranslations("rooms");
  const router = useRouter();
  const [seat, setSeat] = useState<StoredSeat | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");

  const join = useCallback(
    async (displayName?: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/rooms/${code}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(displayName ? { displayName } : {}),
            ...(invite ? { invite } : {}),
          }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(typeof data?.error === "string" ? data.error : "network");
          return;
        }
        const data = (await response.json()) as SeatResponse;
        const stored: StoredSeat = {
          code: data.seat.code,
          roomId: data.seat.roomId,
          participantId: data.seat.participantId,
          displayName: data.seat.displayName,
          token: data.seat.token,
          expiresAt: data.seat.expiresAt,
        };
        saveSeat(stored);
        setSeat(stored);
      } catch {
        setError("network");
      } finally {
        setBusy(false);
      }
    },
    [code, invite]
  );

  useEffect(() => {
    // Deployment-specific Vercel URLs can be access-protected. Invite links
    // must use the canonical public site so guests are never asked to join the
    // Vercel team just because the host opened a preview deployment.
    setOrigin(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    const existing = loadSeat(code);
    if (existing) {
      setSeat(existing);
      setReady(true);
      return;
    }
    setName(loadGuestName());
    setReady(true);
    // Signed-in players already have a name, so joining needs no prompt.
    if (signedIn) void join();
  }, [code, signedIn, join]);

  if (seat) {
    return (
      <RoomView
        puzzle={puzzle}
        seat={seat}
        origin={origin}
        locale={locale}
        onLeft={() => {
          setSeat(null);
          router.push("/rooms");
        }}
      />
    );
  }

  if (!ready || (signedIn && busy)) {
    return (
      <p className="py-10 text-center text-[15px] text-ink-soft">{t("joining")}</p>
    );
  }

  const named = validateDisplayName(name);

  return (
    <div className="mx-auto max-w-md">
      <Window title={t("joinTitle")}>
        <div className="space-y-3 p-4">
          <p className="text-[15px] leading-snug text-ink-soft">
            {t("joiningPuzzle", { title: puzzle.title, code })}
          </p>

          {error && (
            <p className="rounded-lg border-2 border-wrong bg-paper-sunken px-2 py-1.5 text-[14px] font-semibold text-wrong">
              {t(`errors.${error}`)}
            </p>
          )}

          {!signedIn && !allowGuests ? (
            <p className="text-[14px] text-ink-soft">{t("errors.guests_disabled")}</p>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!named.ok) return;
                saveGuestName(named.name);
                void join(named.name);
              }}
            >
              <label className="label-caps block text-ink-soft" htmlFor="guest-name">
                {t("yourName")}
              </label>
              <input
                id="guest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={MIN_DISPLAY_NAME}
                maxLength={MAX_DISPLAY_NAME}
                placeholder={t("yourNamePlaceholder")}
                className="min-h-11 w-full rounded-lg border-2 border-line bg-paper-bright px-2 text-[15px] text-ink"
              />
              <GlossyButton
                type="submit"
                variant="primary"
                disabled={busy || !named.ok}
                className="w-full"
              >
                {busy ? t("joining") : t("join")}
              </GlossyButton>
            </form>
          )}
        </div>
      </Window>
    </div>
  );
}
