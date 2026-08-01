import { NextResponse } from "next/server";
import { createAccount, ensureProfile } from "@/lib/account/service";
import { registerSchema } from "@/lib/account/validation";
import { rateLimit } from "@/lib/rate-limit";
import { deliverVerificationEmail } from "@/lib/account/mail";

export async function POST(request: Request) {
  const limited = rateLimit(request, "register", { max: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await createAccount(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await ensureProfile(result.userId);
  const delivery = await deliverVerificationEmail(
    parsed.data.email,
    result.verificationToken
  );

  return NextResponse.json({
    ok: true,
    userId: result.userId,
    // In development there is no mail transport, so the link is returned for
    // the UI to display rather than pretending an email was sent.
    verificationUrl: delivery.deliveredBy === "none" ? delivery.url : undefined,
    deliveredBy: delivery.deliveredBy,
  });
}
