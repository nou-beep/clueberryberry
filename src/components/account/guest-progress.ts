import { loadAttempts, type LocalAttempt } from "@/lib/progress/local";

/** Guest progress kept by this browser, in the shape /api/attempts/merge takes. */
export function guestAttempts(): LocalAttempt[] {
  return Object.values(loadAttempts());
}

/**
 * Copy this browser's attempts into the signed-in account.
 * Returns how many rows the server actually took, or null if it refused —
 * the caller must not claim a migration that did not happen.
 */
export async function mergeGuestProgress(): Promise<number | null> {
  const attempts = guestAttempts();
  if (attempts.length === 0) return 0;
  try {
    const res = await fetch("/api/attempts/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attempts }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { merged?: number };
    return typeof body.merged === "number" ? body.merged : null;
  } catch {
    return null;
  }
}
