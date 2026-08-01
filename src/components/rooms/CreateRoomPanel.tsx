"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { PuzzleIndexRow } from "@/lib/db/queries";
import {
  DEFAULT_PARTICIPANTS,
  MAX_DISPLAY_NAME,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  ROOM_VISIBILITIES,
  validateDisplayName,
  type RoomVisibility,
} from "@/lib/multiplayer/room";
import { loadGuestName, saveGuestName, saveSeat } from "@/lib/multiplayer/identity";
import { GlossyButton } from "@/components/ui/GlossyButton";

interface Props {
  puzzles: PuzzleIndexRow[];
  signedIn: boolean;
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
 * Making a room. Secondary to joining one, per the one-primary-action rule, so
 * the button here is deliberately not the pink one.
 */
export function CreateRoomPanel({ puzzles, signedIn }: Props) {
  const t = useTranslations("rooms");
  const tDiff = useTranslations("difficulty");
  const tLang = useTranslations("languages");
  const router = useRouter();

  const [puzzleId, setPuzzleId] = useState(puzzles[0]?.id ?? "");
  const [visibility, setVisibility] = useState<RoomVisibility>("private");
  const [participantLimit, setParticipantLimit] = useState(DEFAULT_PARTICIPANTS);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [allowGuests, setAllowGuests] = useState(true);
  const [hintsNeedApproval, setHintsNeedApproval] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(loadGuestName());
  }, []);

  const named = validateDisplayName(name);
  const nameNeeded = !signedIn;

  const create = async () => {
    if (!puzzleId || (nameNeeded && !named.ok)) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          visibility,
          participantLimit,
          chatEnabled,
          allowGuests,
          hintsNeedApproval,
          ...(nameNeeded && named.ok ? { displayName: named.name } : {}),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(typeof data?.error === "string" ? data.error : "network");
        return;
      }
      const data = (await response.json()) as SeatResponse;
      if (nameNeeded && named.ok) saveGuestName(named.name);
      saveSeat({ ...data.seat });
      router.push(`/rooms/${data.seat.code}`);
    } catch {
      setError("network");
    } finally {
      setCreating(false);
    }
  };

  if (puzzles.length === 0) {
    return <p className="text-[14px] text-ink-soft">{t("noPuzzles")}</p>;
  }

  return (
    <form
      className="grid gap-3 rounded-xl border-2 border-line bg-paper-bright p-3 shadow-card sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <div className="sm:col-span-2">
        <label className="label-caps block text-ink-soft" htmlFor="room-puzzle">
          {t("choosePuzzle")}
        </label>
        <select
          id="room-puzzle"
          value={puzzleId}
          onChange={(e) => setPuzzleId(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border-2 border-line bg-paper px-2 text-[15px] text-ink"
        >
          {puzzles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.subjectName} · {tLang(p.language)} · {tDiff(p.difficulty)}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <span className="label-caps block text-ink-soft">{t("visibility")}</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {ROOM_VISIBILITIES.map((value) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-2 px-2.5 text-[14px] ${
                visibility === value
                  ? "border-line bg-butter/60 font-semibold text-ink"
                  : "border-line-soft text-ink-soft"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={visibility === value}
                onChange={() => setVisibility(value)}
                className="sr-only"
              />
              {t(`visibility_${value}`)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-[12px] leading-snug text-ink-faint">
          {t(`visibilityHint_${visibility}`)}
        </p>
      </div>

      <div>
        <label className="label-caps block text-ink-soft" htmlFor="room-limit">
          {t("participantLimit")}
        </label>
        <input
          id="room-limit"
          type="number"
          min={MIN_PARTICIPANTS}
          max={MAX_PARTICIPANTS}
          value={participantLimit}
          onChange={(e) =>
            setParticipantLimit(
              Math.min(
                MAX_PARTICIPANTS,
                Math.max(MIN_PARTICIPANTS, Number(e.target.value) || DEFAULT_PARTICIPANTS)
              )
            )
          }
          className="mt-1 min-h-11 w-24 rounded-lg border-2 border-line bg-paper px-2 text-[15px] text-ink"
        />
      </div>

      {nameNeeded && (
        <div>
          <label className="label-caps block text-ink-soft" htmlFor="host-name">
            {t("yourName")}
          </label>
          <input
            id="host-name"
            value={name}
            maxLength={MAX_DISPLAY_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourNamePlaceholder")}
            className="mt-1 min-h-11 w-full rounded-lg border-2 border-line bg-paper px-2 text-[15px] text-ink"
          />
        </div>
      )}

      <fieldset className="space-y-1 sm:col-span-2">
        <legend className="label-caps text-ink-soft">{t("options")}</legend>
        {(
          [
            ["enableChat", chatEnabled, setChatEnabled],
            ["allowGuests", allowGuests, setAllowGuests],
            ["hintsNeedApproval", hintsNeedApproval, setHintsNeedApproval],
          ] as const
        ).map(([key, value, set]) => (
          <label key={key} className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => set(e.target.checked)}
              className="size-4 accent-[color:var(--pink-deep)]"
            />
            {t(key)}
          </label>
        ))}
        <p className="text-[12px] leading-snug text-ink-faint">{t("voiceUnavailable")}</p>
      </fieldset>

      {error && (
        <p className="text-[14px] font-semibold text-wrong sm:col-span-2">
          {t(`errors.${error}`)}
        </p>
      )}

      <div className="sm:col-span-2">
        <GlossyButton
          type="submit"
          disabled={creating || !puzzleId || (nameNeeded && !named.ok)}
        >
          {creating ? t("creating") : t("create")}
        </GlossyButton>
      </div>
    </form>
  );
}
