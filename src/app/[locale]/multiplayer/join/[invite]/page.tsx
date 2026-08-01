import { redirect } from "@/i18n/navigation";

/** Renamed to /rooms/join/[invite]; invite links already sent keep working. */
export default async function LegacyInvitePage({
  params,
}: {
  params: Promise<{ locale: string; invite: string }>;
}) {
  const { locale, invite } = await params;
  redirect({ href: `/rooms/join/${invite}`, locale });
}
