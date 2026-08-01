"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { IconBunnyHead, IconCheck } from "@/components/ui/Icons";
import { AccountShell } from "./AccountShell";

type State = "missing" | "checking" | "ok" | "expired" | "used" | "invalid" | "network";

/** Reads the token from the link, asks the server, and reports what it said. */
export function VerifyClient() {
  const t = useTranslations("account");
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(token ? "checking" : "missing");
  // A verification token is single-use: never spend it twice.
  const spent = useRef(false);

  useEffect(() => {
    if (!token || spent.current) return;
    spent.current = true;
    fetch("/api/account/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          ok?: true;
          error?: string;
        };
        if (res.ok && body.ok) return setState("ok");
        if (body.error === "expired" || body.error === "used") return setState(body.error);
        setState("invalid");
      })
      .catch(() => setState("network"));
  }, [token]);

  const MESSAGES: Record<State, string> = {
    missing: t("verifyNoToken"),
    checking: t("verifyChecking"),
    ok: t("verifyOk"),
    expired: t("verifyExpired"),
    used: t("verifyUsed"),
    invalid: t("verifyInvalid"),
    network: t("errors.network"),
  };

  return (
    <AccountShell title={t("verifyTitle")} icon={<IconBunnyHead className="size-5" />}>
      <div className="space-y-4">
        <p
          aria-live="polite"
          className={`flex items-start gap-2 text-[15px] ${
            state === "ok" ? "text-correct" : state === "checking" ? "text-ink-soft" : "text-ink"
          }`}
        >
          {state === "ok" && <IconCheck className="mt-0.5 size-5 shrink-0" />}
          {MESSAGES[state]}
        </p>
        <div className="flex flex-wrap gap-3">
          <GlossyLink href="/profile" variant="primary">
            {t("goToDesk")}
          </GlossyLink>
          {state !== "ok" && state !== "checking" && (
            <GlossyLink href="/account/sign-in" variant="quiet">
              {t("backToSignIn")}
            </GlossyLink>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
