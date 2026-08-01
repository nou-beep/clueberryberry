import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/account/service";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "verify", { max: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const result = await verifyEmailToken(body.token);
  if (result !== "ok") return NextResponse.json({ error: result }, { status: 400 });
  return NextResponse.json({ ok: true });
}
