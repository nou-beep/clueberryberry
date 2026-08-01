import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";
import { DESTINATIONS, activeDestination } from "@/components/layout/destinations";
import { foldForSearch, matches, score } from "@/lib/search/query";

/**
 * The navigation contract from docs/information-architecture.md. These exist so
 * a sixth tab cannot appear by accident — adding one is a design decision, and
 * it should have to break a test to happen.
 *
 * (`navigation.test.ts` is about moving the cursor around a grid; this one is
 * about moving around the app.)
 */
describe("app navigation", () => {
  it("has exactly five destinations, in the documented order", () => {
    expect(DESTINATIONS.map((d) => d.key)).toEqual([
      "home",
      "puzzles",
      "playground",
      "rooms",
      "profile",
    ]);
  });

  it("labels every destination in all three languages", () => {
    for (const [name, messages] of [
      ["en", en],
      ["fr", fr],
      ["ar", ar],
    ] as const) {
      for (const destination of DESTINATIONS) {
        const label = (messages.nav as Record<string, string>)[destination.key];
        expect(label?.trim().length, `${destination.key} missing in ${name}`).toBeGreaterThan(0);
      }
    }
  });

  it("gives each destination a distinct route", () => {
    expect(new Set(DESTINATIONS.map((d) => d.href)).size).toBe(DESTINATIONS.length);
  });

  it("keeps home exact so every other page doesn't light it up", () => {
    expect(activeDestination("/")?.key).toBe("home");
    expect(activeDestination("/puzzles")?.key).toBe("puzzles");
  });

  it("keeps detail pages under the tab that owns them", () => {
    const cases: Array<[string, string]> = [
      ["/subjects/biology", "puzzles"],
      ["/subjects/biology/the-cell", "puzzles"],
      ["/collections/human-anatomy", "puzzles"],
      ["/daily/2026-08-01", "puzzles"],
      ["/archive", "puzzles"],
      ["/play/en-inside-the-cell", "puzzles"],
      ["/editor/puzzles", "playground"],
      ["/rooms/ABCD", "rooms"],
      ["/journal", "profile"],
      ["/settings", "profile"],
      ["/progress", "profile"],
      ["/account/sign-in", "profile"],
    ];
    for (const [path, key] of cases) {
      expect(activeDestination(path)?.key, path).toBe(key);
    }
  });

  it("leaves an unrelated path with no active tab rather than guessing", () => {
    expect(activeDestination("/styleguide")).toBeUndefined();
  });

  it("no longer exposes search, archive or settings as their own tabs", () => {
    const keys = DESTINATIONS.map((d) => d.key);
    for (const removed of ["search", "archive", "settings", "journal", "daily", "editor"]) {
      expect(keys).not.toContain(removed);
    }
  });
});

describe("search folding", () => {
  it("ignores latin accents", () => {
    expect(matches("Mythologie grecque", foldForSearch("mythologie"))).toBe(true);
    expect(matches("Élan", foldForSearch("elan"))).toBe(true);
  });

  it("forgives arabic hamza, yeh and diacritic spellings in the search box", () => {
    expect(matches("الأساطير", foldForSearch("الاساطير"))).toBe(true);
    expect(matches("مِصْر", foldForSearch("مصر"))).toBe(true);
    expect(matches("الكيميائي", foldForSearch("الكيميائي"))).toBe(true);
  });

  it("requires every word of the query to appear", () => {
    expect(matches("Ancient Egypt", foldForSearch("ancient egypt"))).toBe(true);
    expect(matches("Ancient Egypt", foldForSearch("ancient rome"))).toBe(false);
  });

  it("ranks an exact name above one that merely contains the query", () => {
    expect(score("Biology", foldForSearch("biology"))).toBeLessThan(
      score("Marine biology", foldForSearch("biology"))
    );
  });
});
