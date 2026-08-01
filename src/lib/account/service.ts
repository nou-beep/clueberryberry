import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { foldUsername, suggestUsername } from "./validation";

/**
 * Account operations shared by the API routes and the Auth.js credentials
 * provider. Everything that touches a password or a token lives here so the
 * hashing rules exist in exactly one place.
 */

const BCRYPT_ROUNDS = 12;
/** Reset links are short-lived on purpose. */
const RESET_TTL_MINUTES = 60;
const VERIFY_TTL_HOURS = 48;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Tokens are random, returned once, and stored only as a SHA-256 hash. */
function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare so token lookups don't leak timing information. */
export function tokensMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function usernameAvailable(username: string): Promise<boolean> {
  const existing = await prisma.profile.findUnique({
    where: { username: foldUsername(username) },
    select: { id: true },
  });
  return existing === null;
}

/** Find a free username near the requested one, e.g. `nour` → `nour2`. */
export async function findFreeUsername(seed: string): Promise<string> {
  const base = suggestUsername(seed);
  if (await usernameAvailable(base)) return base;
  for (let n = 2; n < 200; n++) {
    const candidate = `${base.slice(0, 17)}${n}`;
    if (await usernameAvailable(candidate)) return candidate;
  }
  return `${base.slice(0, 12)}${Date.now().toString(36).slice(-6)}`;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export type CreateAccountResult =
  | { ok: true; userId: string; verificationToken: string }
  | { ok: false; error: "email_taken" | "username_taken" };

/**
 * Create a user, their credential, profile and settings in one transaction so
 * a half-made account can never exist.
 */
export async function createAccount(
  input: CreateAccountInput
): Promise<CreateAccountResult> {
  const email = input.email.toLowerCase();
  const username = foldUsername(input.username);

  const [emailTaken, nameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (emailTaken) return { ok: false, error: "email_taken" };
  if (nameTaken) return { ok: false, error: "username_taken" };

  const passwordHash = await hashPassword(input.password);
  const { token, tokenHash } = newToken();

  const user = await prisma.user.create({
    data: {
      email,
      name: input.displayName,
      credential: { create: { passwordHash } },
      profile: {
        create: {
          displayName: input.displayName,
          username,
          usernameDisplay: input.username.trim(),
          avatarSeed: Math.floor(Math.random() * 1000),
        },
      },
      settings: { create: {} },
      verifyTokens: {
        create: {
          tokenHash,
          expiresAt: new Date(Date.now() + VERIFY_TTL_HOURS * 3600_000),
        },
      },
    },
    select: { id: true },
  });

  return { ok: true, userId: user.id, verificationToken: token };
}

/** Returns the user id when the email and password match, otherwise null. */
export async function authenticate(
  email: string,
  password: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, credential: { select: { passwordHash: true } } },
  });
  // Hash anyway when the user is missing, so a wrong email and a wrong
  // password take about the same time to answer.
  const hash = user?.credential?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await verifyPassword(password, hash);
  return ok && user ? user.id : null;
}

/**
 * Always succeeds from the caller's point of view: returning "no such email"
 * would let anyone probe which addresses have accounts.
 */
export async function createPasswordReset(
  email: string
): Promise<{ token: string; userId: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) return null;

  const { token, tokenHash } = newToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });
  return { token, userId: user.id };
}

export type ResetResult = "ok" | "invalid" | "expired" | "used";

export async function performPasswordReset(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() < Date.now()) return "expired";

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.credential.upsert({
      where: { userId: row.userId },
      create: { userId: row.userId, passwordHash },
      update: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    // Signing every session out is the point of a reset.
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return "ok";
}

export async function verifyEmailToken(token: string): Promise<ResetResult> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() < Date.now()) return "expired";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return "ok";
}

/**
 * Ensure a profile exists — OAuth sign-ins arrive without one.
 * Idempotent, so it is safe to call on every session read.
 */
export async function ensureProfile(userId: string): Promise<void> {
  const existing = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const seed = user?.name ?? user?.email?.split("@")[0] ?? "player";
  await prisma.profile.create({
    data: {
      userId,
      displayName: user?.name ?? "Player",
      username: await findFreeUsername(seed),
      usernameDisplay: await findFreeUsername(seed),
      avatarSeed: Math.floor(Math.random() * 1000),
    },
  });
  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
