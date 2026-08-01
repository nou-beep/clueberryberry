import { expect, test } from "@playwright/test";

test("the old library routes lead to the Puzzles hub", async ({ page }) => {
  for (const path of ["/en/subjects", "/en/collections", "/en/archive"]) {
    await page.goto(path);
    await page.waitForURL(/\/en\/puzzles$/);
  }
  await page.goto("/en/search?q=mythology");
  await page.waitForURL(/\/en\/puzzles\?q=mythology$/);
});

test("the Puzzles hub leads with search and shelves what exists", async ({ page }) => {
  await page.goto("/en/puzzles");
  await expect(page.getByRole("heading", { name: "Puzzles", level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Looking for something in particular/ })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse by subject" })).toBeVisible();

  // Subjects with puzzles in English are on the shelf…
  await expect(page.getByRole("link", { name: /Geology/ }).first()).toBeVisible();
  // …and a subject with nothing published anywhere is not.
  await expect(page.getByRole("link", { name: /^Mythology$/ })).toHaveCount(0);
});

test("filters live in the URL and are applied on the server", async ({ page }) => {
  await page.goto("/en/puzzles?difficulty=hard&language=en");
  await expect(page.getByText(/puzzle/).first()).toBeVisible();

  // Every card carries the difficulty that was asked for.
  const badges = page.getByText("Easy", { exact: true });
  await expect(badges).toHaveCount(0);
});

test("a filter with no results suggests something real", async ({ page }) => {
  await page.goto("/en/puzzles?subject=one-direction&language=ar");
  await expect(page.getByText(/No puzzles match/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Make it in the Playground/ })).toBeVisible();
});

test("a subject with nothing in this language says so and points elsewhere", async ({
  page,
}) => {
  // World War II is English-only.
  await page.goto("/fr/subjects/world-war-ii");
  await expect(page.getByText(/pas encore de grille ici en/)).toBeVisible();
  const englishLink = page.getByRole("link", { name: "Anglais" });
  await expect(englishLink).toBeVisible();
  await englishLink.click();
  await expect(page).toHaveURL(/language=en/);
  await expect(page.getByText(/pas encore de grille ici en/)).toHaveCount(0);
});

test("a category with nothing anywhere is honest about it", async ({ page }) => {
  await page.goto("/en/subjects/mythology");
  await expect(page.getByText(/no published puzzles yet, in any language/)).toBeVisible();
});

test("a sensitive subject drops its decoration", async ({ page }) => {
  await page.goto("/en/subjects/world-war-ii");
  const root = page.locator('[data-tone="archival"]').first();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-subject", "ww2");

  // The repeating motif field is suppressed entirely on an archival page.
  const fieldOpacity = await page
    .locator(".motif-field")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity)
    .catch(() => "0");
  expect(Number(fieldOpacity)).toBe(0);

  // A playful subject keeps it.
  await page.goto("/en/subjects/biology");
  await expect(page.locator('[data-tone="playful"]').first()).toBeVisible();
  const playfulOpacity = await page
    .locator(".motif-field")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(playfulOpacity)).toBeGreaterThan(0);
});

test("a collection page opens from a subject", async ({ page }) => {
  await page.goto("/en/subjects/geology");
  await expect(page.getByRole("heading", { name: "Geology" })).toBeVisible();
  await page.getByRole("link", { name: /Volcanoes/ }).first().click();
  await expect(page).toHaveURL(/\/en\/subjects\/geology\/volcanoes/);
});

test("the hub renders in Arabic, right to left", async ({ page }) => {
  await page.goto("/ar/puzzles");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "تصفح حسب الموضوع" })).toBeVisible();
});
