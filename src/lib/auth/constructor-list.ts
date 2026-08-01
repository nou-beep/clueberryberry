/**
 * Who is allowed to author official puzzles — the decision, with no session
 * machinery attached.
 *
 * Kept separate from `constructors.ts` so it can be unit-tested without pulling
 * next-auth into the test environment. The rule is the security-critical part;
 * the session lookup around it is not.
 *
 * Fails closed. With `CLUEBERRY_CONSTRUCTORS` unset there are no constructors
 * in production — an unconfigured deployment must not be an open one. In
 * development the dashboard stays reachable so the tooling is usable offline.
 */
export function constructorAllowList(): string[] {
  return (process.env.CLUEBERRY_CONSTRUCTORS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isConstructorEmail(email: string | null | undefined): boolean {
  const list = constructorAllowList();
  if (list.length === 0) return process.env.NODE_ENV !== "production";
  if (!email) return false;
  return list.includes(email.trim().toLowerCase());
}
