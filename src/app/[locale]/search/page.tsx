import { redirect } from "next/navigation";

/**
 * Search is a global overlay reachable from every screen, not a page
 * (docs/information-architecture.md). The old route keeps working by sending
 * people to the Puzzles hub, carrying any query through as a filter hint.
 */
export default async function SearchPageRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  redirect(q ? `/${locale}/puzzles?q=${encodeURIComponent(q)}` : `/${locale}/puzzles`);
}
