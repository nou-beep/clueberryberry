import { CULTURE } from "./culture";
import { FANDOM } from "./fandom";
import { KNOW } from "./know";
import { MORE } from "./more";
import { RELIGION } from "./religion";
import { LEARN } from "./learn";
import type { Section, SubjectDef } from "./types";

export * from "./types";

/** Every subject in the library, in shelf order. */
export const TAXONOMY: SubjectDef[] = [
  ...LEARN,
  ...KNOW,
  ...CULTURE,
  ...MORE,
  ...RELIGION,
  ...FANDOM,
];

export const SUBJECTS_BY_SECTION: Record<Section, SubjectDef[]> = {
  learn: TAXONOMY.filter((s) => s.section === "learn"),
  know: TAXONOMY.filter((s) => s.section === "know"),
  culture: TAXONOMY.filter((s) => s.section === "culture"),
  fandom: TAXONOMY.filter((s) => s.section === "fandom"),
};

/**
 * Collection slugs are used as standalone URLs, so they must be unique across
 * the whole library. This throws at import time (and therefore at seed time)
 * rather than letting two collections quietly collide.
 */
export function assertTaxonomyIsSound(taxonomy: SubjectDef[] = TAXONOMY): void {
  const problems: string[] = [];
  const subjectSlugs = new Set<string>();
  const collectionSlugs = new Map<string, string>();

  for (const subject of taxonomy) {
    if (subjectSlugs.has(subject.slug)) {
      problems.push(`duplicate subject slug "${subject.slug}"`);
    }
    subjectSlugs.add(subject.slug);

    if (subject.collections.length === 0) {
      problems.push(`subject "${subject.slug}" has no collections`);
    }

    for (const collection of subject.collections) {
      const owner = collectionSlugs.get(collection.slug);
      if (owner) {
        problems.push(
          `collection slug "${collection.slug}" is used by both "${owner}" and "${subject.slug}"`
        );
      }
      collectionSlugs.set(collection.slug, subject.slug);

      for (const locale of ["en", "fr", "ar"] as const) {
        if (!collection.names[locale]?.trim()) {
          problems.push(`collection "${collection.slug}" is missing its ${locale} name`);
        }
      }
    }

    for (const locale of ["en", "fr", "ar"] as const) {
      if (!subject.names[locale]?.trim()) {
        problems.push(`subject "${subject.slug}" is missing its ${locale} name`);
      }
      if (!subject.descriptions[locale]?.trim()) {
        problems.push(`subject "${subject.slug}" is missing its ${locale} description`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Taxonomy problems:\n  - ${problems.join("\n  - ")}`);
  }
}

export function totalCollections(taxonomy: SubjectDef[] = TAXONOMY): number {
  return taxonomy.reduce((sum, s) => sum + s.collections.length, 0);
}
