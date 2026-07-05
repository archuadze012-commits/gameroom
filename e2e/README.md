# E2E (Playwright)

Two tiers:

- **`smoke.spec.ts` — auth-free, CI-runnable.** Boot, routing, render, the
  `/playmanager`→login redirect, static pages, and no-horizontal-overflow. Runs
  on both a desktop and a mobile (Pixel 5) project, so it doubles as responsive
  coverage. Needs **no real backend** — the build inlines a fast-refusing
  Supabase URL so `auth.getUser()` returns null immediately and the pages behave
  as an unauthenticated visitor.

- **`playmanager-flows.spec.ts` — authenticated screen smoke, opt-in.** Market,
  lineup, cups, matchday, mobile nav render for a logged-in manager. Skipped
  unless `E2E_PLAYMANAGER=1`.

## Run the smoke locally

```bash
# NEXT_PUBLIC_* are inlined at build time, so build with the fast-fail URL:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9999 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=x NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
NEXT_PUBLIC_VAPID_PUBLIC_KEY=x SUPABASE_SERVICE_ROLE_KEY=x \
npm run build

npx playwright install chromium   # once
npm run test:e2e
```

(CI does the same in the `e2e` job — see `.github/workflows/ci.yml`.)

## Run the authenticated flows

These need a manager with a team, so point the app at a **dev Supabase with
seeded data**. Easiest path — `next dev` auth-bypasses `/playmanager` in
development and uses the oldest team (`getDevelopmentFallbackTeam`):

```bash
# terminal 1 — real dev Supabase env in .env.local
npm run dev

# terminal 2
E2E_PLAYMANAGER=1 npx playwright test e2e/playmanager-flows.spec.ts \
  --project=desktop
```

To instead run as a specific logged-in user, capture a storage state
(`npx playwright codegen` → sign in → save `e2e/.auth/user.json`) and add
`storageState: 'e2e/.auth/user.json'` to the project `use` in
`playwright.config.ts`. `e2e/.auth/` is gitignored.
