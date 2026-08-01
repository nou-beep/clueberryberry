import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db/prisma";
import { realtimeConfigured } from "@/lib/multiplayer/config";
import { RealtimeNotConfigured } from "@/components/rooms/RealtimeNotConfigured";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { Window } from "@/components/ui/Window";

export const dynamic = "force-dynamic";

/** An invite link: resolve it to the room, carrying the code through. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; invite: string }>;
}) {
  const { locale, invite: raw } = await params;
  setRequestLocale(locale);

  if (!realtimeConfigured()) return <RealtimeNotConfigured locale={locale} />;

  const code = raw.toUpperCase();
  const invite = await prisma.roomInvite.findUnique({
    where: { code },
    include: { room: { select: { code: true, endedAt: true, expiresAt: true } } },
  });
  const now = new Date();
  const usable =
    invite &&
    invite.usesRemaining > 0 &&
    invite.expiresAt.getTime() > now.getTime() &&
    invite.room.endedAt === null &&
    invite.room.expiresAt.getTime() > now.getTime();

  if (usable) {
    redirect({
      href: `/rooms/${invite.room.code}?invite=${encodeURIComponent(code)}`,
      locale,
    });
  }

  const t = await getTranslations({ locale, namespace: "rooms" });
  return (
    <div className="mx-auto max-w-md">
      <Window title={t("joinTitle")}>
        <div className="space-y-3 p-4">
          <p className="text-[15px] text-ink">{t("errors.bad_invite")}</p>
          <GlossyLink href="/rooms" variant="primary">
            {t("backToLobby")}
          </GlossyLink>
        </div>
      </Window>
    </div>
  );
}
