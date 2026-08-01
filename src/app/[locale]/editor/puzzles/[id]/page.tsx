import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { exportPuzzleDef } from "@/lib/db/puzzle-io";
import { listSubjects, listTopics } from "@/lib/db/queries";
import { PuzzleEditor } from "@/components/editor/PuzzleEditor";
import { currentUserIsConstructor } from "@/lib/auth/constructors";
export const dynamic = "force-dynamic";
export default async function EditPuzzlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  if (!(await currentUserIsConstructor())) notFound();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [def, subjects, topics] = await Promise.all([
    exportPuzzleDef(id),
    listSubjects(locale),
    listTopics(locale),
  ]);
  if (!def) notFound();
  const subjectName = subjects.find((s) => s.slug === def.subject)?.name ?? def.subject;
  const topicName =
    topics.find((t) => t.slug === def.topic && t.subjectSlug === def.subject)?.name ??
    def.topic;
  return (
    <PuzzleEditor
      puzzleId={id}
      initial={def}
      subjects={subjects.map((s) => ({ slug: s.slug, name: s.name }))}
      topics={topics.map((t) => ({
        slug: t.slug,
        name: t.name,
        subjectSlug: t.subjectSlug,
      }))}
      subjectName={subjectName}
      topicName={topicName}
    />
  );
}