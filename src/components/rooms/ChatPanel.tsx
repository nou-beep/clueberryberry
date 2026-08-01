"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_CHAT_LENGTH, REACTION_EMOJI, type ReactionEmoji } from "@/lib/multiplayer/chat";
import type { ChatMessageWire, ParticipantWire } from "@/lib/multiplayer/protocol";
import { participantColor } from "@/lib/multiplayer/room";
import { GlossyButton } from "@/components/ui/GlossyButton";

interface Props {
  messages: ChatMessageWire[];
  participants: ParticipantWire[];
  names: Map<string, string>;
  youId: string | null;
  enabled: boolean;
  /** Host-set mute on the viewer. */
  muted: boolean;
  typing: string[];
  /** Viewer-local mutes and blocks. */
  hiddenIds: string[];
  onSend: (body: string) => void;
  onTyping: (active: boolean) => void;
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
  onReport: (participantId: string) => void;
  onToggleHidden: (participantId: string) => void;
}

function timeLabel(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({
  messages,
  participants,
  names,
  youId,
  enabled,
  muted,
  typing,
  hiddenIds,
  onSend,
  onTyping,
  onReact,
  onReport,
  onToggleHidden,
}: Props) {
  const t = useTranslations("rooms");
  const [draft, setDraft] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const typingSentRef = useRef(false);

  const visible = useMemo(
    () => messages.filter((m) => !(m.participantId && hiddenIds.includes(m.participantId))),
    [messages, hiddenIds]
  );

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [visible.length]);

  useEffect(() => {
    if (!typingSentRef.current) return;
    const id = setTimeout(() => {
      typingSentRef.current = false;
      onTyping(false);
    }, 2_500);
    return () => clearTimeout(id);
  }, [draft, onTyping]);

  const typingNames = typing
    .filter((id) => !hiddenIds.includes(id) && id !== youId)
    .map((id) => names.get(id) ?? participants.find((p) => p.id === id)?.displayName)
    .filter((n): n is string => Boolean(n));

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
    if (typingSentRef.current) {
      typingSentRef.current = false;
      onTyping(false);
    }
  };

  const remaining = MAX_CHAT_LENGTH - Array.from(draft).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ol
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2"
        aria-live="polite"
      >
        {visible.length === 0 && (
          <li className="py-4 text-center text-[13px] text-ink-faint">{t("chatEmptyYet")}</li>
        )}
        {visible.map((message) => {
          if (message.kind === "system") {
            return (
              <li
                key={message.id}
                className="text-center text-[12px] italic leading-snug text-ink-faint"
              >
                {message.systemKey
                  ? t(`system.${message.systemKey}`, message.systemValues ?? {})
                  : message.body}
              </li>
            );
          }
          const author = message.participantId
            ? (names.get(message.participantId) ?? message.authorName)
            : message.authorName;
          const mine = message.participantId === youId;
          const authorId = message.participantId;
          return (
            <li key={message.id} className="group">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[12px] font-bold"
                  style={{
                    color:
                      message.colorIndex === null
                        ? undefined
                        : participantColor(message.colorIndex),
                  }}
                >
                  {author}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  {timeLabel(message.createdAt, "en-GB")}
                </span>
                {!mine && message.participantId && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((id) => (id === message.id ? null : message.id))
                    }
                    aria-expanded={openMenu === message.id}
                    className="ms-auto flex size-6 items-center justify-center rounded text-[13px] text-ink-faint hover:text-ink"
                    aria-label={t("messageActions")}
                  >
                    ⋯
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-ink">
                {message.body}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1">
                {message.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    type="button"
                    onClick={() => onReact(message.id, reaction.emoji as ReactionEmoji)}
                    className={`rounded-full border px-1.5 py-0.5 text-[11px] leading-none ${
                      reaction.mine
                        ? "border-pink-deep bg-butter/70 text-ink"
                        : "border-line-soft text-ink-soft"
                    }`}
                  >
                    {reaction.emoji} {reaction.count}
                  </button>
                ))}
                <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  {REACTION_EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onReact(message.id, emoji)}
                      aria-label={t("reactWith", { emoji })}
                      className="rounded px-0.5 text-[12px] hover:bg-paper-sunken"
                    >
                      {emoji}
                    </button>
                  ))}
                </span>
              </div>

              {openMenu === message.id && authorId && (
                <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border-2 border-line-soft bg-paper-sunken p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleHidden(authorId);
                      setOpenMenu(null);
                    }}
                    className="min-h-11 rounded px-2 text-[12px] font-semibold text-ink-soft hover:text-ink"
                  >
                    {hiddenIds.includes(authorId) ? t("unblockLocal") : t("blockLocal")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReport(authorId);
                      setOpenMenu(null);
                    }}
                    className="min-h-11 rounded px-2 text-[12px] font-semibold text-ink-soft hover:text-ink"
                  >
                    {t("report")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="min-h-5 px-3 text-[11px] italic text-ink-faint" aria-live="polite">
        {typingNames.length === 1
          ? t("typing", { name: typingNames[0] })
          : typingNames.length > 1
            ? t("typingMany", { count: typingNames.length })
            : ""}
      </p>

      <form
        className="border-t-2 border-line-soft p-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {!enabled ? (
          <p className="px-1 py-2 text-[13px] text-ink-faint">{t("chatDisabled")}</p>
        ) : muted ? (
          <p className="px-1 py-2 text-[13px] text-ink-faint">{t("chatMuted")}</p>
        ) : (
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="room-chat-input">
              {t("chatPlaceholder")}
            </label>
            <textarea
              id="room-chat-input"
              value={draft}
              rows={2}
              maxLength={MAX_CHAT_LENGTH}
              placeholder={t("chatPlaceholder")}
              onChange={(e) => {
                setDraft(e.target.value);
                if (!typingSentRef.current) {
                  typingSentRef.current = true;
                  onTyping(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="min-h-11 flex-1 resize-none rounded-lg border-2 border-line bg-paper-bright px-2 py-1.5 text-[13px] text-ink"
            />
            <GlossyButton type="submit" size="sm" variant="primary" disabled={!draft.trim()}>
              {t("send")}
            </GlossyButton>
          </div>
        )}
        {enabled && !muted && remaining < 60 && (
          <p className="mt-1 text-end font-mono text-[11px] text-ink-faint">{remaining}</p>
        )}
      </form>
    </div>
  );
}
