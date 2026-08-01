import { NextResponse } from "next/server";
import { usernameAvailable } from "@/lib/account/service";
import { usernameSchema } from "@/lib/account/validation";
import { rateLimit } from "@/lib/rate-limit";

/** Live availability check for the registration and profile forms. */
export async function GET(request: Request) {
  // Unauthenticated and it touches the database, so it gets a budget.
  const limited = rateLimit(request, "username-check", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const value = new URL(request.url).searchParams.get("u") ?? "";
  const parsed = usernameSchema.safeParse(value);
  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason: parsed.error.issues[0]?.message ?? "username_invalid_characters",
    });
  }
  return NextResponse.json({
    available: await usernameAvailable(parsed.data),
    reason: null,
  });
}
