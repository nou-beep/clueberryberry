import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentUserId } from "@/lib/auth";
import { listPublishedPuzzles } from "@/lib/db/queries";
import { sweepStaleRooms } from "@/lib/multiplayer/service";
import { realtimeConfigured } from "@/lib/multiplayer/config";
import {
  listFeaturedRooms,
  listLiveRoomCards,
  listMyPrivateRooms,
  type RoomCard as RoomCardData,
} from "@/lib/rooms/queries";
import { CreateRoomPanel } from "@/components/rooms/CreateRoomPanel";
import { JoinByCode } from "@/components/rooms/JoinByCode";
import { RealtimeNotConfigured } from "@/components/rooms/RealtimeNotConfigured";
import { RecentlyJoined } from "@/components/rooms/RecentlyJoined";
import { RoomCard } from "@/components/rooms/RoomCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return { title: t("title") };
}

function RoomGrid({ rooms }: { rooms: RoomCardData[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.code} className="min-w-0">
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Rooms — "who do I want to play with?".
 *
 * Sections appear in the order the IA sets and each one is omitted entirely
 * when it has no real rows. Two sections the IA lists are not rendered at all,
 * because nothing in the data model backs them yet: "Friends playing" (there
 * is no friend graph) and "Invitations" (an invite is a link, not something
 * addressed to a person). Inventing either would be a lie about what exists.
 */
export default async function RoomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // No room server on this deployment: say so once, and render nothing that
  // would need one.
  if (!realtimeConfigured()) return <RealtimeNotConfigured locale={locale} />;

  // Expired and long-ended rooms go away whenever anyone looks at the lobby.
  await sweepStaleRooms();

  const userId = await currentUserId();
  const [t, puzzles, live, featured, mine] = await Promise.all([
    getTranslations({ locale, namespace: "rooms" }),
    listPublishedPuzzles(locale),
    listLiveRoomCards(6, locale),
    listFeaturedRooms(3, locale),
    userId ? listMyPrivateRooms(userId, locale) : Promise.resolve([]),
  ]);

  // A room can be both live and featured; show it once, in the livelier place.
  const liveCodes = new Set(live.map((room) => room.code));
  const featuredOnly = featured.filter((room) => !liveCodes.has(room.code));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-ink-soft">{t("subtitle")}</p>
      </header>

      <JoinByCode />

      {live.length > 0 && (
        <section aria-labelledby="live-title">
          <h2 id="live-title" className="font-display mb-2 text-2xl">
            {t("liveNow")}
          </h2>
          <RoomGrid rooms={live} />
        </section>
      )}

      {featuredOnly.length > 0 && (
        <section aria-labelledby="featured-title">
          <h2 id="featured-title" className="font-display mb-2 text-2xl">
            {t("featuredRooms")}
          </h2>
          <RoomGrid rooms={featuredOnly} />
        </section>
      )}

      <section aria-labelledby="create-title">
        <h2 id="create-title" className="font-display mb-2 text-2xl">
          {t("createTitle")}
        </h2>
        <CreateRoomPanel puzzles={puzzles} signedIn={userId !== null} />
      </section>

      {mine.length > 0 && (
        <section aria-labelledby="private-title">
          <h2 id="private-title" className="font-display mb-2 text-2xl">
            {t("privateRooms")}
          </h2>
          <RoomGrid rooms={mine} />
        </section>
      )}

      <RecentlyJoined locale={locale} />
    </div>
  );
}
