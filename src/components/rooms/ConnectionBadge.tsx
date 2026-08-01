"use client";

import { useTranslations } from "next-intl";
import type { SocketStatus } from "@/lib/multiplayer/useRoomSocket";

interface Props {
  status: SocketStatus;
  queued: number;
  onRetry: () => void;
}

const DOT: Record<SocketStatus, string> = {
  connecting: "bg-butter",
  open: "bg-mint",
  reconnecting: "bg-orange",
  unreachable: "bg-wrong",
  closed: "bg-line-soft",
};

/**
 * The honest status of the socket. When it is down the room says so — there is
 * no silent optimistic mode pretending everyone can see your letters.
 */
export function ConnectionBadge({ status, queued, onRetry }: Props) {
  const t = useTranslations("rooms");
  const down = status === "unreachable";
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 text-[12px] font-semibold ${
          down ? "border-wrong text-wrong" : "border-line-soft text-ink-soft"
        }`}
        role="status"
      >
        <span aria-hidden className={`block size-2 rounded-full ${DOT[status]}`} />
        {t(`status.${status}`)}
        {queued > 0 && (
          <span className="text-ink-faint">· {t("status.queued", { count: queued })}</span>
        )}
      </span>
      {down && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-lg px-2 text-[12px] font-semibold text-pink-deep underline underline-offset-2"
        >
          {t("retry")}
        </button>
      )}
    </span>
  );
}
