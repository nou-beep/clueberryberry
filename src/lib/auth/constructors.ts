import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { constructorAllowList, isConstructorEmail } from "./constructor-list";

/**
 * Session-aware wrappers around the constructor allow-list.
 *
 * The editor writes directly into the published library, so these checks are
 * the only thing between a stranger and the front page. They belong on the
 * route handlers, not just on the pages: hiding a link is presentation, not
 * access control.
 */
export { isConstructorEmail };

/** For server components: may the current visitor see the editor at all? */
export async function currentUserIsConstructor(): Promise<boolean> {
  if (constructorAllowList().length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  const session = await auth();
  return isConstructorEmail(session?.user?.email);
}

/**
 * For route handlers. Returns a response to send back when the caller is not
 * allowed, or null when they are:
 *
 *     const denied = await requireConstructor();
 *     if (denied) return denied;
 *
 * 404 rather than 403 for a signed-out caller, so an unauthenticated prober
 * cannot map which endpoints exist.
 */
export async function requireConstructor(): Promise<NextResponse | null> {
  if (constructorAllowList().length === 0 && process.env.NODE_ENV !== "production") {
    return null;
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isConstructorEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
