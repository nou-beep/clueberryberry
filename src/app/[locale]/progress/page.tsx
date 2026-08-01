import { redirect } from "@/i18n/navigation";

/** The personal hub supersedes the old statistics page. */
export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: { pathname: "/profile", query: { tab: "journal" } }, locale });
}
