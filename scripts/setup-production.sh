#!/usr/bin/env bash
#
# Point a fresh production database at this codebase: create the tables, load
# the library, and report what landed.
#
# A Vercel deploy does none of this. The build never connects to the database,
# so a green build and a completely empty database look identical from the
# outside — no puzzles, and sign-up failing because the tables do not exist.
#
# Usage, after `npx vercel login` and `npx vercel link`:
#
#     ./scripts/setup-production.sh
#
# The connection string is pulled into a git-ignored file, used, and deleted.
# It is never printed.

set -euo pipefail

ENV_FILE=".env.vercel.tmp"
cleanup() { rm -f "$ENV_FILE"; }
trap cleanup EXIT

echo "==> Pulling production environment from Vercel"
npx --yes vercel env pull "$ENV_FILE" --environment=production >/dev/null

if ! grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  echo
  echo "DATABASE_URL is not set on the production environment."
  echo "Add it in Vercel (Settings -> Environment Variables), then run this again."
  echo "Need a database? https://neon.tech -> new project -> the POOLED string."
  exit 1
fi

# Read it into a variable without echoing it anywhere.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo
    echo "DATABASE_URL is not a PostgreSQL URL. Vercel cannot use a SQLite file."
    exit 1
    ;;
esac

echo "==> Making sure the schema is on the Postgres provider"
npm run --silent db:postgres >/dev/null 2>&1 || true

echo "==> Creating tables"
npx --yes prisma db push --skip-generate

echo "==> Loading subjects, collections and puzzles"
npm run --silent db:seed

echo
echo "==> Done. Checking what is actually in there:"
npx --yes tsx --eval '
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const [puzzles, subjects, topics] = await Promise.all([
  db.puzzle.count({ where: { status: "published" } }),
  db.subject.count(),
  db.topic.count(),
]);
const byLanguage = await db.puzzle.groupBy({
  by: ["language"],
  where: { status: "published" },
  _count: true,
});
console.log(`    ${puzzles} published puzzles, ${subjects} subjects, ${topics} collections`);
for (const row of byLanguage) console.log(`      ${row.language}: ${row._count}`);
await db.$disconnect();
'

echo
echo "Reload the site. /api/health should now report healthy."
