import { describe, expect, it } from "vitest";
import {
  answerMatches,
  answerToCells,
  DEFAULT_ARABIC_RULES,
  normalizeAnswer,
} from "@/lib/crossword/normalize";

describe("Latin normalization", () => {
  it("uppercases and strips French accents", () => {
    expect(normalizeAnswer("mémoire", "fr")).toBe("MEMOIRE");
    expect(normalizeAnswer("Élément", "fr")).toBe("ELEMENT");
    expect(normalizeAnswer("çà et là", "fr")).toBe("CAETLA");
  });

  it("expands ligatures", () => {
    expect(normalizeAnswer("cœur", "fr")).toBe("COEUR");
  });

  it("drops punctuation and spaces", () => {
    expect(normalizeAnswer("o'clock!", "en")).toBe("OCLOCK");
  });
});

describe("Arabic normalization", () => {
  it("folds alef variants by default", () => {
    expect(normalizeAnswer("أهرام", "ar")).toBe("اهرام");
    expect(normalizeAnswer("إنسان", "ar")).toBe("انسان");
    expect(normalizeAnswer("آثار", "ar")).toBe("اثار");
  });

  it("folds alef maqsura to ya by default", () => {
    expect(normalizeAnswer("مستشفى", "ar")).toBe("مستشفي");
  });

  it("does not fold ta marbuta by default", () => {
    expect(normalizeAnswer("ذاكرة", "ar")).toBe("ذاكرة");
    expect(normalizeAnswer("ذاكرة", "ar")).not.toBe("ذاكره");
  });

  it("folds ta marbuta when explicitly enabled", () => {
    expect(normalizeAnswer("ذاكرة", "ar", { foldTaMarbuta: true })).toBe("ذاكره");
  });

  it("preserves hamza on waw and hamza on ya by default", () => {
    expect(normalizeAnswer("مسؤول", "ar")).toBe("مسؤول");
    expect(normalizeAnswer("مسؤول", "ar")).not.toBe("مسوول");
    expect(normalizeAnswer("رئيس", "ar")).toBe("رئيس");
    expect(normalizeAnswer("رئيس", "ar")).not.toBe("رييس");
    expect(DEFAULT_ARABIC_RULES.foldHamzaWaw).toBe(false);
    expect(DEFAULT_ARABIC_RULES.foldHamzaYa).toBe(false);
  });

  it("folds hamza on waw only when explicitly enabled", () => {
    expect(normalizeAnswer("مسؤول", "ar", { foldHamzaWaw: true })).toBe("مسوول");
    // The ya flag must not touch ؤ.
    expect(normalizeAnswer("مسؤول", "ar", { foldHamzaYa: true })).toBe("مسؤول");
  });

  it("folds hamza on ya only when explicitly enabled", () => {
    expect(normalizeAnswer("رئيس", "ar", { foldHamzaYa: true })).toBe("رييس");
    // The waw flag must not touch ئ.
    expect(normalizeAnswer("رئيس", "ar", { foldHamzaWaw: true })).toBe("رئيس");
  });

  it("leaves the standalone hamza (ء) alone under either flag", () => {
    expect(
      normalizeAnswer("ماء", "ar", { foldHamzaWaw: true, foldHamzaYa: true })
    ).toBe("ماء");
  });

  it("strips diacritics and tatweel", () => {
    expect(normalizeAnswer("قَلْب", "ar")).toBe("قلب");
    expect(normalizeAnswer("قـلـب", "ar")).toBe("قلب");
  });

  it("never requires diacritics from the solver", () => {
    // Fully vocalised answer, bare typing: still a match.
    expect(answerMatches("كتاب", "كِتَابٌ", "ar")).toBe(true);
    // …but ة still does not stand in for ه.
    expect(answerMatches("مدرسه", "مُدَرِّسَة", "ar")).toBe(false);
  });

  it("respects rule overrides", () => {
    expect(normalizeAnswer("أهرام", "ar", { foldAlef: false })).toBe("أهرام");
  });
});

describe("answerMatches", () => {
  it("accepts configured alternatives only", () => {
    expect(answerMatches("colour", "COLOR", "en", ["COLOUR"])).toBe(true);
    expect(answerMatches("kolor", "COLOR", "en", ["COLOUR"])).toBe(false);
  });

  it("matches accent-insensitively in French", () => {
    expect(answerMatches("memoire", "MÉMOIRE", "fr")).toBe(true);
  });

  it("matches hamza variants in Arabic", () => {
    expect(answerMatches("اهرام", "أهرام", "ar")).toBe(true);
  });

  it("does not accept و for ؤ unless the alternative is deliberate", () => {
    expect(answerMatches("مسوول", "مسؤول", "ar")).toBe(false);
    expect(answerMatches("مسوول", "مسؤول", "ar", ["مسوول"])).toBe(true);
  });

  it("rejects empty guesses", () => {
    expect(answerMatches("", "COLOR", "en")).toBe(false);
  });
});

describe("answerToCells", () => {
  it("splits into one letter per cell", () => {
    expect(answerToCells("قلب", "ar")).toEqual(["ق", "ل", "ب"]);
    expect(answerToCells("cœur", "fr")).toEqual(["C", "O", "E", "U", "R"]);
  });
});
