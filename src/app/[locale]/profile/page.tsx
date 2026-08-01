import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ensureProfile } from "@/lib/account/service";
import { listSubjects, listTopics } from "@/lib/db/queries";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { JournalClient } from "@/components/journal/JournalClient";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { isAvatarKind } from "@/components/ui/Avatar";
import {
  ProfileTabsNav,
  asProfileTab,
} from "@/components/account/ProfileTabsNav";
import type {
  AccountProfile,
  AccountStats,
  ActivityRow,
  ContinueRow,
  CreationRow,
} from "@/components/account/types";

export const dynamic = "force-dynamic";

/**
 * Who counts as a constructor. There is no role column, so this is read from
 * real signals rather than shown to everyone: an explicit allowlist of editor
 * addresses, or having actually authored something in the Playground.
 */
function allowlistedConstructor(email: string | null): boolean {
  const list = (process.env.CLUEBERRY_CONSTRUCTORS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return email !== null && list.includes(email.toLowerCase());
}

interface AccountData {
  profile: AccountProfile;
  stats: AccountStats;
  activity: ActivityRow[];
  continuePlaying: ContinueRow[];
  creations: CreationRow[];
  isConstructor: boolean;
}

/** Everything the hub shows for a signed-in player, read on the server. */
async function readAccount(userId: string): Promise<AccountData | null> {
  await ensureProfile(userId);
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { email: true, emailVerified: true } } },
  });
  if (!profile) return null;

  const puzzleSelect = {
    slug: true,
    title: true,
    subject: { select: { slug: true } },
  } as const;

  const [completed, inProgress, stickers, attempts, active, creations] = await Promise.all([
    prisma.puzzleAttempt.count({ where: { userId, status: "completed" } }),
    prisma.puzzleAttempt.count({ where: { userId, status: "in_progress" } }),
    prisma.userSticker.findMany({ where: { userId }, select: { count: true } }),
    prisma.puzzleAttempt.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { puzzle: { select: puzzleSelect } },
    }),
    prisma.puzzleAttempt.findMany({
      where: { userId, status: "in_progress" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { puzzle: { select: puzzleSelect } },
    }),
    prisma.playgroundPuzzle.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, visibility: true, updatedAt: true },
    }),
  ]);

  const ownedCreations = await prisma.playgroundPuzzle.count({ where: { ownerId: userId } });

  return {
    profile: {
      displayName: profile.displayName,
      username: profile.usernameDisplay,
      avatarKind: isAvatarKind(profile.avatarKind) ? profile.avatarKind : "bunny",
      avatarSeed: profile.avatarSeed,
      bio: profile.bio ?? "",
      joinedAt: profile.joinedAt.toISOString(),
      favoriteSubjects: JSON.parse(profile.favoriteSubjects) as string[],
      favoriteCollections: JSON.parse(profile.favoriteCollections) as string[],
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      multiplayerName: profile.multiplayerName ?? "",
      showPresence: profile.showPresence,
      email: profile.user.email ?? "",
      emailVerified: profile.user.emailVerified !== null,
    },
    stats: {
      completed,
      inProgress,
      stickers: stickers.reduce((sum, s) => sum + s.count, 0),
      distinctStickers: stickers.length,
    },
    activity: attempts.map((a) => ({
      puzzleId: a.puzzleId,
      slug: a.puzzle.slug,
      title: a.puzzle.title,
      subjectSlug: a.puzzle.subject.slug,
      status: a.status === "completed" ? "completed" : "in_progress",
      elapsedSeconds: a.elapsedSeconds,
      at: a.updatedAt.toISOString(),
    })),
    continuePlaying: active.map((a) => ({
      puzzleId: a.puzzleId,
      slug: a.puzzle.slug,
      title: a.puzzle.title,
      subjectSlug: a.puzzle.subject.slug,
      completionPercentage: a.completionPercentage,
      elapsedSeconds: a.elapsedSeconds,
    })),
    creations: creations.map((c) => ({
      id: c.id,
      title: c.title,
      visibility: c.visibility,
      updatedAt: c.updatedAt.toISOString(),
    })),
    isConstructor:
      ownedCreations > 0 || allowlistedConstructor(profile.user.email ?? null),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("title") };
}

/**
 * The personal hub. Journal and Settings are sections here rather than
 * top-level destinations (docs/information-architecture.md).
 */
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale }, { tab }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const active = asProfileTab(tab);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [subjects, topics, account] = await Promise.all([
    listSubjects(locale),
    listTopics(locale),
    userId ? readAccount(userId) : Promise.resolve(null),
  ]);

  const subjectNames = Object.fromEntries(subjects.map((s) => [s.slug, s.name]));
  const topicNames = Object.fromEntries(topics.map((t) => [t.slug, t.name]));

  return (
    <div>
      <ProfileTabsNav active={active} locale={locale} />
      <div className="mt-4">
        {active === "journal" && (
          <JournalClient
            subjectNames={subjectNames}
            topicNames={topicNames}
            signedIn={userId !== null}
          />
        )}
        {active === "settings" && <SettingsPanel />}
        {active === "desk" && (
          <ProfileClient
            account={account}
            subjects={subjects.map((s) => ({ slug: s.slug, name: s.name }))}
            collections={topics.map((t) => ({
              slug: t.slug,
              name: t.name,
              group: t.subjectName,
            }))}
            subjectNames={subjectNames}
            topicNames={topicNames}
          />
        )}
      </div>
    </div>
  );
}
