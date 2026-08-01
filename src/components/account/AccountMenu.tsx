"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, isAvatarKind, type AvatarKind } from "@/components/ui/Avatar";

/**
 * The small account control in the header: an avatar and a menu when signed
 * in, a plain "Sign in" link when not. Nothing is drawn until we actually know
 * which of the two is true, so the header never shows a state that is a guess.
 */

export interface HeaderIdentity {
  displayName: string;
  username: string;
  avatarKind: AvatarKind;
  avatarSeed: number;
}

/** Fired by the profile editor so the header picks up a new name or avatar. */
const IDENTITY_EVENT = "clueberry:identity";
const CACHE_KEY = "clueberry.identity";

function readCache(): HeaderIdentity | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeaderIdentity;
    return isAvatarKind(parsed.avatarKind) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(identity: HeaderIdentity | null) {
  try {
    if (identity) window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(identity));
    else window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Session storage unavailable: the header just re-fetches next time.
  }
}

/** Tell the header that the signed-in identity changed. */
export function publishIdentity(identity: HeaderIdentity) {
  writeCache(identity);
  window.dispatchEvent(new CustomEvent<HeaderIdentity>(IDENTITY_EVENT, { detail: identity }));
}

type State = { status: "unknown" } | { status: "guest" } | { status: "in"; me: HeaderIdentity };

export function AccountMenu() {
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "unknown" });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        // The JWT session endpoint is free (no database read).
        const res = await fetch("/api/auth/session");
        const session = (await res.json()) as { user?: { name?: string | null } };
        if (!live) return;
        if (!session?.user) {
          writeCache(null);
          setState({ status: "guest" });
          return;
        }
        const cached = readCache();
        if (cached) {
          setState({ status: "in", me: cached });
          return;
        }
        const profileRes = await fetch("/api/account/profile");
        if (!profileRes.ok) {
          setState({ status: "guest" });
          return;
        }
        const body = (await profileRes.json()) as {
          profile: {
            displayName: string;
            username: string;
            avatarKind: string;
            avatarSeed: number;
          };
        };
        if (!live) return;
        const me: HeaderIdentity = {
          displayName: body.profile.displayName,
          username: body.profile.username,
          avatarKind: isAvatarKind(body.profile.avatarKind) ? body.profile.avatarKind : "bunny",
          avatarSeed: body.profile.avatarSeed,
        };
        writeCache(me);
        setState({ status: "in", me });
      } catch {
        if (live) setState({ status: "guest" });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onIdentity = (event: Event) => {
      const detail = (event as CustomEvent<HeaderIdentity>).detail;
      if (detail) setState({ status: "in", me: detail });
    };
    window.addEventListener(IDENTITY_EVENT, onIdentity);
    return () => window.removeEventListener(IDENTITY_EVENT, onIdentity);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (state.status === "unknown") {
    // Reserve the space so the header does not jump once we know.
    return <span aria-hidden className="block size-11" />;
  }

  if (state.status === "guest") {
    return (
      <Link
        href="/account/sign-in"
        className="gloss inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-line bg-paper-bright px-3 text-[13px] font-semibold text-ink shadow-sticker"
      >
        {t("submitSignIn")}
      </Link>
    );
  }

  const { me } = state;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="gloss inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-line bg-paper-bright ps-1.5 pe-2.5 text-[13px] font-semibold text-ink shadow-sticker active:translate-y-0.5 active:shadow-none"
      >
        <Avatar kind={me.avatarKind} seed={me.avatarSeed} size={32} />
        <span className="max-w-28 truncate">{me.displayName}</span>
        <span aria-hidden className="text-[10px] text-ink-soft">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="animate-window-open absolute end-0 top-full z-40 mt-1 min-w-52 overflow-hidden rounded-xl border-2 border-line bg-paper-bright shadow-window"
        >
          <p className="border-b-2 border-line-soft px-3 py-2 text-[13px] text-ink-soft">
            <span dir="ltr">@{me.username}</span>
          </p>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block min-h-11 border-b border-line-soft px-3 py-2.5 text-start text-sm text-ink hover:bg-butter/50"
          >
            {tNav("profile")}
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block min-h-11 border-b border-line-soft px-3 py-2.5 text-start text-sm text-ink hover:bg-butter/50"
          >
            {tNav("settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              writeCache(null);
              void signOut({ callbackUrl: `/${locale}` });
            }}
            className="block min-h-11 w-full px-3 py-2.5 text-start text-sm text-wrong hover:bg-butter/50"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
