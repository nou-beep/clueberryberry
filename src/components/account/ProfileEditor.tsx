"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { profileUpdateSchema, usernameSchema } from "@/lib/account/validation";
import { GlossyButton } from "@/components/ui/GlossyButton";
import type { AvatarKind } from "@/components/ui/Avatar";
import { AvatarPicker } from "./AvatarPicker";
import { FavouritePicker } from "./FavouritePicker";
import {
  FormStatus,
  TextField,
  fieldErrorsFrom,
  useAccountError,
  type FieldErrors,
} from "./fields";
import type { AccountProfile, TaxonomyOption } from "./types";

type NameState = "idle" | "checking" | "free" | "taken" | "invalid";

/**
 * Editing the desk: identity, avatar, favourites and multiplayer presence.
 * The server is the authority — every message below is something it said.
 */
export function ProfileEditor({
  profile,
  subjects,
  collections,
  onSaved,
  onCancel,
}: {
  profile: AccountProfile;
  subjects: TaxonomyOption[];
  collections: TaxonomyOption[];
  onSaved: (next: AccountProfile) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("account");
  const errorText = useAccountError();
  const bioId = useId();

  const [draft, setDraft] = useState<AccountProfile>(profile);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameState, setNameState] = useState<NameState>("idle");
  const [nameReason, setNameReason] = useState<string | null>(null);

  const set = <K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Live availability, skipped while the username is still the current one.
  useEffect(() => {
    const value = draft.username.trim().toLowerCase();
    if (value === profile.username.trim().toLowerCase()) {
      setNameState("idle");
      return;
    }
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setNameReason(parsed.error.issues[0]?.message ?? "username_invalid_characters");
      setNameState("invalid");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setNameState("checking");
      try {
        const res = await fetch(`/api/account/username?u=${encodeURIComponent(parsed.data)}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as { available: boolean; reason: string | null };
        if (body.available) {
          setNameState("free");
        } else if (body.reason) {
          setNameReason(body.reason);
          setNameState("invalid");
        } else {
          setNameState("taken");
        }
      } catch {
        if (!controller.signal.aborted) setNameState("idle");
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft.username, profile.username]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);

    const payload = {
      displayName: draft.displayName,
      username: draft.username,
      bio: draft.bio,
      avatarKind: draft.avatarKind,
      avatarSeed: draft.avatarSeed,
      favoriteSubjects: draft.favoriteSubjects,
      favoriteCollections: draft.favoriteCollections,
      multiplayerName: draft.multiplayerName,
      showPresence: draft.showPresence,
    };
    const parsed = profileUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error.flatten()));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: true;
        error?: string;
        issues?: unknown;
      };
      if (!res.ok || !body.ok) {
        if (body.issues) setFieldErrors(fieldErrorsFrom(body.issues));
        else setFormError(errorText(res.status === 429 ? "rate_limited" : body.error ?? "unknown"));
        return;
      }
      onSaved({
        ...draft,
        username: draft.username.trim().toLowerCase(),
        bio: draft.bio.trim(),
      });
    } catch {
      setFormError(errorText("network"));
    } finally {
      setBusy(false);
    }
  }

  const nameStatus = (() => {
    switch (nameState) {
      case "checking":
        return <span className="text-ink-soft">{t("checking")}</span>;
      case "free":
        return <span className="font-semibold text-correct">✓ {t("usernameFree")}</span>;
      case "taken":
        return (
          <span className="font-semibold text-wrong">
            ✗ {t("usernameTaken", { username: draft.username.trim().toLowerCase() })}
          </span>
        );
      case "invalid":
        return <span className="font-semibold text-wrong">✗ {errorText(nameReason)}</span>;
      default:
        return null;
    }
  })();

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 p-4">
      <TextField
        label={t("displayName")}
        value={draft.displayName}
        onChange={(v) => set("displayName", v)}
        autoComplete="nickname"
        maxLength={40}
        disabled={busy}
        error={errorText(fieldErrors.displayName)}
      />
      <TextField
        label={t("username")}
        value={draft.username}
        onChange={(v) => set("username", v)}
        dir="ltr"
        autoComplete="username"
        hint={t("usernameHint")}
        maxLength={20}
        disabled={busy}
        status={nameStatus}
        error={errorText(fieldErrors.username)}
      />

      <div className="space-y-1.5">
        <label htmlFor={bioId} className="block text-[15px] font-semibold text-ink">
          {t("bio")}
        </label>
        <textarea
          id={bioId}
          value={draft.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={280}
          rows={3}
          disabled={busy}
          aria-describedby={`${bioId}-hint`}
          className="w-full rounded-[10px] border-2 border-line bg-paper-sunken p-3 text-[15px] text-ink"
        />
        <p id={`${bioId}-hint`} className="text-[13px] text-ink-soft">
          {t("bioHint", { remaining: 280 - draft.bio.length })}
        </p>
      </div>

      <AvatarPicker
        kind={draft.avatarKind}
        seed={draft.avatarSeed}
        disabled={busy}
        onChange={({ kind, seed }) =>
          setDraft((d) => ({ ...d, avatarKind: kind as AvatarKind, avatarSeed: seed }))
        }
      />

      <FavouritePicker
        legend={t("favoriteSubjects")}
        options={subjects}
        selected={draft.favoriteSubjects}
        disabled={busy}
        onChange={(v) => set("favoriteSubjects", v)}
      />
      <FavouritePicker
        legend={t("favoriteCollections")}
        options={collections}
        selected={draft.favoriteCollections}
        disabled={busy}
        onChange={(v) => set("favoriteCollections", v)}
      />

      <TextField
        label={t("multiplayerName")}
        value={draft.multiplayerName}
        onChange={(v) => set("multiplayerName", v)}
        hint={t("multiplayerNameHint")}
        maxLength={40}
        required={false}
        disabled={busy}
        error={errorText(fieldErrors.multiplayerName)}
      />

      <label className="flex min-h-11 items-center gap-3 rounded-card border-2 border-line-soft bg-paper-sunken/60 p-3 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={draft.showPresence}
          disabled={busy}
          onChange={(e) => set("showPresence", e.target.checked)}
          className="size-5 shrink-0 accent-[var(--pink-deep)]"
        />
        <span>
          {t("showPresence")}
          <span className="block text-[13px] text-ink-soft">{t("showPresenceHint")}</span>
        </span>
      </label>

      <FormStatus error={formError} />

      <div className="flex flex-wrap gap-3">
        <GlossyButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          {busy ? t("busy") : t("saveProfile")}
        </GlossyButton>
        <GlossyButton type="button" variant="quiet" disabled={busy} onClick={onCancel}>
          {t("cancel")}
        </GlossyButton>
      </div>
    </form>
  );
}
