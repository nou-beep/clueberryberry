import { expect, test, type Page } from "@playwright/test";

/**
 * The complete path: open the site, switch language, browse to a subject, solve
 * a puzzle, see the completion stamp and sticker, copy the share result.
 *
 * Uses the hand-authored "The Body at a Glance" (biology → human anatomy),
 * whose grid is stable seed content.
 */

interface EntryFixture {
  clueId: string;
  row: number; // 0-indexed, as in the puzzle JSON
  column: number;
  direction: "across" | "down";
  answer: string;
}

const ENTRIES: EntryFixture[] = [
  { clueId: "across-1", row: 0, column: 3, direction: "across", answer: "HEART" },
  { clueId: "down-2", row: 0, column: 4, direction: "down", answer: "ELBOW" },
  { clueId: "down-3", row: 0, column: 7, direction: "down", answer: "TENDON" },
  { clueId: "across-4", row: 2, column: 2, direction: "across", answer: "RIB" },
  { clueId: "across-5", row: 4, column: 2, direction: "across", answer: "JAW" },
  { clueId: "down-6", row: 4, column: 3, direction: "down", answer: "ARTERY" },
  { clueId: "across-7", row: 4, column: 6, direction: "across", answer: "LOBE" },
  { clueId: "across-8", row: 6, column: 3, direction: "across", answer: "TOE" },
  { clueId: "across-9", row: 8, column: 2, direction: "across", answer: "IRIS" },
];

/** Every solution letter by cell, derived from the entry geometry. */
function solutionCells(entries: EntryFixture[]): Array<[number, number, string]> {
  const map = new Map<string, [number, number, string]>();
  for (const e of entries) {
    for (let i = 0; i < e.answer.length; i++) {
      const row = e.direction === "down" ? e.row + i : e.row;
      const column = e.direction === "across" ? e.column + i : e.column;
      map.set(`${row},${column}`, [row, column, e.answer[i]]);
    }
  }
  return [...map.values()];
}

const cellByIndex = (page: Page, row: number, column: number) =>
  // aria-labels are 1-indexed and human-readable.
  page.getByRole("gridcell", {
    name: new RegExp(`^Row ${row + 1}, column ${column + 1}(,|$)`),
  });

/**
 * Fill a set of cells by clicking each one and typing its letter. Clicking a
 * cell always selects it (a second click on the *same* cell only flips the
 * typing direction, which doesn't change where the letter lands), so this is
 * deterministic no matter what the app's cursor is doing.
 */
async function fillCells(page: Page, cells: Array<[number, number, string]>) {
  for (const [row, column, letter] of cells) {
    await cellByIndex(page, row, column).click();
    await page.keyboard.type(letter);
  }
}

test("full solve path: language switch, subject browse, solve, stamp, share", async ({
  page,
}) => {
  // 1. Open the site → default locale.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little notebook of crosswords" })
  ).toBeVisible();

  // 2. Switch language and back, via the header switcher.
  await page.getByRole("combobox", { name: "Language" }).selectOption("fr");
  await page.waitForURL(/\/fr$/);
  await expect(page.getByRole("link", { name: /Sujets/ })).toBeVisible();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await page.waitForURL(/\/en$/);

  // 3. Choose a subject from the binder tabs.
  await page.getByRole("navigation").getByRole("link", { name: "Subjects" }).click();
  await page.waitForURL(/\/en\/subjects$/);
  await page.getByRole("link", { name: /Biology/ }).first().click();
  await page.waitForURL(/\/en\/subjects\/biology/);

  // 4. Open the puzzle.
  await page.getByRole("link", { name: /The Body at a Glance/ }).first().click();
  await page.waitForURL(/\/en\/play\/the-body-at-a-glance/);
  await expect(
    page.getByRole("heading", { name: "The Body at a Glance" })
  ).toBeVisible();

  // 5. Solve everything except the last word.
  const withoutLast = ENTRIES.filter((e) => e.clueId !== "across-9");
  const lastOnly = solutionCells(ENTRIES).filter(
    (cell) => !solutionCells(withoutLast).some(([r, c]) => r === cell[0] && c === cell[1])
  );
  await fillCells(page, solutionCells(withoutLast));
  expect(lastOnly.length).toBeGreaterThan(0);

  // 6. Use a hint for the remaining word (9-Across).
  await page.locator('[data-clue="across-9"]').first().click();
  await page.getByRole("button", { name: /^Reveal/ }).click();
  await page.getByRole("menuitem", { name: "Reveal word" }).click();

  // 7. Completion: the results window arrives with a stamp and a sticker.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText("Sticker earned")).toBeVisible();
  await expect(dialog.getByText("What you learned")).toBeVisible();
  await expect(dialog.getByText("Hints used")).toBeVisible();

  // 8. Copy the share result — abstract squares only, never letters.
  await dialog.getByRole("button", { name: "Copy result" }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("Clueberry — The Body at a Glance");
  expect(clipboard).toContain("🟩");
  expect(clipboard).not.toContain("HEART");
});

test("a clean solve reports no hints and no mistakes", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  await fillCells(page, solutionCells(ENTRIES));

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  // Unaided solve: the percentage cell reads 100%.
  await expect(dialog.getByText("100%")).toBeVisible();
});

test("keyboard navigation: arrows, typing, backspace", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  const cell = (r: number, c: number) =>
    page.getByRole("gridcell", { name: new RegExp(`^Row ${r}, column ${c}`) });

  await cell(1, 4).click();
  await expect(cell(1, 4)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowRight");
  await expect(cell(1, 5)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowDown");
  await expect(cell(2, 5)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.type("X");
  await expect(cell(2, 5)).toHaveAccessibleName(/X/);

  await page.keyboard.press("Backspace");
  await expect(cell(2, 5)).not.toHaveAccessibleName(/X/);
});

test("progress persists across a reload", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  await page.locator('[data-clue="across-1"]').first().click();
  await page.keyboard.type("HEART");
  await expect(page.getByRole("gridcell", { name: /Row 1, column 4, H/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("gridcell", { name: /Row 1, column 4, H/ })).toBeVisible();
});

test("solving a puzzle puts a sticker in the journal", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  await fillCells(page, solutionCells(ENTRIES));
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole("button", { name: /Back to the notebook/ }).click();

  await page.getByRole("navigation").getByRole("link", { name: "Journal" }).click();
  await page.waitForURL(/\/en\/journal$/);
  await expect(page.getByText("The Body at a Glance")).toBeVisible();
  await expect(page.getByText(/of 15 collected/i)).toBeVisible();
});

test("daily page links to the archive", async ({ page }) => {
  await page.goto("/en/daily");
  await expect(page.getByRole("heading", { name: "Daily crossword" })).toBeVisible();
  await page.getByRole("link", { name: /Previous dailies/ }).first().click();
  await page.waitForURL(/\/en\/archive$/);
  await expect(page.getByRole("heading", { name: "Daily archive" })).toBeVisible();
});

test("the old progress route now opens the journal", async ({ page }) => {
  await page.goto("/en/progress");
  await page.waitForURL(/\/en\/journal$/);
});

test("the playground studio offers the bench, not a chat box", async ({ page }) => {
  await page.goto("/en/playground");
  await expect(page.getByRole("link", { name: /Create new crossword/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Generate with help/ })).toBeVisible();
  // Templates only appear for banks that exist.
  await expect(page.getByRole("link", { name: /Easy biology warm-up/ })).toBeVisible();
});

test("the creation strip builds a valid puzzle through real stages", async ({ page }) => {
  await page.goto("/en/playground/new?preset=medium-general");

  // The preset lands on the build step; nothing is generated until asked.
  await page.getByRole("button", { name: /^Build a puzzle$/ }).click();

  // Every stage of the pipeline reports, and the last one completes.
  await expect(page.getByText("Finalising")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Test-solving")).toBeVisible();

  // Preview shows the shape without giving the answers away.
  await expect(page.getByRole("table", { name: /Grid preview/ })).toBeVisible({
    timeout: 15_000,
  });

  // It is playable, and labelled as unreviewed.
  await page.getByRole("button", { name: "10 Play" }).click();
  const grid = page.getByRole("grid", { name: "Crossword grid" });
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await grid.getByRole("gridcell").filter({ hasNotText: "" }).first().click();
  await page.keyboard.type("A");
  await expect(
    page.getByText(/Official puzzles are hand-written and reviewed/)
  ).toBeVisible();
});

test("the assistant fills the form and refuses to guess", async ({ page }) => {
  await page.goto("/en/playground/new");
  await page.getByRole("button", { name: "3 Topic" }).click();

  const request = page.getByRole("textbox", { name: /Your request/ });
  await request.fill("Make me an easy geology puzzle about volcanoes");
  await page.getByRole("button", { name: /Read it and build/ }).click();
  await expect(page.getByText(/Volcanoes/i).first()).toBeVisible();

  await request.fill("Make a puzzle about quantum basket weaving");
  await page.getByRole("button", { name: /Read it and build/ }).click();
  await expect(page.getByText(/Not recognised/i)).toBeVisible();
});

test("saving asks for an account instead of dropping the work", async ({ page }) => {
  await page.goto("/en/playground/new?preset=easy-biology");
  await page.getByRole("button", { name: /^Build a puzzle$/ }).click();
  await expect(page.getByRole("table", { name: /Grid preview/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "9 Keep" }).click();
  await expect(page.getByText(/Saving needs an account/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in/ })).toBeVisible();
  // The work is not lost: it can still be taken away as a file.
  await expect(page.getByRole("button", { name: /Download as a file/ })).toBeVisible();
});
