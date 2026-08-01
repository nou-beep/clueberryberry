"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { IconBunnyHead } from "@/components/ui/Icons";
import { AccountShell } from "./AccountShell";
import { FormStatus, TextField, useAccountError } from "./fields";

/**
 * Email and password, plus Google when — and only when — the server has OAuth
 * credentials. Signing in is never a wall: the guest escape below the form
 * goes straight back to the library.
 */
export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("account");
  const errorText = useAccountError();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError(errorText("missing_credentials"));
      return;
    }
    setBusy(true);
    try {
      const result = await signIn("password", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setFormError(errorText("invalid_credentials"));
        setBusy(false);
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setFormError(errorText("network"));
      setBusy(false);
    }
  }

  return (
    <AccountShell
      title={t("signInTitle")}
      lead={t("signInLead")}
      icon={<IconBunnyHead className="size-5" />}
      footer={
        <>
          <p className="text-sm text-ink-soft">
            {t("noAccount")}{" "}
            <Link href="/account/register" className="font-semibold text-pink-deep underline">
              {t("submitRegister")}
            </Link>
          </p>
          <p className="text-sm text-ink-soft">{t("guestEscapeNote")}</p>
          <GlossyLink href="/subjects" variant="quiet">
            {t("guestEscape")}
          </GlossyLink>
        </>
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
        />
        <TextField
          label={t("password")}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="current-password"
          disabled={busy}
        />

        <FormStatus error={formError} />

        <div className="flex flex-wrap items-center gap-3">
          <GlossyButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
            {busy ? t("busy") : t("submitSignIn")}
          </GlossyButton>
          <Link
            href="/account/reset"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-pink-deep underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {googleEnabled && (
          <>
            <p className="label-caps text-center text-ink-faint">{t("or")}</p>
            <GlossyButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => signIn("google", { callbackUrl: "/profile" })}
            >
              {t("googleSignIn")}
            </GlossyButton>
          </>
        )}
      </form>
    </AccountShell>
  );
}
