import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/site";

/**
 * Is this deployment actually working?
 *
 * A successful build proves almost nothing here: every page that reads data is
 * dynamic, so nothing connects to the database until a real request arrives.
 * The first sign of a missing `DATABASE_URL`, an unmigrated database or an
 * unseeded one is therefore a broken page, which is a terrible way to find out.
 *
 * This endpoint says which of those it is, in plain words. It reports only
 * counts and a coarse error kind — never the connection string, never a
 * driver message that might carry credentials.
 */
export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail: string };

function classify(error: unknown): Check {
  const message = error instanceof Error ? error.message : String(error);

  if (/Environment variable not found: DATABASE_URL/i.test(message)) {
    return {
      ok: false,
      detail:
        "DATABASE_URL is not set on this deployment. Add it in Vercel under Settings → Environment Variables, then redeploy.",
    };
  }
  if (/does not exist in the current database|relation .* does not exist|no such table/i.test(message)) {
    return {
      ok: false,
      detail:
        "Connected, but the tables are missing. Run `npm run db:push` against this database.",
    };
  }
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return {
      ok: false,
      detail:
        "Cannot reach the database server. Check the host and port, and that the database is not paused.",
    };
  }
  if (/Authentication failed|password authentication failed/i.test(message)) {
    return { ok: false, detail: "The database rejected the credentials in DATABASE_URL." };
  }
  if (/too many connections/i.test(message)) {
    return {
      ok: false,
      detail:
        "Too many connections — DATABASE_URL is probably the direct string. Use the pooled one.",
    };
  }
  return { ok: false, detail: "The database query failed for an unrecognised reason." };
}

export async function GET() {
  const checks: Record<string, Check> = {};

  checks.authSecret = process.env.AUTH_SECRET
    ? { ok: true, detail: "set" }
    : { ok: false, detail: "AUTH_SECRET is not set — sign-in and sign-up cannot work." };

  // Not required on Vercel: `siteUrl` falls back to the deployment URL, and
  // Auth.js infers its own host. Worth setting for a custom domain, but a
  // missing value is not a fault, so this never reports one.
  checks.appUrl = { ok: true, detail: siteUrl };

  let puzzles = 0;
  let subjects = 0;

  try {
    [puzzles, subjects] = await Promise.all([
      prisma.puzzle.count({ where: { status: "published" } }),
      prisma.subject.count(),
    ]);
    checks.database = { ok: true, detail: "connected" };
    checks.content =
      puzzles > 0
        ? { ok: true, detail: `${puzzles} published puzzles, ${subjects} subjects` }
        : {
            ok: false,
            detail:
              "Connected and migrated, but empty. Run `npm run db:seed` against this database.",
          };
  } catch (error) {
    checks.database = classify(error);
    checks.content = { ok: false, detail: "not checked — the database is unavailable" };
  }

  const healthy = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      healthy,
      checks,
      counts: { publishedPuzzles: puzzles, subjects },
      nextStep: healthy
        ? "Everything this endpoint can check is in order."
        : Object.values(checks).find((check) => !check.ok)?.detail,
    },
    { status: healthy ? 200 : 503 }
  );
}
