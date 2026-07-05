import { defineConfig, devices } from "@playwright/test";

// Config for the OPT-IN authenticated PlayManager flows (e2e/playmanager-flows.spec.ts).
// Unlike the auth-free smoke (playwright.config.ts, which runs `next start` with a
// fast-fail Supabase), these need a real backend AND `next dev` — development mode
// is what enables the /playmanager auth-bypass (getDevelopmentFallbackTeam → oldest
// seeded team), so the flows run without a login handshake.
//
// Provide the dev/branch Supabase via env (the nightly workflow maps repo secrets):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// and set E2E_PLAYMANAGER=1. See e2e/README.md.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "playmanager-flows.spec.ts",
  fullyParallel: false, // shared seed — serialise to avoid mutation races
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 60_000, // real Supabase round-trips are slower than the static smoke
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `next dev` (not start) so NODE_ENV=development enables the auth-bypass.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Supabase creds come from the ambient env (secrets in CI); next dev reads
    // NEXT_PUBLIC_* at runtime, so no rebuild is needed per run.
    env: {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "placeholder-vapid-key",
    },
  },
});
