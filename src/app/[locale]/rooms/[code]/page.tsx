import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getPlayablePuzzle } from "@/lib/db/queries";
import { isExpired, isRoomCode, normalizeRoomCode } from "@/lib/multiplayer/room";
import { realtimeConfigured } from "@/lib/multiplayer/config";
import { JoinGate } from "@/components/rooms/JoinGate";
import { RealtimeNotConfigured } from "@/components/rooms/RealtimeNotConfigured";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { Window } from "@/components/ui/Window";

export const dynamic = "force-dynamic";

interface PageParams {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<{ invite?: string }>;
}

export async function generateMetadata({ params }: PageParams) {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return { title: t("roomLabel", { code: normalizeRoomCode(code) }) };
}

export default async function RoomPage({ params, searchParams }: PageParams) {
  const { locale, code: rawCode } = await params;
  const { invite } = await searchParams;
  setRequestLocale(locale);

  // A stale room link on a deployment with no room server explains itself
  // rather than joining a seat that could never connect.
  if (!realtimeConfigured()) return <RealtimeNotConfigured locale={locale} />;

  const code = normalizeRoomCode(rawCode);
  if (!isRoomCode(code)) notFound();

  const room = await prisma.multiplayerRoom.findUnique({
    where: { code },
    select: {
      puzzleId: true,
      allowGuests: true,
      endedAt: true,
      expiresAt: true,
    },
  });
  if (!room) notFound();

  const t = await getTranslations({ locale, namespace: "rooms" });

  if (room.endedAt || isExpired(room.expiresAt, new Date())) {
    return (
      <div className="mx-auto max-w-md">
        <Window title={t("roomLabel", { code })}>
          <div className="space-y-3 p-4">
            <p className="text-[15px] text-ink">
              {room.endedAt ? t("closed.ended") : t("closed.expired")}
            </p>
            <GlossyLink href="/rooms" variant="primary">
              {t("backToLobby")}
            </GlossyLink>
          </div>
        </Window>
      </div>
    );
  }

  const puzzle = await getPlayablePuzzle(room.puzzleId, locale);
  if (!puzzle) notFound();

  const userId = await currentUserId();

  return (
    <JoinGate
      puzzle={puzzle}
      code={code}
      signedIn={userId !== null}
      allowGuests={room.allowGuests}
      invite={invite ?? null}
      locale={locale}
    />
  );
}
