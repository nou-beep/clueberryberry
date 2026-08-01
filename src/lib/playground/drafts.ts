import type { PlaygroundDefinition } from "./definition";
import { playgroundDefinitionSchema } from "./definition";
import type { PlaygroundForm } from "./form";

/**
 * Unfinished work, kept on this device.
 *
 * Saving to an account needs an account; a draft does not, so work in progress
 * survives a reload either way. Drafts are local only and never sync — the
 * studio says so rather than implying they are backed up.
 */

const KEY = "clueberry.playground.draft.v1";

export interface PlaygroundDraft {
  form: PlaygroundForm;
  definition: PlaygroundDefinition | null;
  theme: string | null;
  seed: number;
  savedAt: string;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function saveDraft(draft: PlaygroundDraft): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(draft));
  } catch {
    // A full or blocked storage must not break the builder.
  }
}

export function loadDraft(): PlaygroundDraft | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlaygroundDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    if (parsed.definition) {
      const definition = playgroundDefinitionSchema.safeParse(parsed.definition);
      if (!definition.success) return { ...parsed, definition: null };
      return { ...parsed, definition: definition.data };
    }
    return { ...parsed, definition: null };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  storage()?.removeItem(KEY);
}
