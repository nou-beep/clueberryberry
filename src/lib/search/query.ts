/**
 * Text folding for search. Deliberately looser than answer normalization
 * (`src/lib/crossword/normalize.ts`): a search box should forgive accents and
 * hamza spellings even where the crossword engine would not, because a wrong
 * search result costs nothing and a missed one costs the player their patience.
 */
export function foldForSearch(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Latin accents: café → cafe, être → etre
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Arabic diacritics, Quranic annotation marks and tatweel. This has to
      // come after NFKD, which decomposes أ into ا + U+0654 — so the hamza is a
      // combining mark by this point, not part of the letter.
      .replace(/[ؐ-ًؚ-ٰٟـ]/g, "")
      // Whatever hamza carriers survived as precomposed characters
      .replace(/[آأإٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ؤئ]/g, "ء")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** True when every word of the query appears in the haystack. */
export function matches(haystack: string, foldedQuery: string): boolean {
  const hay = foldForSearch(haystack);
  return foldedQuery.split(" ").every((word) => hay.includes(word));
}

/**
 * A crude relevance score: an exact hit beats a prefix hit beats a substring.
 * Enough to keep "bio" from putting "Microbiology" above "Biology".
 */
export function score(haystack: string, foldedQuery: string): number {
  const hay = foldForSearch(haystack);
  if (hay === foldedQuery) return 0;
  if (hay.startsWith(foldedQuery)) return 1;
  if (hay.includes(` ${foldedQuery}`)) return 2;
  return 3;
}
