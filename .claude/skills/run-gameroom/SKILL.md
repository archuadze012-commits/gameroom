---
name: run-gameroom
description: Build, run, screenshot, and smoke-test the Gameroom Next.js app. Use when asked to start Gameroom, run the dev server, screenshot a page, verify that pages render, or deploy to Vercel.
---

Gameroom is a Next.js 16 + Supabase web app. Two drivers live next to this file:

- **`smoke.mjs`** — spawns `npm run dev` (or reuses an existing server), polls until ready, then `fetch`-s every key route and reports pass/fail. Pure Node, no extra deps. Cross-platform (Windows + Linux container).
- **`screenshots.mjs`** — same routes, full-page PNGs via headless Chromium. Requires Playwright + Chromium installed (one-time setup below).

All paths below are relative to the repo root.

## Prerequisites

- Node ≥ 20 (declared in `package.json#engines`).
- A populated `.env.local` (Supabase URL + anon/service keys, VAPID, etc.). Some routes (`/messages`, `/settings`, `/feed`) return `307 → /auth/login` without a session — that's expected.
- For screenshots only: Chromium via Playwright:
  ```powershell
  npm install --no-save playwright@1.49.0
  npx --yes playwright@1.49.0 install chromium
  ```
  (`install chromium` downloads ~88 MiB to `%LOCALAPPDATA%\ms-playwright\` on Windows or `~/.cache/ms-playwright/` on Linux.)

## Setup

```powershell
npm install
```

## Build (optional — only needed before `npm run start` or to catch type errors locally)

```powershell
npm run build
```

Vercel runs this on every push; for local smoke testing, the dev server below is enough.

## Run (agent path)

### 1. Smoke test — verify every route serves

```powershell
node .claude/skills/run-gameroom/smoke.mjs
```

If a dev server is already on port 3000, the script reuses it; otherwise it spawns `npm run dev` and waits up to 60 s for readiness. To use an existing server explicitly:

```powershell
node .claude/skills/run-gameroom/smoke.mjs --no-spawn
```

Output (verified this session, against the running dev server):

```
[smoke] using existing server on :3000
[smoke] server ready, hitting 16 routes…

  ✓  200  /
  ✓  200  /forum
  ✓  200  /forum/general
  ✓  200  /forum/general/welcome
  ✓  200  /games
  ✓  200  /games/pubg-mobile
  ✓  200  /lfg
  ✓  200  /tournaments
  ✓  200  /announcements
  ✓  307  /messages         ← auth redirect (anonymous)
  ✓  307  /settings         ← auth redirect (anonymous)
  ✓  200  /search
  ✓  200  /leaderboard
  ✓  307  /feed             ← auth redirect (anonymous)
  ✓  200  /auth/login
  ✓  200  /auth/signup

[smoke] 16 pass, 0 fail
```

Exit codes: `0` all routes < 400, `1` one or more failed, `2` server never came up.

| flag | effect |
|---|---|
| `--port N` | use port N instead of 3000 |
| `--no-spawn` | error out if no server is already serving — don't fork `npm run dev` |

### 2. Screenshots — full-page PNGs of the redesigned pages

```powershell
node .claude/skills/run-gameroom/screenshots.mjs
```

Output → `.claude/skills/run-gameroom/shots/<slug>.png` (one per route, `home.png`, `forum.png`, `forum_general.png`, `games.png`, …).

Subset:

```powershell
node .claude/skills/run-gameroom/screenshots.mjs --only "/forum,/games,/"
```

| flag | effect |
|---|---|
| `--port N` | use port N |
| `--out DIR` | PNG output dir (default: `.claude/skills/run-gameroom/shots/`) |
| `--only "/a,/b"` | comma-separated route list — **quote it in PowerShell or use double-slash in Git Bash** (Git Bash MSYS rewrites a leading `/` to `C:\Program Files\Git\…`) |

The script logs `console --errors`-style output for any page that throws — surface those before declaring the run clean.

## Run (human path)

```powershell
npm run dev          # serves http://localhost:3000, blocks. Ctrl-C to stop.
```

Useless headless — for inspecting changes, open http://localhost:3000 in a real browser (`Start-Process "http://localhost:3000"` on Windows, `xdg-open http://localhost:3000` on Linux desktop). Use the agent path above for any automated verification.

## Deploy

The project is connected to Vercel + GitHub. Auto-deploy on push to `master`. Manual deploy:

```powershell
git push origin master                # GitHub webhook → Vercel
# or:
vercel --prod --yes                   # direct CLI deploy from current working tree
```

After deploy, live at https://gameroom.com.ge.

## Gotchas

- **Next.js 16 dropped `middleware.ts` — use `proxy.ts`.** Both files coexisting causes `Unhandled Rejection: Both middleware file "./src/middleware.ts" and proxy file "./src/proxy.ts" are detected` and the dev server *appears* to start (logs "Ready in 483ms") but exits with code 134 a moment later. Keep `src/proxy.ts` only; delete `src/middleware.ts`.
- **Hobby-tier Vercel cron limit.** `vercel.json` cron schedules must run ≤ daily. The hourly `0 * * * *` was rejected with `"Hobby accounts are limited to daily cron jobs"`. Use `0 0 * * *` (or upgrade plan).
- **Git Bash MSYS path translation.** `--only /forum,/games` becomes `--only C:/Program Files/Git/forum,/games`. Either quote the value, prefix with `//forum`, or run via PowerShell.
- **Type errors in moderation catch blocks.** `await moderateText(t).catch(() => ({ ok: true }))` loses the `reason?: string` property in the catch branch and Next's build worker fails. Use `.catch(() => ({ ok: true, reason: undefined as string | undefined }))`.
- **`/messages`, `/settings`, `/feed` are auth-gated.** Smoke counts the 307 redirect as pass — that's correct. Screenshots of those routes will capture the login page unless you wire a session cookie first.
- **Push notifications need VAPID keys.** Server-side push fires from `/api/lfg/[id]/join` and calls `web-push`. Without `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in `.env.local` the route returns 500 on join.
- **Service worker installability requires a `fetch` handler.** Chrome's "Install" pill won't appear until `public/sw.js` has at least one `self.addEventListener("fetch", …)` listener — even a pass-through. This is what the PWA install floater depends on.
- **Forum redesign expects Inter Tight + the `--gr-*` cluster.** They live in `src/app/globals.css` (`:root` `--gr-bg-0…`, `--gr-violet`, etc.) and `src/app/layout.tsx` (Inter Tight via `next/font/google`). Don't expect any hand-redesigned page to render correctly if those are missing — every cut-corner card, gradient border, and uppercase tracked heading reads from them.

## Troubleshooting

- **`EADDRINUSE :3000`** — a previous `npm run dev` is still alive. `taskkill /PID <pid> /F` (Windows) or `pkill -f "next dev"` (Linux). Or pass `--port 3001` to the smoke driver.
- **`page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL`** in `screenshots.mjs` — your route argument got rewritten by Git Bash. See Gotchas → MSYS path translation.
- **Playwright says `chromium executable doesn't exist`** — run `npx --yes playwright@1.49.0 install chromium` again; the browser cache lives outside `node_modules`.
- **`/forum` returns 500 with `Cannot find module '@/components/ui/eyebrow'`** — the v2 primitives weren't installed. `src/components/ui/{eyebrow,display-heading,gradient-text,chevron-button,percent-badge,pill,glow-dot,light-pillar,section-divider,diamond-accent,ribbon-tag,stat-tile,gradient-border,angular-card}.tsx` are all required.
- **First `nav` to a Next.js route takes ~10 s.** Next compiles routes on demand. The screenshot script's `waitUntil: "networkidle"` (30 s timeout) handles it; raw `sleep` won't.
