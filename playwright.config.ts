import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3001";
const e2eBaseUrl = `http://localhost:${e2ePort}`;

// E2E config. The smoke suite (e2e/smoke.spec.ts) is auth-free and runs against a
// production `next start` with placeholder Supabase env — an unauthenticated
// visitor exercises boot, routing, render and the /playmanager→login redirect
// without needing a real backend. The authenticated PlayManager flows
// (e2e/playmanager-flows.spec.ts) are opt-in via E2E_AUTH_STORAGE (see e2e/README).
//
// Requires a prior `npm run build` (the webServer runs `next start`).
export default defineConfig({
  testDir: "./e2e",
  // The authenticated flows have their own config (playwright.auth.config.ts) and
  // need a real backend — keep them out of the auth-free smoke run.
  testIgnore: "playmanager-flows.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `npm run start -- --port ${e2ePort}`,
    url: e2eBaseUrl,
    // Never attach auth-free smoke tests to a local `next dev` server: dev mode
    // intentionally bypasses PlayManager auth for the development experience.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // A fast-refusing URL (not a bogus domain that hangs on DNS): auth.getUser()
      // fails immediately → null → the pages redirect to login as expected,
      // instead of the request hanging until timeout.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:9999",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? e2eBaseUrl,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "placeholder-vapid-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role",
    },
  },
});
