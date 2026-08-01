import type { AvatarKind } from "@/components/ui/Avatar";

/** The signed-in player's profile, as the profile page and editor use it. */
export interface AccountProfile {
  displayName: string;
  username: string;
  avatarKind: AvatarKind;
  avatarSeed: number;
  bio: string;
  /** ISO 8601. */
  joinedAt: string;
  favoriteSubjects: string[];
  favoriteCollections: string[];
  currentStreak: number;
  longestStreak: number;
  multiplayerName: string;
  showPresence: boolean;
  email: string;
  emailVerified: boolean;
}

/** Counts the server keeps, so nothing on the desk is guessed in the browser. */
export interface AccountStats {
  completed: number;
  inProgress: number;
  stickers: number;
  distinctStickers: number;
}

/** One line of recent activity, newest first. */
export interface ActivityRow {
  puzzleId: string;
  slug: string;
  title: string;
  subjectSlug: string;
  status: "in_progress" | "completed";
  elapsedSeconds: number;
  /** ISO 8601 of the last write. */
  at: string;
}

/** An attempt still in progress, offered as the hub's primary action. */
export interface ContinueRow {
  puzzleId: string;
  slug: string;
  title: string;
  subjectSlug: string;
  completionPercentage: number;
  elapsedSeconds: number;
}

/** Something the player made in the Playground. */
export interface CreationRow {
  id: string;
  title: string;
  visibility: string;
  /** ISO 8601. */
  updatedAt: string;
}

/** A pickable taxonomy entry (subject or collection). */
export interface TaxonomyOption {
  slug: string;
  name: string;
  /** Parent subject name, for collections. */
  group?: string;
}
