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

These need a manager with a team, so point the app at a **dev / preview-branch
Supabase with seeded data — never production, since the flows mutate state**.
`next dev` auth-bypasses `/playmanager` in development and renders for the oldest
team (`getDevelopmentFallbackTeam`), so no login handshake is needed.

```bash
# real dev Supabase creds in .env.local (URL + anon key + service-role key)
E2E_PLAYMANAGER=1 npm run test:e2e:auth
```

`playwright.auth.config.ts` starts `next dev` for you and serialises the run
(workers: 1) so mutations don't race on the shared seed.

To instead run as a specific logged-in user, capture a storage state
(`npx playwright codegen` → sign in → save `e2e/.auth/user.json`) and add
`storageState: 'e2e/.auth/user.json'` to the project `use`. `e2e/.auth/` is
gitignored.

## Nightly CI (`.github/workflows/e2e-nightly.yml`)

Runs the authenticated flows on a 03:00 UTC schedule (and on manual dispatch).
It is **skip-by-default**: with no backend secret set it exits green without
running, so it never shows red on an unprovisioned repo. To activate, add three
repo secrets pointing at a **dev or preview-branch** project (NOT production):

| secret | value |
| --- | --- |
| `E2E_SUPABASE_URL` | dev project URL (`https://<ref>.supabase.co`) |
| `E2E_SUPABASE_ANON_KEY` | that project's anon key |
| `E2E_SERVICE_ROLE_KEY` | that project's service-role key |

The dev project must have at least one seeded `pm_teams` row (the bypass uses the
oldest). For fully isolated runs, provision a fresh Supabase branch per night,
seed it, and map its keys to those secrets. This repo has only a production
project today, which is why the job ships dormant.
