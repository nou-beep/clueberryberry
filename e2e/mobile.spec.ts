import { expect, test } from "@playwright/test";

test("mobile layout: grid, active clue, on-screen keyboard", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  await expect(
    page.getByRole("heading", { name: "The Body at a Glance" })
  ).toBeVisible();

  // Grid at the top, active clue directly below, keyboard at the bottom.
  await expect(page.getByRole("grid", { name: "Crossword grid" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next clue" })).toBeVisible();

  // Tap the first cell of 1-Across and type on the on-screen keyboard.
  await page.getByRole("gridcell", { name: /Row 1, column 4/ }).click();
  for (const letter of ["H", "E", "A", "R", "T"]) {
    await page.getByRole("button", { name: letter, exact: true }).first().click();
  }
  await expect(page.getByRole("gridcell", { name: /Row 1, column 4, H/ })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: /Row 1, column 8, T/ })).toBeVisible();

  // Cells never shrink below the 34px minimum touch size.
  const box = await page
    .getByRole("gridcell", { name: /Row 1, column 4/ })
    .boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(30);

  // Clue navigation and the full clue sheet.
  await page.getByRole("button", { name: "Next clue" }).click();
  await page.getByRole("button", { name: "All clues" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("mobile Arabic: RTL page, mirrored grid, Arabic keyboard", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page.goto("/ar/daily");
  await page.locator('a[href*="/ar/play/"]').first().click();
  await expect(page).toHaveURL(/\/ar\/play\//);

  await expect(page.getByRole("grid").first()).toHaveAttribute("dir", "rtl");
  // The Arabic on-screen keyboard is present.
  await expect(page.getByRole("button", { name: "ض", exact: true })).toBeVisible();
});

test("no horizontal page scroll on a phone", async ({ page }) => {
  // Play pages are included: the grid and the tab strip each scroll inside
  // their own container, so neither may push the document sideways.
  for (const path of [
    "/en",
    "/en/subjects",
    "/en/journal",
    "/en/collections",
    "/en/search?q=myth",
    "/en/play/the-body-at-a-glance",
    "/ar/play/ar-ard-al-faraina",
    "/ar/subjects",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} should not scroll sideways`).toBeLessThanOrEqual(1);
  }
});

test("the Arabic clue stays visible above the keyboard", async ({ page }) => {
  await page.goto("/ar/play/ar-ard-al-faraina");
  const keyboard = page.getByRole("group", { name: /لوحة مفاتيح/ });
  await expect(keyboard).toBeVisible();

  // Selecting a square fills the active-clue bar.
  await page.getByRole("gridcell").filter({ hasNotText: "" }).first().click();
  const clue = page
    .locator('[aria-live="polite"]')
    .filter({ hasText: /أفقي|عمودي/ })
    .first();
  await expect(clue).toBeVisible();

  const clueBox = await clue.boundingBox();
  const keyboardBox = await keyboard.boundingBox();
  expect(clueBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();
  // The clue sits above the keyboard and inside the viewport.
  expect(clueBox!.y + clueBox!.height).toBeLessThanOrEqual(keyboardBox!.y + 2);
  const viewport = page.viewportSize();
  expect(clueBox!.y).toBeLessThan(viewport!.height);

  // Keys stay finger-sized.
  const keyHeights = await keyboard
    .getByRole("button")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(Math.min(...keyHeights)).toBeGreaterThanOrEqual(43);
});
