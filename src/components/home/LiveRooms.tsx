import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHead } from "@/components/ui/bits";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { GlossyLink } from "@/components/ui/GlossyButton";
import { listLiveRooms } from "@/lib/rooms/live";

/**
 * "People are playing right now." Server-rendered from real rooms — when none
 * are live the whole section disappears rather than showing example rooms,
 * because a homepage that pretends to be busy is worse than a quiet one.
 */
export async function LiveRooms({ locale }: { locale: string }) {
  const [rooms, t, tLang] = await Promise.all([
    listLiveRooms(locale, 3),
    getTranslations("landing"),
    getTranslations("languages"),
  ]);

  if (rooms.length === 0) return null;

  return (
    <section aria-labelledby="live-rooms-title">
      <SectionHead
        id="live-rooms-title"
        action={
          <Link href="/rooms" className="label-caps text-pink-deep hover:underline">
            {t("browseRooms")} →
          </Link>
        }
      >
        {t("liveRooms")}
      </SectionHead>
      <ul className="grid gap-3 sm:grid-cols-3">
        {rooms.map((room) => (
          <li key={room.code}>
            <div
              data-subject={room.subjectTheme}
              className="flex h-full flex-col gap-2 rounded-card border-2 border-line bg-paper-bright p-3 shadow-card"
            >
              <div className="flex items-center gap-2">
                {/* A steady dot, not a pulsing one: presence, not an alarm. */}
                <span aria-hidden className="size-2.5 rounded-full border border-line bg-mint" />
                <span className="text-accent">
                  <SubjectMotif subject={room.subjectTheme} className="size-4" />
                </span>
                <span className="label-caps truncate text-ink-faint">{room.subjectName}</span>
              </div>
              <p className="font-display truncate text-base">{room.puzzleTitle}</p>
              <p className="label-caps text-ink-faint">
                {t("players", { count: room.players })} · {tLang(room.language)}
                {room.chatEnabled ? ` · ${t("chatOn")}` : ""}
                {room.voiceEnabled ? ` · ${t("voiceOn")}` : ""}
              </p>
              <div className="mt-auto pt-1">
                <GlossyLink
                  href={`/rooms/${room.code}`}
                  variant="quiet"
                  className="w-full justify-center"
                >
                  {t("join")}
                </GlossyLink>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
