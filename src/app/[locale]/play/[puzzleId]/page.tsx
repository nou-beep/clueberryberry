import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getNextPuzzle, getPlayablePuzzle } from "@/lib/db/queries";
import { PlayScreen } from "@/components/game/PlayScreen";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ locale: string; puzzleId: string }>;
}) {
  const { locale, puzzleId } = await params;
  setRequestLocale(locale);

  const puzzle = await getPlayablePuzzle(puzzleId, locale);
  if (!puzzle || puzzle.status !== "published") notFound();

  const record = await prisma.puzzle.findUnique({
    where: { id: puzzle.id },
    select: { subjectId: true, topicId: true },
  });
  const nextPuzzle = record
    ? await getNextPuzzle(
        { ...record, slug: puzzle.slug, language: puzzle.language },
        locale
      )
    : null;

  const daily = await prisma.dailyPuzzle.findFirst({
    where: { puzzleId: puzzle.id },
    orderBy: { date: "desc" },
  });

  const userId = await currentUserId();

  return (
    <PlayScreen
      puzzle={puzzle}
      nextPuzzle={nextPuzzle}
      dailyDate={daily?.date}
      signedIn={userId !== null}
    />
  );
}
