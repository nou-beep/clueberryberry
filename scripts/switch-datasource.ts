/**
 * Switch the Prisma datasource between PostgreSQL and SQLite.
 *
 *   npm run db:postgres   # what production and Vercel use (the committed default)
 *   npm run db:sqlite     # a zero-setup local file database, for offline work
 *
 * Prisma will not read the provider from an environment variable, so the one
 * line has to be rewritten. This exists so nobody has to hand-edit the schema
 * and accidentally commit the wrong provider.
 *
 * The schema itself is provider-agnostic by design: enums are stored as
 * validated strings (`src/lib/db/enums.ts`) and JSON as serialized strings, so
 * the same models work on both.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROVIDERS = ["postgresql", "sqlite"] as const;
type Provider = (typeof PROVIDERS)[number];

const requested = process.argv[2];
if (!PROVIDERS.includes(requested as Provider)) {
  console.error(`Usage: tsx scripts/switch-datasource.ts <${PROVIDERS.join("|")}>`);
  process.exit(1);
}
const provider = requested as Provider;

const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const pattern = /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([a-z]+)(")/;
const match = schema.match(pattern);
if (!match) {
  console.error("Could not find the datasource provider in prisma/schema.prisma.");
  process.exit(1);
}

if (match[2] === provider) {
  console.log(`Already on ${provider}. Nothing to do.`);
  process.exit(0);
}

writeFileSync(schemaPath, schema.replace(pattern, `$1${provider}$3`));

console.log(`Datasource switched: ${match[2]} → ${provider}`);
console.log(
  provider === "sqlite"
    ? '\nNext:\n  1. Set DATABASE_URL="file:./dev.db" in .env\n  2. npm run db:push\n  3. npm run db:seed\n\nRemember to switch back with `npm run db:postgres` before committing.'
    : "\nNext:\n  1. Point DATABASE_URL at your Postgres database in .env\n  2. npm run db:push\n  3. npm run db:seed"
);
