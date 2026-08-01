"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  registerSchema,
  suggestUsername,
  usernameSchema,
} from "@/lib/account/validation";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { IconBunnyHead } from "@/components/ui/Icons";
import { AccountShell } from "./AccountShell";
import {
  CheckboxField,
  FormStatus,
  TextField,
  fieldErrorsFrom,
  useAccountError,
  type FieldErrors,
} from "./fields";
import { guestAttempts, mergeGuestProgress } from "./guest-progress";
import { DeliveryNotice } from "./DeliveryNotice";

type UsernameState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "invalid"; reason: string }
  | { kind: "taken"; suggestion: string | null };

interface RegisterResponse {
  ok?: true;
  error?: string;
  issues?: unknown;
  deliveredBy?: "webhook" | "none";
  verificationUrl?: string;
}

interface Done {
  deliveredBy: "webhook" | "none";
  verificationUrl: string | null;
  /** null when the merge was asked for and refused. */
  merged: number | null;
  askedToMerge: boolean;
  signedIn: boolean;
}

async function checkUsername(
  value: string,
  signal: AbortSignal
): Promise<{ available: boolean; reason: string | null }> {
  const res = await fetch(`/api/account/username?u=${encodeURIComponent(value)}`, {
    signal,
  });
  return (await res.json()) as { available: boolean; reason: string | null };
}

/** Find the first free `name2`, `name3`, … near a taken username. */
async function findSuggestion(
  base: string,
  signal: AbortSignal
): Promise<string | null> {
  for (let n = 2; n <= 6; n++) {
    const candidate = `${base.slice(0, 18)}${n}`;
    const result = await checkUsername(candidate, signal);
    if (result.available) return candidate;
  }
  return null;
}

export function RegisterForm() {
  const t = useTranslations("account");
  const errorText = useAccountError();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [migrate, setMigrate] = useState(true);
  const [guestCount, setGuestCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameState, setNameState] = useState<UsernameState>({ kind: "idle" });
  const [done, setDone] = useState<Done | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGuestCount(guestAttempts().length);
  }, []);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  // Typing a display name fills the username until the person edits it.
  const onDisplayName = useCallback(
    (value: string) => {
      setDisplayName(value);
      if (!usernameTouched) setUsername(value ? suggestUsername(value) : "");
    },
    [usernameTouched]
  );

  // Live availability, debounced, with a suggestion when the name is taken.
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (value.length === 0) {
      setNameState({ kind: "idle" });
      return;
    }
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setNameState({
        kind: "invalid",
        reason: parsed.error.issues[0]?.message ?? "username_invalid_characters",
      });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setNameState({ kind: "checking" });
      try {
        const result = await checkUsername(parsed.data, controller.signal);
        if (result.available) {
          setNameState({ kind: "free" });
        } else if (result.reason) {
          setNameState({ kind: "invalid", reason: result.reason });
        } else {
          const suggestion = await findSuggestion(parsed.data, controller.signal);
          setNameState({ kind: "taken", suggestion });
        }
      } catch {
        // Aborted or offline: say nothing rather than something wrong.
        if (!controller.signal.aborted) setNameState({ kind: "idle" });
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [username]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);

    const input = {
      email,
      password,
      displayName,
      username,
      migrateGuestProgress: migrate && guestCount > 0,
    };
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error.flatten()));
      return;
    }
    setFieldErrors({});
    setBusy(true);

    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as RegisterResponse;

      if (!res.ok) {
        if (res.status === 429) setFormError(errorText("rate_limited"));
        else if (body.issues) setFieldErrors(fieldErrorsFrom(body.issues));
        else setFormError(errorText(body.error ?? "unknown"));
        setBusy(false);
        return;
      }

      // The account exists; now establish the session with the same details.
      const result = await signIn("password", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      const signedIn = Boolean(result && !result.error);

      let merged: number | null = 0;
      const askedToMerge = parsed.data.migrateGuestProgress && signedIn;
      if (askedToMerge) merged = await mergeGuestProgress();

      const deliveredBy = body.deliveredBy === "webhook" ? "webhook" : "none";
      const verificationUrl = body.verificationUrl ?? null;

      // Nothing to report and the session is live: go straight to the desk.
      if (signedIn && deliveredBy === "webhook" && merged !== null) {
        router.push("/profile");
        router.refresh();
        return;
      }

      setDone({ deliveredBy, verificationUrl, merged, askedToMerge, signedIn });
      router.refresh();
    } catch {
      setFormError(errorText("network"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AccountShell title={t("registerDoneTitle")} icon={<IconBunnyHead className="size-5" />}>
        <div ref={doneRef} tabIndex={-1} className="space-y-4">
          <p className="text-[15px] text-ink">{t("registerDoneBody")}</p>

          {done.askedToMerge &&
            (done.merged === null ? (
              <p className="rounded-card border-2 border-wrong bg-paper-bright px-3 py-2 text-sm text-wrong">
                ✗ {t("migrateFailed")}
              </p>
            ) : (
              <p className="rounded-card border-2 border-line-soft bg-paper-sunken px-3 py-2 text-sm text-ink">
                ✓ {t("migrateDone", { count: done.merged })}
              </p>
            ))}

          <DeliveryNotice
            deliveredBy={done.deliveredBy}
            url={done.verificationUrl}
            tokenPath="/account/verify"
            noMailTitle={t("verifyNoMailTitle")}
            noMailBody={t("verifyNoMailBody")}
            noLinkBody={t("verifyNoLink")}
            sentTitle={t("verifySentTitle")}
            sentBody={t("verifySentBody")}
            openLabel={t("openVerifyLink")}
          />

          {done.signedIn ? (
            <GlossyLink href="/profile" variant="primary">
              {t("goToDesk")}
            </GlossyLink>
          ) : (
            <>
              <p className="text-sm text-ink-soft">{t("signInAfterRegister")}</p>
              <GlossyLink href="/account/sign-in" variant="primary">
                {t("submitSignIn")}
              </GlossyLink>
            </>
          )}
        </div>
      </AccountShell>
    );
  }

  const nameStatus = (() => {
    switch (nameState.kind) {
      case "checking":
        return <span className="text-ink-soft">{t("checking")}</span>;
      case "free":
        return (
          <span className="font-semibold text-correct">
            ✓ {t("usernameAvailable", { username: username.trim().toLowerCase() })}
          </span>
        );
      case "invalid":
        return <span className="font-semibold text-wrong">✗ {errorText(nameState.reason)}</span>;
      case "taken":
        return (
          <span className="text-wrong">
            <span className="font-semibold">
              ✗ {t("usernameTaken", { username: username.trim().toLowerCase() })}
            </span>
            {nameState.suggestion && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setUsernameTouched(true);
                    setUsername(nameState.suggestion ?? "");
                  }}
                  className="min-h-11 font-semibold text-pink-deep underline"
                >
                  {t("useSuggestion", { suggestion: nameState.suggestion })}
                </button>
              </>
            )}
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <AccountShell
      title={t("registerTitle")}
      lead={t("registerLead")}
      icon={<IconBunnyHead className="size-5" />}
      footer={
        <>
          <p className="text-sm text-ink-soft">
            {t("haveAccount")}{" "}
            <Link href="/account/sign-in" className="font-semibold text-pink-deep underline">
              {t("submitSignIn")}
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
          error={errorText(fieldErrors.email)}
        />
        <TextField
          label={t("password")}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          hint={t("passwordHint")}
          disabled={busy}
          error={errorText(fieldErrors.password)}
        />
        <TextField
          label={t("displayName")}
          value={displayName}
          onChange={onDisplayName}
          autoComplete="nickname"
          hint={t("displayNameHint")}
          maxLength={40}
          disabled={busy}
          error={errorText(fieldErrors.displayName)}
        />
        <TextField
          label={t("username")}
          value={username}
          onChange={(v) => {
            setUsernameTouched(true);
            setUsername(v);
          }}
          type="text"
          dir="ltr"
          autoComplete="username"
          hint={t("usernameHint")}
          maxLength={20}
          disabled={busy}
          status={nameStatus}
          error={errorText(fieldErrors.username)}
        />

        {guestCount > 0 && (
          <CheckboxField
            label={t("migrateLabel")}
            note={t("migrateNote", { count: guestCount })}
            checked={migrate}
            onChange={setMigrate}
            disabled={busy}
          />
        )}

        <FormStatus error={formError} />

        <GlossyButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          {busy ? t("busy") : t("submitRegister")}
        </GlossyButton>
      </form>
    </AccountShell>
  );
}
