import { redirect } from "next/navigation";

/**
 * The daily archive is a shelf inside the Puzzles hub
 * (docs/information-architecture.md). `/daily/[date]` remains the detail route.
 */
export default async function ArchiveRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/puzzles`);
}
