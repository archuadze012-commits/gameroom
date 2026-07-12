import { test, expect } from "@playwright/test";

// Auth-free smoke: boot, routing, render, and the auth redirect — runs against a
// production `next start` with placeholder Supabase env (an unauthenticated
// visitor), so it needs no real backend and is safe for CI. Runs on both the
// desktop and mobile projects, so it doubles as responsive-render coverage.

test("home page renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page).toHaveTitle(/PLAYGAME/i);
  await expect(page.locator("body")).toBeVisible();
});

test("login page renders the sign-in entry or fallback warning", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(
    page.getByText(/Google-ით შესვლა|Supabase env ცვლადები არ არის დაყენებული/i)
  ).toBeVisible();
});

test("unauthenticated /playmanager redirects to login", async ({ page }) => {
  await page.goto("/playmanager");
  await expect(page).toHaveURL(/\/auth\/login/);
  // The redirect preserves the intended destination.
  await expect(page).toHaveURL(/next=%2Fplaymanager|next=\/playmanager/);
});

test("unauthenticated deep PlayManager routes also redirect", async ({ page }) => {
  for (const path of ["/playmanager/arena", "/playmanager/search", "/playmanager/leaderboard"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth\/login/);
  }
});

test("static public pages load", async ({ page }) => {
  for (const path of ["/terms", "/privacy"]) {
    const response = await page.goto(path);
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  }
});

test("page has no horizontal overflow at this viewport", async ({ page }) => {
  await page.goto("/auth/login");
  // A common mobile regression: content wider than the viewport. Allow a 1px
  // rounding slack.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
