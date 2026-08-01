"use client";

import { Link } from "@/i18n/navigation";

/**
 * What actually happened to the email.
 *
 * This build has no mail transport, so the API answers `deliveredBy: "none"`
 * and hands back the link. We show that link and say plainly that nothing was
 * sent — the one thing we must never print here is "check your inbox".
 */

function tokenOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, window.location.origin).searchParams.get("token");
  } catch {
    return null;
  }
}

export function DeliveryNotice({
  deliveredBy,
  url,
  tokenPath,
  noMailTitle,
  noMailBody,
  noLinkBody,
  sentTitle,
  sentBody,
  openLabel,
}: {
  deliveredBy: "webhook" | "none";
  /** The link the server returned, present only when nothing was sent. */
  url: string | null;
  /** In-app route the token belongs to, so the link works on this origin. */
  tokenPath: "/account/verify" | "/account/reset";
  noMailTitle: string;
  noMailBody: string;
  noLinkBody: string;
  sentTitle: string;
  sentBody: string;
  openLabel: string;
}) {
  if (deliveredBy === "webhook") {
    return (
      <div className="rounded-card border-2 border-line bg-paper-sunken p-3">
        <p className="font-display text-[17px] text-ink">{sentTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{sentBody}</p>
      </div>
    );
  }

  const token = tokenOf(url);

  return (
    <div className="rounded-card border-2 border-line bg-butter/40 p-3">
      <p className="font-display text-[17px] text-ink">{noMailTitle}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {token ? noMailBody : noLinkBody}
      </p>
      {token && (
        <>
          <p className="mt-3">
            <Link
              href={`${tokenPath}?token=${encodeURIComponent(token)}`}
              className="font-semibold text-pink-deep underline"
            >
              {openLabel}
            </Link>
          </p>
          <code
            dir="ltr"
            className="mt-2 block break-all rounded-[10px] border-2 border-line-soft bg-paper-bright p-2 font-mono text-[12px] text-ink-soft"
          >
            {url}
          </code>
        </>
      )}
    </div>
  );
}
