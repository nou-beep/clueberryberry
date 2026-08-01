"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  collectStickers,
  computeStats,
  loadAttempts,
  type LocalAttempt,
  type ProgressStats,
} from "@/lib/progress/local";
import { fetchAccountProgress } from "@/lib/progress/sync";
import { toDateString } from "@/lib/crossword/streak";
import { formatTime } from "@/lib/crossword/share";
import { Window } from "@/components/ui/Window";
import { GlossyButton, GlossyLink } from "@/components/ui/GlossyButton";
import { StickerLabel, TapeStrip } from "@/components/ui/bits";
import { Sticker, stickerForSlug, type StickerSlug } from "@/components/ui/Sticker";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { Avatar } from "@/components/ui/Avatar";
import { IconBunnyHead, IconCheck, IconClock, IconJournal } from "@/components/ui/Icons";
import { ProfileEditor } from "@/components/account/ProfileEditor";
import { publishIdentity } from "@/components/account/AccountMenu";
import type {
  AccountProfile,
  AccountStats,
  ActivityRow,
  ContinueRow,
  CreationRow,
  TaxonomyOption,
} from "@/components/account/types";

interface Props {
  /** Null for a visitor who is not signed in — the guest desk still works. */
  account: {
    profile: AccountProfile;
    stats: AccountStats;
    activity: ActivityRow[];
    continuePlaying: ContinueRow[];
    creations: CreationRow[];
    /** Real signal, not a role guess: they have authored something, or are
     * named in the editor allowlist. */
    isConstructor: boolean;
  } | null;
  subjects: TaxonomyOption[];
  collections: TaxonomyOption[];
  subjectNames: Record<string, string>;
  topicNames: Record<string, string>;
}

interface DeskData {
  stats: ProgressStats;
  firstPlayed: string | null;
  /** The four most-earned stickers, with their counts. */
  favorites: Array<{ slug: StickerSlug; count: number }>;
  languages: Array<"en" | "fr" | "ar">;
  collections: Array<{ topicSlug: string; subjectSlug: string }>;
  /** Attempts still open, newest first — the hub's primary action. */
  inProgress: LocalAttempt[];
}

const LANGS = ["en", "fr", "ar"] as const;

function read(
  attempts: Record<string, LocalAttempt> = loadAttempts(),
  serverStickerCounts: Record<string, number> | null = null
): DeskData {
  const stats = computeStats(attempts, toDateString(new Date()));
  const counts = serverStickerCounts ?? collectStickers(attempts, stickerForSlug).counts;
  const dates = Object.values(attempts)
    .map((a) => a.startedAt)
    .sort();
  const done: LocalAttempt[] = Object.values(attempts)
    .filter((a) => a.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const collections: DeskData["collections"] = [];
  for (const a of done) {
    if (!collections.some((c) => c.topicSlug === a.topicSlug)) {
      collections.push({ topicSlug: a.topicSlug, subjectSlug: a.subjectSlug });
    }
  }

  return {
    stats,
    firstPlayed: dates[0] ?? null,
    favorites: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([slug, count]) => ({ slug: slug as StickerSlug, count })),
    languages: LANGS.filter((l) => (stats.byLanguage[l]?.solved ?? 0) > 0),
    collections: collections.slice(0, 6),
    inProgress: Object.values(attempts)
      .filter((a) => a.status === "in_progress")
      .sort((a, b) => (b.updatedAt ?? b.startedAt).localeCompare(a.updatedAt ?? a.startedAt))
      .slice(0, 3),
  };
}

/** One number on the desk, in the stationery voice. */
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border-2 border-line-soft bg-paper p-3 text-center">
      <span className="font-display block text-2xl leading-none text-ink">{value}</span>
      <span className="label-caps mt-1 block text-ink-faint">{label}</span>
    </div>
  );
}

/**
 * The profile as a bedroom desk. Signed out it stays the honest local-mode
 * card; signed in it is the same desk, editable, showing the counts the server
 * keeps rather than anything guessed in the browser.
 */
export function ProfileClient({
  account,
  subjects,
  collections,
  subjectNames,
  topicNames,
}: Props) {
  const t = useTranslations("profile");
  const tAccount = useTranslations("account");
  const tJournal = useTranslations("journal");
  const tStickers = useTranslations("stickers");
  const tLang = useTranslations("languages");
  const tResults = useTranslations("results");
  const locale = useLocale();

  const [data, setData] = useState<DeskData | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(account?.profile ?? null);
  const [editing, setEditing] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [mergeResult, setMergeResult] = useState<number | null>(null);

  useEffect(() => {
    setData(read());
  }, []);

  /*
   * Signed in: migrate whatever this browser still holds into the account,
   * then show the account. The merge is idempotent — it reconciles rather than
   * overwrites — so running it on every visit is safe.
   */
  const signedIn = account !== null;
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const local = Object.values(loadAttempts());

    const migrate = async () => {
      if (local.length === 0) return;
      try {
        const res = await fetch("/api/attempts/merge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ attempts: local }),
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { merged?: number };
        if (typeof body.merged === "number") setMergeResult(body.merged);
      } catch {
        // Offline: the local view below is still true, so say nothing.
      }
    };

    void migrate().then(async () => {
      const progress = await fetchAccountProgress();
      if (cancelled || !progress) return;
      setData(read(progress.attempts, progress.stickerCounts));
    });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  // Signed in the open attempts come from the account; as a guest, from this
  // browser. Either way they are real attempts, never placeholders.
  const continueRows: ContinueRow[] = account
    ? account.continuePlaying
    : (data?.inProgress ?? []).map((a) => ({
        puzzleId: a.puzzleId,
        slug: a.slug,
        title: a.title,
        subjectSlug: a.subjectSlug,
        completionPercentage: a.completionPercentage,
        elapsedSeconds: a.elapsedSeconds,
      }));
  const hasContinue = continueRows.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display mt-2 text-4xl">{t("title")}</h1>

      {/* Continue playing — the one primary action on this screen. */}
      {hasContinue && (
        <Window title={t("continuePlaying")} icon={<IconClock className="size-5" />}>
          <ul className="divide-y-2 divide-line-soft">
            {continueRows.map((row, index) => (
              <li
                key={row.puzzleId}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-[17px]">{row.title}</span>
                  <span className="label-caps block text-ink-faint">
                    {subjectNames[row.subjectSlug] ?? row.subjectSlug}
                    {" · "}
                    {t("percentDone", { percent: row.completionPercentage })}
                    {" · "}
                    <span className="font-mono tabular-nums">
                      {formatTime(row.elapsedSeconds)}
                    </span>
                  </span>
                </span>
                <GlossyLink
                  href={`/play/${row.slug}`}
                  variant={index === 0 ? "primary" : "secondary"}
                  size={index === 0 ? "md" : "sm"}
                >
                  {t("resume")}
                </GlossyLink>
              </li>
            ))}
          </ul>
        </Window>
      )}

      {/* Name plate */}
      {profile && account ? (
        <Window
          title={profile.displayName}
          icon={<IconBunnyHead className="size-5" />}
          action={
            editing ? undefined : (
              <GlossyButton size="sm" onClick={() => setEditing(true)}>
                {t("edit")}
              </GlossyButton>
            )
          }
        >
          {editing ? (
            <ProfileEditor
              profile={profile}
              subjects={subjects}
              collections={collections}
              onCancel={() => setEditing(false)}
              onSaved={(next) => {
                setProfile(next);
                setEditing(false);
                setSavedNote(true);
                publishIdentity({
                  displayName: next.displayName,
                  username: next.username,
                  avatarKind: next.avatarKind,
                  avatarSeed: next.avatarSeed,
                });
              }}
            />
          ) : (
            <div className="relative p-4">
              <TapeStrip className="-top-3 end-10" rotate={3} />
              <div className="flex flex-wrap items-start gap-4">
                <Avatar kind={profile.avatarKind} seed={profile.avatarSeed} size={72} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl leading-tight text-ink">
                    {profile.displayName}
                  </p>
                  <p dir="ltr" className="font-mono text-[13px] text-ink-soft">
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="mt-2 text-sm leading-relaxed text-ink">{profile.bio}</p>
                  )}
                  <p className="label-caps mt-2 text-ink-faint">
                    {t("joined", { date: dateFormat.format(new Date(profile.joinedAt)) })}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
                    <span dir="ltr">{profile.email}</span>
                    <StickerLabel tone={profile.emailVerified ? "mint" : "butter"}>
                      {profile.emailVerified
                        ? `✓ ${tAccount("emailVerified")}`
                        : tAccount("emailUnverified")}
                    </StickerLabel>
                  </p>
                </div>
              </div>

              {savedNote && (
                <p
                  aria-live="polite"
                  className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-correct"
                >
                  <IconCheck className="size-4" />
                  {t("saved")}
                </p>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                {mergeResult !== null && mergeResult > 0 && (
                  <IconCheck className="size-4 shrink-0 text-correct" />
                )}
                {t("progressSynced")}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <GlossyLink href="/profile?tab=journal">
                  <IconJournal className="size-4" />
                  {tJournal("title")}
                </GlossyLink>
                <GlossyButton
                  variant="quiet"
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                >
                  {tAccount("signOut")}
                </GlossyButton>
              </div>
            </div>
          )}
        </Window>
      ) : (
        <Window title={t("guest")} icon={<IconBunnyHead className="size-5" />}>
          <div className="relative p-4">
            <TapeStrip className="-top-3 end-10" rotate={3} />
            {data?.firstPlayed && (
              <p className="label-caps text-ink-faint">
                {t("memberSince", { date: dateFormat.format(new Date(data.firstPlayed)) })}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("guestNote")}</p>
            <p className="mt-2 text-sm text-ink-soft">{t("progressLocal")}</p>
            <p className="mt-2 text-sm text-ink-soft">{tAccount("mergeNote")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <GlossyLink
                href="/account/register"
                variant={hasContinue ? "secondary" : "primary"}
              >
                {tAccount("submitRegister")}
              </GlossyLink>
              <GlossyLink href="/account/sign-in">{tAccount("submitSignIn")}</GlossyLink>
              <GlossyLink href="/profile?tab=journal" variant="quiet">
                <IconJournal className="size-4" />
                {tJournal("title")}
              </GlossyLink>
            </div>
          </div>
        </Window>
      )}

      {/* Counts the server keeps */}
      {account && (
        <Window title={t("statsTitle")} static>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            <Stat label={t("statCurrentStreak")} value={account.profile.currentStreak} />
            <Stat label={t("statLongestStreak")} value={account.profile.longestStreak} />
            <Stat label={t("statCompleted")} value={account.stats.completed} />
            <Stat label={t("statInProgress")} value={account.stats.inProgress} />
            <Stat label={t("statStickers")} value={account.stats.stickers} />
            <Stat label={t("statDistinctStickers")} value={account.stats.distinctStickers} />
          </div>
        </Window>
      )}

      {/* Favourites and multiplayer identity */}
      {profile && (
        <Window title={t("favourites")} static>
          <div className="space-y-3 p-4">
            <div>
              <p className="label-caps mb-1.5 text-ink-faint">{tAccount("favoriteSubjects")}</p>
              {profile.favoriteSubjects.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {profile.favoriteSubjects.map((slug) => (
                    <li key={slug}>
                      <StickerLabel tone="peach">{subjectNames[slug] ?? slug}</StickerLabel>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">{t("noFavourites")}</p>
              )}
            </div>
            <div>
              <p className="label-caps mb-1.5 text-ink-faint">
                {tAccount("favoriteCollections")}
              </p>
              {profile.favoriteCollections.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {profile.favoriteCollections.map((slug) => (
                    <li key={slug}>
                      <StickerLabel tone="sky">{topicNames[slug] ?? slug}</StickerLabel>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">{t("noFavourites")}</p>
              )}
            </div>
            <p className="text-sm text-ink-soft">
              {profile.multiplayerName
                ? t("multiplayerAs", { name: profile.multiplayerName })
                : t("multiplayerUnset")}
              {" · "}
              {profile.showPresence ? t("presenceOn") : t("presenceOff")}
            </p>
          </div>
        </Window>
      )}

      {/* Things this player made. Rendered only when there are any. */}
      {account && account.creations.length > 0 && (
        <Window title={t("createdPuzzles")} static>
          <ul className="divide-y-2 divide-line-soft">
            {account.creations.map((creation) => (
              <li
                key={creation.id}
                className="flex flex-wrap items-center gap-2 px-4 py-2.5"
              >
                <span className="font-display min-w-0 flex-1 truncate">{creation.title}</span>
                <StickerLabel tone="lavender">
                  {creation.visibility === "public"
                    ? t("visibilityPublic")
                    : creation.visibility === "link"
                      ? t("visibilityLink")
                      : t("visibilityPrivate")}
                </StickerLabel>
              </li>
            ))}
          </ul>
          <div className="p-4 pt-3">
            <GlossyLink href="/playground">{t("openPlayground")}</GlossyLink>
          </div>
        </Window>
      )}

      {/* The constructor desk, for people who actually construct. */}
      {account?.isConstructor && (
        <Window title={t("creatorDashboard")} static>
          <div className="p-4">
            <p className="text-sm text-ink-soft">{t("creatorDashboardNote")}</p>
            <div className="mt-3">
              <GlossyLink href="/editor/puzzles">{t("openEditor")}</GlossyLink>
            </div>
          </div>
        </Window>
      )}

      {/* Recent activity from the account */}
      {account && account.activity.length > 0 && (
        <Window title={t("recentActivity")} static>
          <ul className="divide-y-2 divide-line-soft">
            {account.activity.map((row) => (
              <li key={row.puzzleId}>
                <Link
                  href={`/play/${row.slug}`}
                  className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-paper-sunken"
                >
                  <span
                    className={`shrink-0 ${
                      row.status === "completed" ? "text-correct" : "text-ink-faint"
                    }`}
                  >
                    {row.status === "completed" ? (
                      <IconCheck className="size-5" />
                    ) : (
                      <IconClock className="size-5" />
                    )}
                    <span className="sr-only">
                      {row.status === "completed"
                        ? tResults("completedStamp")
                        : t("statInProgress")}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate">{row.title}</span>
                    <span className="label-caps block text-ink-faint">
                      {subjectNames[row.subjectSlug] ?? row.subjectSlug}
                      {" · "}
                      <span className="font-mono tabular-nums">
                        {formatTime(row.elapsedSeconds)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Window>
      )}

      {/* Favourite stickers */}
      <Window title={t("favoriteStickers")} static>
        <div className="p-4">
          {data && data.favorites.length > 0 ? (
            <ul className="flex flex-wrap gap-4">
              {data.favorites.map(({ slug, count }) => (
                <li key={slug} className="flex w-20 flex-col items-center gap-1 text-center">
                  <Sticker slug={slug} size={60} title={tStickers(slug)} />
                  <span className="text-[12px] leading-tight text-ink">{tStickers(slug)}</span>
                  {count > 1 && (
                    <span className="label-caps text-ink-faint">
                      {tJournal("duplicates", { count })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">{tJournal("noStickers")}</p>
          )}
        </div>
      </Window>

      {/* Language badges */}
      {data && data.languages.length > 0 && (
        <Window title={t("languageBadges")} static>
          <ul className="flex flex-wrap gap-3 p-4">
            {data.languages.map((l) => (
              <li key={l}>
                <StickerLabel tone={l === "en" ? "sky" : l === "fr" ? "pink" : "mint"}>
                  {tLang(l)} · {data.stats.byLanguage[l]?.solved ?? 0}
                </StickerLabel>
              </li>
            ))}
          </ul>
        </Window>
      )}

      {/* Recently solved */}
      {data && data.stats.recent.length > 0 && (
        <Window title={t("recentPuzzles")} static>
          <ul className="divide-y-2 divide-line-soft">
            {data.stats.recent.map((a) => (
              <li key={a.puzzleId}>
                <Link
                  href={`/play/${a.slug}`}
                  className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-paper-sunken"
                >
                  <span className="shrink-0 text-correct">
                    <IconCheck className="size-5" />
                    <span className="sr-only">{tResults("completedStamp")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate">{a.title}</span>
                    <span className="label-caps block text-ink-faint">
                      {subjectNames[a.subjectSlug] ?? a.subjectSlug}
                      {" · "}
                      <span className="sr-only">{tResults("time")}: </span>
                      <span className="font-mono tabular-nums">
                        {formatTime(a.elapsedSeconds)}
                      </span>
                    </span>
                  </span>
                  <Sticker
                    slug={stickerForSlug(a.slug)}
                    size={36}
                    title={tStickers(stickerForSlug(a.slug))}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Window>
      )}

      {/* Collections touched */}
      {data && data.collections.length > 0 && (
        <Window title={t("myCollections")} static>
          <ul className="grid gap-3 p-4 sm:grid-cols-2">
            {data.collections.map((c) => (
              <li key={c.topicSlug} data-subject={c.subjectSlug}>
                <Link
                  href={`/collections/${c.topicSlug}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-card border-2 border-line bg-paper p-3 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <span aria-hidden className="shrink-0 text-accent">
                    <SubjectMotif subject={c.subjectSlug} className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="font-display block truncate">
                      {topicNames[c.topicSlug] ?? c.topicSlug}
                    </span>
                    <span className="label-caps block text-ink-faint">
                      {subjectNames[c.subjectSlug] ?? c.subjectSlug}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Window>
      )}
    </div>
  );
}
