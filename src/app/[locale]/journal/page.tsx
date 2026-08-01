import { redirect } from "@/i18n/navigation";

/**
 * The Journal is a section of the personal hub now
 * (docs/information-architecture.md). The old URL is kept and redirected so
 * links people already have keep working.
 */
export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: { pathname: "/profile", query: { tab: "journal" } }, locale });
}
