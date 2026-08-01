import { redirect } from "@/i18n/navigation";

/**
 * Settings is a section of the personal hub, not a destination of its own
 * (docs/information-architecture.md). The old URL is kept and redirected so
 * links people already have keep working.
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: { pathname: "/profile", query: { tab: "settings" } }, locale });
}
