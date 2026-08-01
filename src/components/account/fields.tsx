"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Form furniture shared by every account screen: a real <label>, a hint and an
 * error wired through aria-describedby, and a 44px control. Nothing here
 * invents state — an error is only ever what the caller was told.
 */

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  /** Static guidance, always visible — the rules are not a surprise. */
  hint?: string;
  /** Message shown under the field. Rendered only when present. */
  error?: string | null;
  /** Extra live feedback (e.g. username availability). */
  status?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  dir?: "ltr" | "auto";
  inputMode?: "text" | "email";
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
  error,
  status,
  required = true,
  disabled = false,
  maxLength,
  autoFocus = false,
  dir,
  inputMode,
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const statusId = `${id}-status`;
  const describedBy = [hint ? hintId : null, error ? errorId : null, status ? statusId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        dir={dir}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        // The first field of a single-purpose form the reader opened on
        // purpose; nothing above it is skipped by taking focus here.
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="min-h-11 w-full rounded-[10px] border-2 border-line bg-paper-sunken px-3 text-[15px] text-ink disabled:opacity-60"
      />
      {hint && (
        <p id={hintId} className="text-[13px] leading-snug text-ink-soft">
          {hint}
        </p>
      )}
      {status && (
        <p id={statusId} className="text-[13px] leading-snug" aria-live="polite">
          {status}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] font-semibold leading-snug text-wrong">
          ✗ {error}
        </p>
      )}
    </div>
  );
}

/** A checkbox with a real label and an explanatory line. */
export function CheckboxField({
  label,
  note,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className="rounded-card border-2 border-line-soft bg-paper-sunken/60 p-3">
      <label htmlFor={id} className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={note ? noteId : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 shrink-0 accent-[var(--pink-deep)]"
        />
        <span>{label}</span>
      </label>
      {note && (
        <p id={noteId} className="mt-1 text-[13px] leading-snug text-ink-soft">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * The form-level status line. Always in the DOM so assistive technology picks
 * up changes; empty until the server has actually said something.
 */
export function FormStatus({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  return (
    <div aria-live="polite" className="empty:hidden">
      {error && (
        <p
          role="alert"
          className="rounded-card border-2 border-wrong bg-paper-bright px-3 py-2 text-sm font-semibold text-wrong"
        >
          ✗ {error}
        </p>
      )}
      {!error && message && (
        <p className="rounded-card border-2 border-line-soft bg-paper-sunken px-3 py-2 text-sm text-ink">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Turns a server error code into a sentence. Unknown codes fall back to a
 * readable line rather than leaking `password_too_repetitive` at a person.
 */
export function useAccountError(): (code: string | null | undefined) => string | null {
  const t = useTranslations("account.errors");
  return (code) => {
    if (!code) return null;
    return t.has(code) ? t(code) : t("unknown");
  };
}

/** Field-level issues keyed by field name, as returned by a Zod flatten(). */
export type FieldErrors = Partial<Record<string, string>>;

interface FlattenedIssues {
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Read `{ error: "invalid", issues: { fieldErrors } }` into per-field codes. */
export function fieldErrorsFrom(issues: unknown): FieldErrors {
  const flat = issues as FlattenedIssues | undefined;
  const out: FieldErrors = {};
  for (const [field, codes] of Object.entries(flat?.fieldErrors ?? {})) {
    const code = codes?.[0];
    if (code) out[field] = code;
  }
  return out;
}
