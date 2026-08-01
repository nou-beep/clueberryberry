import { redirect } from "@/i18n/navigation";

/** Renamed to /rooms/[code]; shared room links keep working. */
export default async function LegacyRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { locale, code } = await params;
  const { invite } = await searchParams;
  redirect({
    href: `/rooms/${code}${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`,
    locale,
  });
}
