import { defineConfig, devices } from "@playwright/test";

// E2E config. The smoke suite (e2e/smoke.spec.ts) is auth-free and runs against a
// production `next start` with placeholder Supabase env — an unauthenticated
// visitor exercises boot, routing, render and the /playmanager→login redirect
// without needing a real backend. The authenticated PlayManager flows
// (e2e/playmanager-flows.spec.ts) are opt-in via E2E_AUTH_STORAGE (see e2e/README).
//
// Requires a prior `npm run build` (the webServer runs `next start`).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // A fast-refusing URL (not a bogus domain that hangs on DNS): auth.getUser()
      // fails immediately → null → the pages redirect to login as expected,
      // instead of the request hanging until timeout.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:9999",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "placeholder-vapid-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role",
    },
  },
});
