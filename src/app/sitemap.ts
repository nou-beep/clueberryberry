import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { TAXONOMY } from "@/content/taxonomy/index";
import { LOCALES, siteUrl } from "@/lib/site";

/**
 * Built from what is actually published, not from the route table: a subject
 * with no playable puzzle is not worth a crawl, and a puzzle that is still a
 * draft must not appear at all.
 *
 * Regenerated hourly. If the database is unreachable at build time the sitemap
 * degrades to the static pages rather than failing the build.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const localized = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly") => {
    for (const locale of LOCALES) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        changeFrequency,
        priority,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${siteUrl}/${l}${path}`])
          ),
        },
      });
    }
  };

  localized("", 1, "daily");
  localized("/puzzles", 0.9, "daily");
  localized("/playground", 0.6, "monthly");
  localized("/rooms", 0.5, "daily");

  try {
    const puzzles = await prisma.puzzle.findMany({
      where: { status: "published" },
      select: {
        slug: true,
        language: true,
        createdAt: true,
        subject: { select: { slug: true } },
        topic: { select: { slug: true } },
      },
    });

    // Only list a subject or collection that has something to play.
    const liveSubjects = new Set(puzzles.map((p) => p.subject.slug));
    const liveTopics = new Set(puzzles.map((p) => p.topic.slug));

    for (const subject of TAXONOMY) {
      if (liveSubjects.has(subject.slug)) localized(`/subjects/${subject.slug}`, 0.7, "weekly");
      for (const collection of subject.collections) {
        if (liveTopics.has(collection.slug)) {
          localized(`/collections/${collection.slug}`, 0.6, "weekly");
        }
      }
    }

    // A puzzle exists in one language only, so it gets one URL, not three.
    for (const puzzle of puzzles) {
      entries.push({
        url: `${siteUrl}/${puzzle.language}/play/${puzzle.slug}`,
        lastModified: puzzle.createdAt,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  } catch {
    // No database at build time — the static entries above still ship.
  }

  return entries;
}
