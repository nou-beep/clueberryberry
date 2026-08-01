import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * A flat index of published puzzles. Used by Pip to recommend something the
 * player hasn't finished — the "not finished" part is computed in the browser
 * from local progress, so this endpoint stays cacheable and anonymous.
 */
export async function GET(request: Request) {
  const language = new URL(request.url).searchParams.get("language");
  const puzzles = await prisma.puzzle.findMany({
    where: {
      status: "published",
      ...(language && ["en", "fr", "ar"].includes(language) ? { language } : {}),
    },
    select: {
      slug: true,
      title: true,
      language: true,
      difficulty: true,
      subject: { select: { slug: true } },
      topic: { select: { slug: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { slug: "asc" },
  });

  return NextResponse.json({
    puzzles: puzzles.map((p) => ({
      slug: p.slug,
      title: p.title,
      language: p.language,
      difficulty: p.difficulty,
      subject: p.subject.slug,
      topic: p.topic.slug,
      entryCount: p._count.entries,
    })),
  });
}
