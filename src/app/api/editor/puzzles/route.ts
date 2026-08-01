import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireConstructor } from "@/lib/auth/constructors";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
  language: z.enum(["en", "fr", "ar"]),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  width: z.number().int().min(3).max(25),
  height: z.number().int().min(3).max(25),
  author: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.puzzle.findUnique({ where: { slug: input.slug } });
  if (existing) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  // A fresh draft starts with a single placeholder entry so the grid is valid;
  // the editor replaces it immediately.
  const subject = await prisma.subject.findUnique({ where: { slug: input.subject } });
  const topic = subject
    ? await prisma.topic.findFirst({
        where: { slug: input.topic, subjectId: subject.id },
      })
    : null;
  if (!subject || !topic) {
    return NextResponse.json({ error: "unknown_subject_or_topic" }, { status: 400 });
  }

  const puzzle = await prisma.puzzle.create({
    data: {
      slug: input.slug,
      title: input.title,
      language: input.language,
      subjectId: subject.id,
      topicId: topic.id,
      difficulty: input.difficulty,
      status: "draft",
      gridWidth: input.width,
      gridHeight: input.height,
      gridData: JSON.stringify(
        Array.from({ length: input.height }, () =>
          Array.from({ length: input.width }, () => null)
        )
      ),
      author: input.author,
    },
  });
  return NextResponse.json({ id: puzzle.id });
}

export type CreatePuzzleInput = z.infer<typeof createSchema>;
