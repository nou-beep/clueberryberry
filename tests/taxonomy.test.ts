import { describe, expect, it } from "vitest";
import {
  SUBJECTS_BY_SECTION,
  TAXONOMY,
  assertTaxonomyIsSound,
  totalCollections,
  type SubjectDef,
} from "@/content/taxonomy/index";
import { SECTIONS, TONES } from "@/content/taxonomy/types";
import { SUBJECT_THEMES, isSubjectTheme } from "@/lib/subject-theme";

/** The slugs the originally authored puzzles depend on. */
const LEGACY_SUBJECT_SLUGS = ["biology", "psychology", "chemistry", "history", "games"];
const LEGACY_COLLECTION_SLUGS = [
  "human-anatomy",
  "the-cell",
  "neuroscience",
  "memory",
  "periodic-table",
  "everyday-chemistry",
  "ancient-egypt",
  "moroccan-history",
  "retro-games",
  "gaming-vocabulary",
];

describe("taxonomy integrity", () => {
  it("passes its own soundness check", () => {
    expect(() => assertTaxonomyIsSound()).not.toThrow();
  });

  it("has every subject in a known section with a known tone", () => {
    for (const subject of TAXONOMY) {
      expect(SECTIONS).toContain(subject.section);
      if (subject.tone) expect(TONES).toContain(subject.tone);
      for (const collection of subject.collections) {
        if (collection.tone) expect(TONES).toContain(collection.tone);
      }
    }
  });

  it("uses only themes the visual registry can draw", () => {
    for (const subject of TAXONOMY) {
      expect(
        isSubjectTheme(subject.theme),
        `${subject.slug} uses unknown theme "${subject.theme}"`
      ).toBe(true);
      expect(SUBJECT_THEMES).toContain(subject.theme);
    }
  });

  it("keeps collection slugs globally unique", () => {
    const seen = new Set<string>();
    for (const subject of TAXONOMY) {
      for (const collection of subject.collections) {
        expect(seen.has(collection.slug), `duplicate ${collection.slug}`).toBe(false);
        seen.add(collection.slug);
      }
    }
    expect(seen.size).toBe(totalCollections());
  });

  it("uses url-safe latin slugs everywhere, including Arabic-facing content", () => {
    const slugPattern = /^[a-z0-9-]+$/;
    for (const subject of TAXONOMY) {
      expect(subject.slug).toMatch(slugPattern);
      for (const collection of subject.collections) {
        expect(collection.slug).toMatch(slugPattern);
      }
    }
  });

  it("localizes every name and subject description in all three languages", () => {
    for (const subject of TAXONOMY) {
      for (const locale of ["en", "fr", "ar"] as const) {
        expect(subject.names[locale].trim().length).toBeGreaterThan(0);
        expect(subject.descriptions[locale].trim().length).toBeGreaterThan(0);
        for (const collection of subject.collections) {
          expect(
            collection.names[locale].trim().length,
            `${collection.slug} missing ${locale}`
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("does not leave a translation as a copy of the English string", () => {
    // A few proper nouns are legitimately identical across locales (NATO, CD…),
    // so this checks the *rate* rather than forbidding it outright.
    let identical = 0;
    let total = 0;
    for (const subject of TAXONOMY) {
      for (const collection of subject.collections) {
        total++;
        if (collection.names.fr === collection.names.en) identical++;
      }
    }
    expect(identical / total).toBeLessThan(0.15);
  });
});

describe("library organisation", () => {
  it("fills all four shelves", () => {
    for (const section of SECTIONS) {
      expect(
        SUBJECTS_BY_SECTION[section].length,
        `${section} shelf is empty`
      ).toBeGreaterThan(0);
    }
  });

  it("assigns every subject to exactly one shelf", () => {
    const counted = SECTIONS.reduce(
      (sum, section) => sum + SUBJECTS_BY_SECTION[section].length,
      0
    );
    expect(counted).toBe(TAXONOMY.length);
  });

  it("keeps the shelves small enough to scan", () => {
    // Shelves scroll, so this is a scannability guard rather than a hard cap.
    for (const section of SECTIONS) {
      expect(SUBJECTS_BY_SECTION[section].length).toBeLessThanOrEqual(16);
    }
  });
});

describe("continuity with the original library", () => {
  it("keeps the subject slugs the authored puzzles reference", () => {
    const slugs = TAXONOMY.map((s) => s.slug);
    for (const slug of LEGACY_SUBJECT_SLUGS) expect(slugs).toContain(slug);
  });

  it("keeps the collection slugs the authored puzzles reference", () => {
    const slugs = TAXONOMY.flatMap((s) => s.collections.map((c) => c.slug));
    for (const slug of LEGACY_COLLECTION_SLUGS) expect(slugs).toContain(slug);
  });
});

describe("sensitive subjects", () => {
  const bySlug = (slug: string): SubjectDef => {
    const found = TAXONOMY.find((s) => s.slug === slug);
    if (!found) throw new Error(`missing subject ${slug}`);
    return found;
  };

  it("marks both world wars archival", () => {
    expect(bySlug("world-war-i").tone).toBe("archival");
    expect(bySlug("world-war-ii").tone).toBe("archival");
  });

  it("gives the wars their own desaturated themes", () => {
    expect(bySlug("world-war-i").theme).toBe("ww1");
    expect(bySlug("world-war-ii").theme).toBe("ww2");
  });

  it("keeps Egyptian mythology separate from historical Ancient Egypt", () => {
    const myth = bySlug("egyptian-mythology");
    const history = bySlug("history");
    expect(myth.collections.some((c) => c.slug === "ancient-egypt")).toBe(false);
    expect(history.collections.some((c) => c.slug === "ancient-egypt")).toBe(true);
    // The subject description has to say so, in every language.
    for (const locale of ["en", "fr", "ar"] as const) {
      expect(myth.descriptions[locale].length).toBeGreaterThan(20);
    }
  });
});
