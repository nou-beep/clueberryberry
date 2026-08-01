import { describe, expect, it } from "vitest";
import { sizeForMinutes } from "@/lib/playground/generate";
import { parseRequest } from "@/lib/playground/request";

/**
 * The interpreter is a keyword grammar, not a model. These tests pin the
 * grammar down: the example requests in all three languages, the promise that
 * an unrecognised subject is reported rather than guessed, and the mapping from
 * "a ten-minute puzzle" to a grid size.
 */

describe("example requests, in all three languages", () => {
  it("1. an easy geology puzzle about volcanoes", () => {
    const cases = [
      ["en", "Make me an easy geology puzzle about volcanoes."],
      ["fr", "Fais-moi une grille facile de géologie sur les volcans."],
      ["ar", "اعمل لي شبكة سهلة عن البراكين في علم الأرض."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.theme, locale).toBe("volcanoes");
      expect(parsed.request.subject, locale).toBe("geology");
      expect(parsed.request.collection, locale).toBe("volcanoes");
      expect(parsed.request.difficulty, locale).toBe("easy");
      expect(parsed.request.language, locale).toBe(locale);
      expect(parsed.unmatched, locale).toEqual([]);
      expect(parsed.needsTopic, locale).toBe(false);
      expect(parsed.confidence, locale).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("2. a hard Taylor Swift crossword", () => {
    const cases = [
      ["en", "Create a hard Taylor Swift crossword."],
      ["fr", "Crée une grille difficile sur Taylor Swift."],
      ["ar", "أنشئ شبكة صعبة عن تايلور سويفت."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.difficulty, locale).toBe("hard");
      expect(
        parsed.matched.find((m) => m.field === "collection")?.value,
        locale
      ).toBe("taylor-swift");
      if (locale === "en") {
        expect(parsed.request.theme).toBe("taylor-swift");
        expect(parsed.missingBank).toBeNull();
      } else {
        // The bank is English-only so far; that is reported, never papered over.
        expect(parsed.request.theme, locale).toBeNull();
        expect(parsed.missingBank, locale).toBe("taylor-swift");
      }
    }
  });

  it("3. a French puzzle about Greek mythology", () => {
    const cases = [
      ["en", "Give me a French puzzle about Greek mythology."],
      ["fr", "Donne-moi une grille en français sur la mythologie grecque."],
      ["ar", "أعطني شبكة بالفرنسية عن الميثولوجيا اليونانية."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.language, locale).toBe("fr");
      expect(parsed.request.theme, locale).toBe("greek-mythology");
      expect(parsed.request.collection, locale).toBe("greek-mythology");
      expect(parsed.request.subject, locale).toBe("mythology");
      expect(parsed.unmatched, locale).toEqual([]);
    }
  });

  it("4. an Arabic crossword about World War II", () => {
    const cases = [
      ["en", "Make an Arabic crossword about World War II."],
      ["fr", "Fais une grille en arabe sur la Seconde Guerre mondiale."],
      ["ar", "اعمل شبكة بالعربية عن الحرب العالمية الثانية."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.language, locale).toBe("ar");
      expect(parsed.request.theme, locale).toBe("world-war-ii");
      expect(parsed.request.subject, locale).toBe("world-war-ii");
      expect(parsed.needsTopic, locale).toBe(false);
    }
  });

  it("5. a medium One Direction puzzle", () => {
    const cases = [
      ["en", "Create a medium One Direction puzzle."],
      ["fr", "Crée une grille moyenne sur One Direction."],
      ["ar", "أنشئ شبكة متوسطة عن ون دايركشن."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.difficulty, locale).toBe("medium");
      expect(
        parsed.matched.find((m) => m.field === "collection")?.value,
        locale
      ).toBe("one-direction");
      if (locale === "en") expect(parsed.request.theme).toBe("one-direction");
      else expect(parsed.missingBank, locale).toBe("one-direction");
    }
  });

  it("6. a ten-minute general knowledge puzzle", () => {
    const cases = [
      ["en", "Make me a ten-minute general knowledge puzzle."],
      ["fr", "Fais-moi une grille de culture générale de dix minutes."],
      ["ar", "اعمل لي شبكة معلومات عامة من عشر دقائق."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.theme, locale).toBe("general-knowledge");
      expect(parsed.request.minutes, locale).toBe(10);
      expect(parsed.request.size, locale).toBe("medium");
      expect(parsed.unmatched, locale).toEqual([]);
    }
  });

  it("7. another puzzle like the one just completed", () => {
    const cases = [
      ["en", "Make another puzzle like the one I just completed."],
      ["fr", "Fais une autre comme celle que je viens de terminer."],
      ["ar", "اعمل شبكة أخرى مثل التي أكملتها."],
    ] as const;
    for (const [locale, text] of cases) {
      const bare = parseRequest(text, locale);
      expect(bare.repeatLast, locale).toBe(true);
      // With nothing to repeat, the interpreter asks rather than guesses.
      expect(bare.request.theme, locale).toBeNull();
      expect(bare.needsTopic, locale).toBe(true);

      const resolved = parseRequest(text, locale, {
        theme: "plants",
        subject: "biology",
        collection: "plants",
        difficulty: "hard",
        size: "large",
      });
      expect(resolved.request.theme, locale).toBe("plants");
      expect(resolved.request.difficulty, locale).toBe("hard");
      expect(resolved.request.size, locale).toBe("large");
      expect(resolved.needsTopic, locale).toBe(false);
    }
  });

  it("8. a family-friendly puzzle with no proper nouns or abbreviations", () => {
    const cases = [
      ["en", "A family friendly cats puzzle with no proper nouns and no abbreviations."],
      ["fr", "Une grille sur les chats, tout public, sans noms propres et sans abréviations."],
      ["ar", "شبكة عن القطط مناسب للأطفال بدون أسماء أعلام وبدون اختصارات."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.theme, locale).toBe("cats");
      expect(parsed.request.familyFriendly, locale).toBe(true);
      expect(parsed.request.allowProperNouns, locale).toBe(false);
      expect(parsed.request.allowAbbreviations, locale).toBe(false);
    }
  });
});

describe("unrecognised subjects are reported, never guessed", () => {
  it("leaves the topic empty and lists what it could not place", () => {
    const cases = [
      ["en", "Make me an easy puzzle about Byzantine tax law."],
      ["fr", "Fais-moi une grille facile sur la fiscalité byzantine."],
      ["ar", "اعمل لي شبكة سهلة عن الضرائب البيزنطية."],
    ] as const;
    for (const [locale, text] of cases) {
      const parsed = parseRequest(text, locale);
      expect(parsed.request.theme, locale).toBeNull();
      expect(parsed.needsTopic, locale).toBe(true);
      expect(parsed.request.difficulty, locale).toBe("easy");
      expect(parsed.unmatched.length, locale).toBeGreaterThan(0);
      expect(parsed.confidence, locale).toBeLessThan(0.5);
    }
  });

  it("keeps a recognised half of a request", () => {
    const parsed = parseRequest("A hard puzzle about quantum gastronomy", "en");
    expect(parsed.request.difficulty).toBe("hard");
    expect(parsed.request.theme).toBeNull();
    expect(parsed.unmatched).toContain("quantum");
  });

  it("reports nothing for an empty request", () => {
    const parsed = parseRequest("   ", "en");
    expect(parsed.matched).toEqual([]);
    expect(parsed.unmatched).toEqual([]);
    expect(parsed.needsTopic).toBe(true);
    expect(parsed.confidence).toBe(0);
  });
});

describe("time and size", () => {
  it("maps minutes to a grid size", () => {
    expect(sizeForMinutes(3)).toBe("small");
    expect(sizeForMinutes(6)).toBe("small");
    expect(sizeForMinutes(7)).toBe("medium");
    expect(sizeForMinutes(12)).toBe("medium");
    expect(sizeForMinutes(13)).toBe("large");
    expect(sizeForMinutes(30)).toBe("large");
  });

  it("reads minutes written as digits, words and Arabic-Indic digits", () => {
    expect(parseRequest("a 5 minute cats puzzle", "en").request.size).toBe("small");
    expect(parseRequest("a twenty minute cats puzzle", "en").request.size).toBe("large");
    expect(parseRequest("grille sur les chats de 15 minutes", "fr").request.minutes).toBe(15);
    expect(parseRequest("شبكة عن القطط من ٢٠ دقيقة", "ar").request.minutes).toBe(20);
  });

  it("lets an explicit grid size win over a stated time", () => {
    const parsed = parseRequest("a small grid about cats, about twenty minutes", "en");
    expect(parsed.request.size).toBe("small");
    expect(parsed.request.minutes).toBe(20);
  });

  it("keeps the option controls when the text says nothing about them", () => {
    const parsed = parseRequest("cats", "en", {
      size: "large",
      difficulty: "medium",
      familyFriendly: true,
      allowProperNouns: false,
      allowAbbreviations: false,
      language: "fr",
    });
    expect(parsed.request.size).toBe("large");
    expect(parsed.request.difficulty).toBe("medium");
    expect(parsed.request.familyFriendly).toBe(true);
    expect(parsed.request.allowProperNouns).toBe(false);
    expect(parsed.request.allowAbbreviations).toBe(false);
    expect(parsed.request.language).toBe("fr");
  });
});
