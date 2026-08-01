"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HostAction, ParticipantWire, RoomSettingsWire } from "@/lib/multiplayer/protocol";
import { GlossyButton } from "@/components/ui/GlossyButton";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "./Avatar";

interface Props {
  room: RoomSettingsWire;
  participants: ParticipantWire[];
  names: Map<string, string>;
  youId: string | null;
  inviteUrl: string | null;
  onCreateInvite: () => void;
  creatingInvite: boolean;
  onAction: (action: HostAction, targetId?: string) => void;
}

interface Confirmation {
  action: HostAction;
  targetId?: string;
  bodyKey: string;
  name?: string;
}

/**
 * Everything only the host may do. Destructive actions (reset, end, remove)
 * go through a confirmation, because a mis-tap would wipe shared work.
 */
export function HostControls({
  room,
  participants,
  names,
  youId,
  inviteUrl,
  onCreateInvite,
  creatingInvite,
  onAction,
}: Props) {
  const t = useTranslations("rooms");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copied, setCopied] = useState(false);

  const others = participants.filter((p) => p.id !== youId);

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      /* Clipboard blocked: the link is still visible and selectable. */
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap gap-2">
        <GlossyButton
          size="sm"
          onClick={() => onAction(room.locked ? "unlock" : "lock")}
        >
          {room.locked ? t("unlockRoom") : t("lockRoom")}
        </GlossyButton>
        <GlossyButton
          size="sm"
          onClick={() => onAction(room.chatEnabled ? "mute-room" : "unmute-room")}
        >
          {room.chatEnabled ? t("muteRoom") : t("unmuteRoom")}
        </GlossyButton>
        <GlossyButton
          size="sm"
          variant="danger"
          onClick={() => setConfirmation({ action: "reset", bodyKey: "confirmReset" })}
        >
          {t("resetPuzzle")}
        </GlossyButton>
        <GlossyButton
          size="sm"
          variant="danger"
          onClick={() => setConfirmation({ action: "end", bodyKey: "confirmEnd" })}
        >
          {t("endRoom")}
        </GlossyButton>
      </div>

      <div className="rounded-lg border-2 border-line-soft bg-paper-sunken p-2">
        <p className="label-caps mb-1 text-ink-soft">{t("inviteLink")}</p>
        {inviteUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-ink">
              {inviteUrl}
            </code>
            <GlossyButton size="sm" onClick={() => void copy()}>
              {copied ? t("copied") : t("copyLink")}
            </GlossyButton>
          </div>
        ) : (
          <GlossyButton size="sm" onClick={onCreateInvite} disabled={creatingInvite}>
            {t("createInvite")}
          </GlossyButton>
        )}
      </div>

      {others.length > 0 && (
        <ul className="space-y-1.5">
          {others.map((p) => {
            const name = names.get(p.id) ?? p.displayName;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-line-soft px-2 py-1.5"
              >
                <Avatar name={name} colorIndex={p.colorIndex} online={p.online} size={24} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onAction(p.muted ? "unmute-participant" : "mute-participant", p.id)
                  }
                  className="min-h-11 rounded px-1.5 text-[12px] font-semibold text-ink-soft hover:text-ink"
                >
                  {p.muted ? t("unmuteParticipant") : t("muteParticipant")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmation({
                      action: "transfer",
                      targetId: p.id,
                      bodyKey: "confirmTransfer",
                      name,
                    })
                  }
                  className="min-h-11 rounded px-1.5 text-[12px] font-semibold text-ink-soft hover:text-ink"
                >
                  {t("transferHost")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmation({
                      action: "remove",
                      targetId: p.id,
                      bodyKey: "confirmRemove",
                      name,
                    })
                  }
                  className="min-h-11 rounded px-1.5 text-[12px] font-semibold text-wrong"
                >
                  {t("removeParticipant")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        labelledBy="host-confirm-title"
        closeLabel={t("cancel")}
      >
        <h2 id="host-confirm-title" className="font-display mb-2 text-xl">
          {t("confirmTitle")}
        </h2>
        <p className="text-[15px] leading-snug text-ink-soft">
          {confirmation
            ? t(confirmation.bodyKey, { name: confirmation.name ?? "" })
            : ""}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GlossyButton size="sm" onClick={() => setConfirmation(null)}>
            {t("cancel")}
          </GlossyButton>
          <GlossyButton
            size="sm"
            variant="danger"
            onClick={() => {
              if (confirmation) onAction(confirmation.action, confirmation.targetId);
              setConfirmation(null);
            }}
          >
            {t("confirm")}
          </GlossyButton>
        </div>
      </Modal>
    </div>
  );
}
