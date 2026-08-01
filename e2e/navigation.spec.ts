import { expect, test } from "@playwright/test";

/**
 * The navigation contract, exercised in a real browser: five destinations, a
 * search overlay instead of a search page, and no Editor tab for players.
 * See docs/information-architecture.md.
 */

const DESTINATIONS = ["Home", "Puzzles", "Playground", "Rooms", "Profile"];

test("the desktop bar has exactly the five destinations", async ({ page }) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Main sections" }).first();
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(DESTINATIONS.length);
  for (const label of DESTINATIONS) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("no removed section is a top-level tab any more", async ({ page }) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Main sections" }).first();
  for (const gone of ["Search", "Archive", "Settings", "Journal", "Daily", "Editor"]) {
    await expect(nav.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
  }
});

test("every destination is reachable and marks itself current", async ({ page }) => {
  await page.goto("/en");
  for (const label of ["Puzzles", "Playground", "Rooms", "Profile"]) {
    const nav = page.getByRole("navigation", { name: "Main sections" }).first();
    await nav.getByRole("link", { name: label }).click();
    await page.waitForLoadState("domcontentloaded");
    // Landing on the page is the point; a 404 would fail the aria-current check.
    await expect(
      page
        .getByRole("navigation", { name: "Main sections" })
        .first()
        .getByRole("link", { name: label })
    ).toHaveAttribute("aria-current", "page");
  }
});

test("a puzzle detail page keeps the Puzzles tab lit", async ({ page }) => {
  await page.goto("/en/subjects/biology");
  await expect(
    page
      .getByRole("navigation", { name: "Main sections" })
      .first()
      .getByRole("link", { name: "Puzzles" })
  ).toHaveAttribute("aria-current", "page");
});

test("search is an overlay, not a page", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("/");

  const dialog = page.getByRole("dialog", { name: "Search" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("combobox").fill("egypt");
  await expect(dialog.getByRole("heading", { name: "Subjects" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Egyptian Mythology/ })).toBeVisible();

  // The URL never changed — search did not navigate anywhere.
  expect(new URL(page.url()).pathname).toBe("/en");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("search says so plainly when nothing matches", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search" });
  await dialog.getByRole("combobox").fill("zzzznothinghere");
  await expect(dialog.getByText(/Nothing matched/)).toBeVisible();
});

test("typing in a puzzle grid does not open search", async ({ page }) => {
  await page.goto("/en/play/the-body-at-a-glance");
  const cell = page.locator("input").first();
  await cell.click();
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog", { name: "Search" })).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows a five-item bottom bar that never scrolls sideways", async ({ page }) => {
    await page.goto("/en");
    const bars = page.getByRole("navigation", { name: "Main sections" });
    // Both bars are in the DOM; the visible one on mobile is the bottom bar.
    const bottom = bars.last();
    await expect(bottom).toBeVisible();
    await expect(bottom.getByRole("link")).toHaveCount(DESTINATIONS.length);

    const overflows = await bottom.evaluate(
      (el) => el.scrollWidth > el.clientWidth + 1
    );
    expect(overflows).toBe(false);
  });

  test("every bottom-bar target is comfortably tappable", async ({ page }) => {
    await page.goto("/en");
    const links = page.getByRole("navigation", { name: "Main sections" }).last().getByRole("link");
    for (let i = 0; i < DESTINATIONS.length; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box, DESTINATIONS[i]).not.toBeNull();
      expect(box!.height, DESTINATIONS[i]).toBeGreaterThanOrEqual(44);
      expect(box!.width, DESTINATIONS[i]).toBeGreaterThanOrEqual(44);
    }
  });
});
