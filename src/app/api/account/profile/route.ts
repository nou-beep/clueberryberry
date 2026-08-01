import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/auth";
import { ensureProfile, usernameAvailable } from "@/lib/account/service";
import { profileUpdateSchema } from "@/lib/account/validation";
import { rateLimit } from "@/lib/rate-limit";

/** The signed-in player's profile, creating one if an OAuth sign-in lacked it. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ensureProfile(userId);
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { email: true, emailVerified: true } } },
  });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [completed, inProgress, stickers] = await Promise.all([
    prisma.puzzleAttempt.count({ where: { userId, status: "completed" } }),
    prisma.puzzleAttempt.count({ where: { userId, status: "in_progress" } }),
    prisma.userSticker.findMany({ where: { userId } }),
  ]);

  return NextResponse.json({
    profile: {
      displayName: profile.displayName,
      username: profile.usernameDisplay,
      avatarKind: profile.avatarKind,
      avatarSeed: profile.avatarSeed,
      bio: profile.bio,
      joinedAt: profile.joinedAt,
      favoriteSubjects: JSON.parse(profile.favoriteSubjects) as string[],
      favoriteCollections: JSON.parse(profile.favoriteCollections) as string[],
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      multiplayerName: profile.multiplayerName,
      showPresence: profile.showPresence,
      email: profile.user.email,
      emailVerified: profile.user.emailVerified !== null,
    },
    stats: {
      completed,
      inProgress,
      stickers: stickers.reduce((sum, s) => sum + s.count, 0),
      distinctStickers: stickers.length,
    },
  });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = rateLimit(request, "profile-update", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;
  await ensureProfile(userId);

  // A username change has to clear the uniqueness check first; the unique index
  // is the real guard, but this gives a useful error instead of a 500.
  if (input.username) {
    const current = await prisma.profile.findUnique({
      where: { userId },
      select: { username: true },
    });
    if (current?.username !== input.username && !(await usernameAvailable(input.username))) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
  }

  try {
    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.username
          ? { username: input.username, usernameDisplay: input.username }
          : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        ...(input.avatarKind ? { avatarKind: input.avatarKind } : {}),
        ...(input.avatarSeed !== undefined ? { avatarSeed: input.avatarSeed } : {}),
        ...(input.favoriteSubjects
          ? { favoriteSubjects: JSON.stringify(input.favoriteSubjects) }
          : {}),
        ...(input.favoriteCollections
          ? { favoriteCollections: JSON.stringify(input.favoriteCollections) }
          : {}),
        ...(input.multiplayerName !== undefined
          ? { multiplayerName: input.multiplayerName || null }
          : {}),
        ...(input.showPresence !== undefined ? { showPresence: input.showPresence } : {}),
      },
      select: { displayName: true, usernameDisplay: true },
    });
    // Keep the Auth.js user name in step so session displays match.
    if (input.displayName) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: input.displayName },
      });
    }
    return NextResponse.json({ ok: true, profile: updated });
  } catch {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }
}
