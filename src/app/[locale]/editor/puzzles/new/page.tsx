import { setRequestLocale } from "next-intl/server";
import { listSubjects, listTopics } from "@/lib/db/queries";
import { NewPuzzleForm } from "@/components/editor/NewPuzzleForm";
import { notFound } from "next/navigation";
import { currentUserIsConstructor } from "@/lib/auth/constructors";
export const dynamic = "force-dynamic";
export default async function NewPuzzlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!(await currentUserIsConstructor())) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const [subjects, topics] = await Promise.all([
    listSubjects(locale),
    listTopics(locale),
  ]);
  return (
    <NewPuzzleForm
      subjects={subjects.map((s) => ({ slug: s.slug, name: s.name }))}
      topics={topics.map((t) => ({
        slug: t.slug,
        name: t.name,
        subjectSlug: t.subjectSlug,
      }))}
    />
  );
}