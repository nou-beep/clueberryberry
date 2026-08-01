/**
 * The library taxonomy is *data*, not code: subjects and collections live here,
 * are seeded into the database, and are read from the database at runtime.
 * No interface component contains a subject list — adding a subject or a
 * collection means editing these files and re-running the seed.
 */

export const SECTIONS = ["learn", "know", "culture", "fandom"] as const;
export type Section = (typeof SECTIONS)[number];

/**
 * "playful" gets the full sticker-and-tape treatment. "archival" drops
 * decoration for a calmer, document-like presentation — used for subjects
 * where cheerfulness would be inappropriate (the world wars).
 */
export const TONES = ["playful", "archival"] as const;
export type Tone = (typeof TONES)[number];

export interface Localized {
  en: string;
  fr: string;
  ar: string;
}

export interface CollectionDef {
  /** Globally unique across all subjects; used in /collections/<slug>. */
  slug: string;
  names: Localized;
  descriptions?: Localized;
  /** Overrides the subject tone for a sensitive collection. */
  tone?: Tone;
}

export interface SubjectDef {
  slug: string;
  section: Section;
  /** Decorative theme key, resolved against the visual registry. */
  theme: string;
  tone?: Tone;
  names: Localized;
  descriptions: Localized;
  collections: CollectionDef[];
}
