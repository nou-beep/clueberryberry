/**
 * Validate authored puzzle JSON files without touching the database.
 *
 *   npx tsx scripts/check-puzzles.ts [files-or-globs...]
 *
 * With no arguments, checks every file in src/content/puzzles/.
 * Exits non-zero if any file has structural or validation errors.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { authoredPuzzleSchema, numberAuthoredPuzzle } from "../src/lib/crossword/author";
import { validatePuzzle } from "../src/lib/crossword/validate";

const CONTENT_DIR = resolve(__dirname, "../src/content/puzzles");

const args = process.argv.slice(2);
const files =
  args.length > 0
    ? args.map((a) => resolve(a))
    : readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(CONTENT_DIR, f));

let failed = 0;

for (const file of files) {
  const rel = file.replace(`${process.cwd()}/`, "");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`✗ ${rel}: invalid JSON — ${(e as Error).message}`);
    failed++;
    continue;
  }
  const parsed = authoredPuzzleSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`✗ ${rel}: schema errors`);
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`    ${issue.path.join(".")}: ${issue.message}`);
    }
    failed++;
    continue;
  }
  try {
    const def = numberAuthoredPuzzle(parsed.data);
    const result = validatePuzzle(def);
    if (result.errors.length > 0) {
      console.error(`✗ ${rel}:`);
      for (const issue of result.errors) {
        console.error(`    [${issue.code}] ${issue.message}`);
      }
      failed++;
    } else {
      const warn = result.warnings.length
        ? ` (${result.warnings.length} warning${result.warnings.length > 1 ? "s" : ""}: ${result.warnings.map((w) => w.code).join(", ")})`
        : "";
      console.log(`✓ ${rel} — ${def.entries.length} entries${warn}`);
    }
  } catch (e) {
    console.error(`✗ ${rel}: ${(e as Error).message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} puzzle file(s) valid.`);
