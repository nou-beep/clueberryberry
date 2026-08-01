/**
 * Make a deployment set up its own database.
 *
 * Runs as part of `npm run build`, so a Vercel deploy creates its tables and
 * loads the library by itself. Without this, a green build and a completely
 * empty database look identical from outside — a site with no puzzles, and
 * sign-up failing because the tables do not exist — and the only cure is
 * remembering to run two commands from a laptop.
 *
 * Three cases, deliberately different:
 *
 *   No DATABASE_URL      Skip and let the build finish. The very first deploy
 *                        usually happens before the database is attached, and
 *                        failing there would be unhelpful. /api/health says
 *                        what is missing.
 *   Unreachable database Fail the build. Shipping a deploy that cannot serve a
 *                        single page is worse than not shipping it.
 *   Reachable            Push the schema and seed. Both are idempotent, so
 *                        every later deploy is a no-op that just confirms it.
 */
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL;

function run(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: "inherit", env: process.env });
}

if (!url) {
  console.log(
    "\n[deploy-setup] DATABASE_URL is not set — skipping database setup.\n" +
      "               The app will build, but every page that needs data will be empty\n" +
      "               until you add it. Check /api/health after deploying.\n"
  );
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//.test(url)) {
  // A SQLite file is a local convenience; on a serverless host it is a bug.
  console.log("\n[deploy-setup] DATABASE_URL is not PostgreSQL — skipping.\n");
  process.exit(0);
}

console.log("\n[deploy-setup] Creating tables if they are missing…");
try {
  run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
} catch {
  console.error(
    "\n[deploy-setup] Could not reach the database.\n" +
      "               Check DATABASE_URL — on Vercel it must be the POOLED\n" +
      "               connection string, and the database must not be paused.\n"
  );
  process.exit(1);
}

console.log("\n[deploy-setup] Loading subjects, collections and puzzles…");
try {
  run("npx", ["tsx", "prisma/seed.ts"]);
} catch {
  console.error("\n[deploy-setup] Seeding failed. The schema is in place but the library is empty.\n");
  process.exit(1);
}

console.log("\n[deploy-setup] Database ready.\n");
