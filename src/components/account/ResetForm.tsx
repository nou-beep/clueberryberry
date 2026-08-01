"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { emailSchema, passwordSchema } from "@/lib/account/validation";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { IconBunnyHead } from "@/components/ui/Icons";
import { AccountShell } from "./AccountShell";
import { FormStatus, TextField, useAccountError } from "./fields";
import { DeliveryNotice } from "./DeliveryNotice";

interface RequestResult {
  deliveredBy: "webhook" | "none";
  resetUrl: string | null;
}

/** No token yet: ask for the address and report honestly what was delivered. */
function RequestReset() {
  const t = useTranslations("account");
  const errorText = useAccountError();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "email_invalid");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: true;
        error?: string;
        deliveredBy?: "webhook" | "none";
        resetUrl?: string;
      };
      if (!res.ok) {
        setFormError(errorText(res.status === 429 ? "rate_limited" : body.error ?? "unknown"));
        return;
      }
      setResult({
        deliveredBy: body.deliveredBy === "webhook" ? "webhook" : "none",
        resetUrl: body.resetUrl ?? null,
      });
    } catch {
      setFormError(errorText("network"));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <AccountShell title={t("resetTitle")} icon={<IconBunnyHead className="size-5" />}>
        <div className="space-y-4">
          <DeliveryNotice
            deliveredBy={result.deliveredBy}
            url={result.resetUrl}
            tokenPath="/account/reset"
            noMailTitle={t("resetNoMailTitle")}
            noMailBody={t("resetNoMailBody")}
            noLinkBody={t("resetNoLink")}
            sentTitle={t("resetSentTitle")}
            sentBody={t("resetSentBody")}
            openLabel={t("openResetLink")}
          />
          <GlossyLink href="/account/sign-in" variant="quiet">
            {t("backToSignIn")}
          </GlossyLink>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title={t("resetTitle")}
      lead={t("resetRequestLead")}
      icon={<IconBunnyHead className="size-5" />}
      footer={
        <GlossyLink href="/account/sign-in" variant="quiet">
          {t("backToSignIn")}
        </GlossyLink>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label={t("email")}
          value={email}
          onChange={setEmail}
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          autoFocus
          disabled={busy}
          error={errorText(fieldError)}
        />
        <FormStatus error={formError} />
        <GlossyButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          {busy ? t("busy") : t("submitReset")}
        </GlossyButton>
      </form>
    </AccountShell>
  );
}

/** With a token: choose a new password. */
function PerformReset({ token }: { token: string }) {
  const t = useTranslations("account");
  const errorText = useAccountError();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "password_too_short");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/reset", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: parsed.data }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: true; error?: string };
      if (!res.ok || !body.ok) {
        setFormError(errorText(res.status === 429 ? "rate_limited" : body.error ?? "unknown"));
        return;
      }
      setDone(true);
    } catch {
      setFormError(errorText("network"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AccountShell title={t("resetDoneTitle")} icon={<IconBunnyHead className="size-5" />}>
        <div className="space-y-4">
          <p className="text-[15px] text-ink">{t("resetDoneBody")}</p>
          <GlossyLink href="/account/sign-in" variant="primary">
            {t("submitSignIn")}
          </GlossyLink>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title={t("resetNewTitle")}
      lead={t("resetNewLead")}
      icon={<IconBunnyHead className="size-5" />}
      footer={
        <GlossyLink href="/account/reset" variant="quiet">
          {t("resetAskAgain")}
        </GlossyLink>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label={t("newPassword")}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          hint={t("passwordHint")}
          autoFocus
          disabled={busy}
          error={errorText(fieldError)}
        />
        <FormStatus error={formError} />
        <GlossyButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          {busy ? t("busy") : t("submitNewPassword")}
        </GlossyButton>
      </form>
    </AccountShell>
  );
}

/** One route, two states: request a link, or use the one you were given. */
export function ResetForm() {
  const token = useSearchParams().get("token");
  return token ? <PerformReset token={token} /> : <RequestReset />;
}
