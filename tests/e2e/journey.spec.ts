import { expect, test } from "@playwright/test";
import { E2E_TEST_PASSWORD } from "../../playwright.config";

/**
 * Covers the main journey end to end against a real server, using small
 * fixture files (tests/e2e/fixtures/media) instead of Varunika's real
 * private photos/videos.
 *
 * The fixture video/photo files are NOT real decodable media (see the
 * project README) — so this suite verifies the player's error-handling UI
 * for the video rather than claiming real playback succeeded. Everything
 * else (auth, browsing, search, My List, the letter, the Easter egg, end
 * credits, and resume-progress rendering) is exercised for real.
 */

test("full visitor journey", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/intro$/);

  // --- Intro ---
  await page.getByRole("button", { name: "Skip Intro" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // --- Password gate ---
  const passcodeInput = page.getByLabel("Birthday passcode");
  await passcodeInput.fill("definitely-the-wrong-passcode");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText(/not quite it/i);

  await passcodeInput.fill(E2E_TEST_PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/profiles$/);

  // --- Profile selection ---
  await page.getByRole("button", { name: /varunika/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Our Favourite Memories" })).toBeVisible();

  // --- Search ---
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search your memories").fill("campus");
  const searchResult = page.getByRole("link", { name: /campus day/i });
  await expect(searchResult).toBeVisible();
  await searchResult.click();

  // --- Title detail + My List ---
  await expect(page).toHaveURL(/\/title\//);
  await expect(page.getByRole("heading", { name: /campus day/i })).toBeVisible();
  await page.getByRole("button", { name: "My List" }).click();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("region", { name: "My List" }).getByText("campus day")).toBeVisible();

  // --- Video playback attempt (fixture is not a real decodable video) ---
  const featuredCard = page.getByRole("button", { name: /the birthday edit — open details/i });
  await featuredCard.hover();
  await featuredCard.getByRole("button", { name: /play the birthday edit/i }).click();
  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  const watchUrl = page.url();
  const mediaId = watchUrl.split("/watch/")[1];

  // --- Resume-progress rendering (seeded directly, since the fixture can't really play) ---
  // Navigation below uses real in-app links/buttons rather than page.goto(),
  // deliberately: a goto() is a full page load, which would re-trigger the
  // mandatory intro (by design — see introState.ts) and break the flow here.
  await page.evaluate((id) => {
    localStorage.setItem(
      "varunika:progress",
      JSON.stringify({ [id]: { seconds: 30, duration: 120, updatedAt: new Date().toISOString() } })
    );
  }, mediaId);
  await page.getByRole("link", { name: "Back to details" }).click(); // watch -> title (the error overlay covers the top-bar Back link)
  await expect(page).toHaveURL(/\/title\//);
  await page.getByRole("button", { name: "Back" }).click(); // title -> home
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Nothing in progress yet")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Continue Watching" })).toBeVisible();

  // --- Easter egg (logo is a real link to /home now — BUG-02 — and still
  // counts toward the Easter egg since AppShell, which owns the click-burst
  // counter, doesn't remount for same-page navigations) ---
  const logo = page.getByRole("link", { name: /click repeatedly for a surprise/i });
  for (let i = 0; i < 5; i++) {
    await logo.click();
  }
  await expect(page.getByRole("dialog", { name: "Secret found" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  // --- End credits ---
  await page.getByRole("button", { name: /profile menu/i }).click();
  await page.getByRole("menuitem", { name: "End Credits" }).click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(page.getByRole("heading", { name: "THE END?" })).toBeVisible();
  await page.getByRole("button", { name: "Exit" }).click(); // credits -> home
  await expect(page).toHaveURL(/\/home$/);

  // --- Intro must NOT have replayed during any of the client-side navigation above ---
  await expect(page).not.toHaveURL(/\/intro$/);

  // --- Sign out ---
  await page.getByRole("button", { name: /profile menu/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // --- A fresh page load (refresh) after sign-out must replay the intro ---
  await page.reload();
  await expect(page).toHaveURL(/\/intro$/);
});
