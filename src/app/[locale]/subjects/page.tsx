import { redirect } from "next/navigation";

/**
 * Browsing by subject is a section of the Puzzles hub, not a destination of its
 * own (docs/information-architecture.md). The old URL is kept so existing links
 * keep working. `/subjects/[subject]` is still a real page.
 */
export default async function SubjectsIndexRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/puzzles`);
}
