import { test, expect } from "@playwright/test";

// Tier 2 — authenticated PlayManager screen smoke. These need a logged-in
// manager with a team, so they're OPT-IN: set E2E_PLAYMANAGER=1 and run against
// an app that can reach a real (dev) Supabase with seeded data. Two ways in:
//   • `next dev` against a dev Supabase — /playmanager auth-bypasses in
//     development and uses the oldest team (getDevelopmentFallbackTeam), or
//   • provide a logged-in storage state (see e2e/README.md).
// Without E2E_PLAYMANAGER these are skipped so the default smoke stays backend-free.
//
// They assert the critical screens RENDER for a manager (Codex's "smoke", not a
// full mutation E2E) — market, lineup/arena, cups, matchday, and mobile nav.

const enabled = process.env.E2E_PLAYMANAGER === "1";

test.describe("PlayManager authenticated screens", () => {
  test.skip(!enabled, "set E2E_PLAYMANAGER=1 with a dev Supabase to run these");

  test("home / office loads with the bottom nav", async ({ page }) => {
    await page.goto("/playmanager");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    // Bottom nav is the primary mobile navigation surface.
    await expect(page.getByRole("link", { name: /მთავარი/ })).toBeVisible();
  });

  test("transfer market renders with player cards", async ({ page }) => {
    await page.goto("/playmanager/market?module=transfer_market");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("body")).toContainText(/ბაზ|მარკეტ|ტრანსფერ/);
  });

  test("lineup / arena screen loads", async ({ page }) => {
    await page.goto("/playmanager/arena/lineup");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("cups list loads", async ({ page }) => {
    await page.goto("/playmanager/cups");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("body")).toContainText(/თას/);
  });

  test("matchday / arena loads", async ({ page }) => {
    await page.goto("/playmanager/arena");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("mobile bottom nav is present and links to core sections", async ({ page }) => {
    await page.goto("/playmanager");
    // The bottom-nav primary tabs (see playmanager-bottom-nav.tsx).
    for (const label of [/მთავარი/, /მატჩი/, /გუნდი/, /მარკეტი/]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });
});
