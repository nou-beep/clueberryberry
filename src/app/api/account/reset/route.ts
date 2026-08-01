import { NextResponse } from "next/server";
import {
  createPasswordReset,
  performPasswordReset,
} from "@/lib/account/service";
import {
  performResetSchema,
  requestResetSchema,
} from "@/lib/account/validation";
import { deliverPasswordResetEmail } from "@/lib/account/mail";
import { rateLimit } from "@/lib/rate-limit";

/** Request a reset link. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "reset-request", {
    max: 5,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const parsed = requestResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const created = await createPasswordReset(parsed.data.email);
  // Always the same answer: revealing whether an address exists would let
  // anyone enumerate accounts.
  if (!created) return NextResponse.json({ ok: true, deliveredBy: "none" });

  const delivery = await deliverPasswordResetEmail(parsed.data.email, created.token);
  return NextResponse.json({
    ok: true,
    deliveredBy: delivery.deliveredBy,
    // Without a mail transport the link is returned so the UI can show it
    // rather than claiming an email was sent.
    resetUrl: delivery.deliveredBy === "none" ? delivery.url : undefined,
  });
}

/** Complete a reset with the token from the link. */
export async function PUT(request: Request) {
  const limited = rateLimit(request, "reset-perform", {
    max: 10,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const parsed = performResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await performPasswordReset(parsed.data.token, parsed.data.password);
  if (result !== "ok") return NextResponse.json({ error: result }, { status: 400 });
  return NextResponse.json({ ok: true });
}
