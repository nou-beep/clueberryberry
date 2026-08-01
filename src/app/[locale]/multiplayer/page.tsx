import { redirect } from "@/i18n/navigation";

/** Renamed to /rooms by docs/information-architecture.md. Links still work. */
export default async function LegacyMultiplayerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/rooms", locale });
}
