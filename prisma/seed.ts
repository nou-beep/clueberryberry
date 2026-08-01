/**
 * Seed: subjects, topics, achievements, authored puzzles, and daily slots.
 * Puzzles are loaded from src/content/puzzles/*.json, auto-numbered, and
 * validated — the seed fails loudly on any invalid puzzle.
 *
 *   npm run db:seed
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  authoredPuzzleSchema,
  numberAuthoredPuzzle,
} from "../src/lib/crossword/author";
import { validatePuzzle } from "../src/lib/crossword/validate";
import { answerToCells } from "../src/lib/crossword/normalize";
import { toDateString, addDays } from "../src/lib/crossword/streak";
import {
  TAXONOMY,
  assertTaxonomyIsSound,
  totalCollections,
} from "../src/content/taxonomy/index";

const prisma = new PrismaClient();

const L = (en: string, fr: string, ar: string) => JSON.stringify({ en, fr, ar });

const ACHIEVEMENTS = [
  { slug: "first-solve", criteria: { type: "solve_count", count: 1 } },
  { slug: "no-hints", criteria: { type: "no_hints" } },
  { slug: "five-biology", criteria: { type: "subject_count", subject: "biology", count: 5 } },
  { slug: "trilingual-topic", criteria: { type: "topic_languages", count: 3 } },
  { slug: "hard-solve", criteria: { type: "difficulty", difficulty: "hard" } },
  { slug: "seven-dailies", criteria: { type: "daily_count", count: 7 } },
  { slug: "clean-solve", criteria: { type: "no_mistakes" } },
];

// Achievement titles come from the localization files at render time; the DB
// stores the same strings for API consumers.
const ACHIEVEMENT_TEXTS: Record<string, { titles: string; descriptions: string }> = {
  "first-solve": {
    titles: L("First ink", "Première encre", "أول حبر"),
    descriptions: L(
      "Complete your first crossword.",
      "Terminez votre première grille.",
      "أكمل شبكتك الأولى."
    ),
  },
  "no-hints": {
    titles: L("Unassisted", "Sans filet", "بلا عون"),
    descriptions: L(
      "Complete a crossword without hints.",
      "Terminez une grille sans aucune aide.",
      "أكمل شبكة دون أي مساعدة."
    ),
  },
  "five-biology": {
    titles: L("Field naturalist", "Naturaliste de terrain", "عالم ميداني"),
    descriptions: L(
      "Complete five biology puzzles.",
      "Terminez cinq grilles de biologie.",
      "أكمل خمس شبكات في الأحياء."
    ),
  },
  "trilingual-topic": {
    titles: L("Trilingual", "Trilingue", "ثلاثي اللغات"),
    descriptions: L(
      "Complete one topic in all three languages.",
      "Terminez un thème dans les trois langues.",
      "أكمل موضوعًا واحدًا بثلاث لغات."
    ),
  },
  "hard-solve": {
    titles: L("Deep water", "Eaux profondes", "مياه عميقة"),
    descriptions: L(
      "Complete a hard puzzle.",
      "Terminez une grille difficile.",
      "أكمل شبكة صعبة."
    ),
  },
  "seven-dailies": {
    titles: L("Regular reader", "Lecteur fidèle", "قارئ منتظم"),
    descriptions: L(
      "Complete seven daily puzzles.",
      "Terminez sept grilles du jour.",
      "أكمل سبع شبكات يومية."
    ),
  },
  "clean-solve": {
    titles: L("Clean copy", "Copie propre", "نسخة نظيفة"),
    descriptions: L(
      "Finish a puzzle with no mistakes.",
      "Terminez une grille sans erreur.",
      "أنهِ شبكة دون أخطاء."
    ),
  },
};

async function main() {
  // Subjects and collections come from the taxonomy data files, never from
  // hardcoded lists in the application. Bad data fails here, not at runtime.
  assertTaxonomyIsSound();

  for (const [index, subject] of TAXONOMY.entries()) {
    const data = {
      names: L(subject.names.en, subject.names.fr, subject.names.ar),
      descriptions: L(
        subject.descriptions.en,
        subject.descriptions.fr,
        subject.descriptions.ar
      ),
      section: subject.section,
      theme: subject.theme,
      tone: subject.tone ?? "playful",
      order: index + 1,
      status: "active",
    };
    const record = await prisma.subject.upsert({
      where: { slug: subject.slug },
      create: { slug: subject.slug, ...data },
      update: data,
    });

    for (const [collectionIndex, collection] of subject.collections.entries()) {
      const collectionData = {
        names: L(collection.names.en, collection.names.fr, collection.names.ar),
        descriptions: collection.descriptions
          ? L(
              collection.descriptions.en,
              collection.descriptions.fr,
              collection.descriptions.ar
            )
          : "{}",
        tone: collection.tone ?? null,
        order: collectionIndex + 1,
        status: "active",
      };
      await prisma.topic.upsert({
        where: { slug: collection.slug },
        create: { subjectId: record.id, slug: collection.slug, ...collectionData },
        // subjectId is included so moving a collection between subjects in the
        // taxonomy re-parents the existing row instead of failing.
        update: { subjectId: record.id, ...collectionData },
      });
    }
  }
  console.log(
    `\u2713 ${TAXONOMY.length} subjects, ${totalCollections()} collections`
  );

  for (const a of ACHIEVEMENTS) {
    const texts = ACHIEVEMENT_TEXTS[a.slug];
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        titles: texts.titles,
        descriptions: texts.descriptions,
        criteria: JSON.stringify(a.criteria),
      },
      update: {
        titles: texts.titles,
        descriptions: texts.descriptions,
        criteria: JSON.stringify(a.criteria),
      },
    });
  }

  // Puzzles from authored JSON
  const dir = resolve(__dirname, "../src/content/puzzles");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let failures = 0;
  for (const file of files.sort()) {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown;
    const authored = authoredPuzzleSchema.parse(raw);
    const def = numberAuthoredPuzzle(authored);
    const result = validatePuzzle(def);
    if (!result.valid) {
      failures++;
      console.error(`✗ ${file}`);
      for (const issue of result.errors) console.error(`   [${issue.code}] ${issue.message}`);
      continue;
    }

    const subject = await prisma.subject.findUniqueOrThrow({
      where: { slug: def.subject },
    });
    const topic = await prisma.topic.findFirstOrThrow({
      where: { slug: def.topic, subjectId: subject.id },
    });

    const entryRows = def.entries.map((e) => ({
      number: e.number,
      direction: e.direction,
      row: e.row,
      column: e.column,
      length: answerToCells(e.answer, def.language, def.normalization).length,
      answer: e.answer,
      normalizedAnswer: answerToCells(e.answer, def.language, def.normalization).join(""),
      acceptedAlternatives: JSON.stringify(e.acceptedAlternatives ?? []),
      clue: e.clue,
      clueStyle: e.clueStyle,
      explanation: e.explanation ?? null,
      sourceNotes: e.sourceNotes ?? null,
      difficultyRating: e.difficultyRating ?? null,
      isThemeEntry: e.isThemeEntry ?? false,
    }));
    const factRows = (def.factCards ?? []).map((f, i) => ({
      text: f.text,
      sourceTitle: f.sourceTitle ?? null,
      sourceUrl: f.sourceUrl ?? null,
      reviewStatus: f.reviewStatus ?? "needs_review",
      order: i,
    }));
    const data = {
      slug: def.slug,
      title: def.title,
      language: def.language,
      subjectId: subject.id,
      topicId: topic.id,
      difficulty: def.difficulty,
      status: def.status ?? "published",
      origin: authored.origin,
      featured: authored.featured,
      season: authored.season ?? null,
      gridWidth: def.width,
      gridHeight: def.height,
      gridData: JSON.stringify(result.grid),
      author: def.author,
      editor: def.editor ?? null,
      estimatedSolveTime: def.estimatedSolveTime ?? null,
      introduction: def.introduction ?? null,
      completionMessage: def.completionMessage ?? null,
      symmetry: def.symmetry ?? false,
      normalization: def.normalization ? JSON.stringify(def.normalization) : null,
      publicationDate: new Date(),
    };

    const existing = await prisma.puzzle.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.$transaction([
        prisma.entry.deleteMany({ where: { puzzleId: existing.id } }),
        prisma.factCard.deleteMany({ where: { puzzleId: existing.id } }),
        prisma.puzzle.update({
          where: { id: existing.id },
          data: { ...data, entries: { create: entryRows }, factCards: { create: factRows } },
        }),
      ]);
    } else {
      await prisma.puzzle.create({
        data: { ...data, entries: { create: entryRows }, factCards: { create: factRows } },
      });
    }
    console.log(`✓ ${file} → ${def.slug} (${def.language}, ${def.entries.length} entries)`);
  }
  if (failures > 0) {
    throw new Error(`${failures} puzzle file(s) failed validation — seed aborted.`);
  }

  // Daily slots: today and the previous 6 days, cycling per language.
  const today = toDateString(new Date());
  for (const language of ["en", "fr", "ar"] as const) {
    const puzzles = await prisma.puzzle.findMany({
      where: { language, status: "published" },
      orderBy: { slug: "asc" },
    });
    if (puzzles.length === 0) continue;
    for (let back = 6; back >= 0; back--) {
      const date = addDays(today, -back);
      const puzzle = puzzles[(puzzles.length + back) % puzzles.length];
      await prisma.dailyPuzzle.upsert({
        where: { date_language: { date, language } },
        create: { date, language, puzzleId: puzzle.id },
        update: { puzzleId: puzzle.id },
      });
    }
  }
  console.log("✓ daily slots for the last 7 days");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
