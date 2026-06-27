---
name: playmanager-overhaul-session
description: "Master overview of the 2026-06-27 PlayManager mega-overhaul: ~20 features, architecture, git/DB/deploy state, pending work"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

# PlayManager mega-overhaul — session overview (2026-06-27)

One very long autonomous session delivered the full Match-v2 vision + player identity + economy/world systems for PlayManager. ~20 features, each DB + TS + UI + tests + memory. This file is the connective map; each feature has its own detailed memory (linked below).

## Features shipped (migration → one-liner)
1. **Position-fit** `20260630` — out-of-position starters penalised ×0.5–1.0; mirrors secondary-positions.ts. [[playmanager-position-fit]]
2. **Auto-subs** `20260701` — injured starters auto-replaced by best healthy bench (pre-match). [[playmanager-auto-subs]]
3. **Traits** `20260702` — 8 behavioural specialisms bonus match lanes; admin editor to assign. [[playmanager-traits]]
4. **100k stadium** `20260703` — capacity = arena facility level (22k–100k); attendance = demand×capacity. [[playmanager-stadium]]
5. **Scouting report** — market module: squad positional deficit analysis (pure TS). [[playmanager-office-scouting]]
6. **Goalscorers + match ratings** `20260704` — per-goal scorer + 5.0–10.0 player ratings in result. [[playmanager-match-player-events]]
7. **Behavioural attrs** `20260705` — composure/vision/stamina/positioning/aggression/consistency; consistency damps rating variance. [[playmanager-behavioral]]
8. **Skill-moves + weak-foot** `20260706` — EA-style 1–5 stars. [[playmanager-skill-weakfoot]]
9. **Psychologist niche + formation persistence** `20260707` — form-scaled morale; lineup saves slot→pm_squads.position. [[playmanager-psych-formation]]
10. **Form feed + scout reveal** — ratings nudge morale; scout staff gates hidden-attr reveal on player page. [[playmanager-formfeed-scout]]
11. **Academy youth development** — prospects mature toward potential over time (academy level + talent). [[playmanager-academy]]
12. **Fitness/risk module** — medical squad fatigue/injury analysis. [[playmanager-fitness]]
13. **Daily/activity reward** — pm_engagement streak (cap 7, 22k–64k). [[playmanager-daily-reward]]
14. **Free agents** — was 99% pre-built, activated + class/division gated. [[playmanager-free-agents]]
15. **Career-end system** `20260708` — REPLACED contracts: age-based (32–42 by class), renew ½ / release ⅓, auto-resolve; legend→admin pack, world_class/rising_star→free agents. [[playmanager-career-end]]
16. **Divisions/AI reset** `20260709` — divisions=leagues (L1=A…L4=D), registration locked, new teams→D; AI teams + cups WIPED. [[playmanager-divisions-reset]]

Earlier same-arc work (prior sessions): talent classes [[playmanager-talent-classes]], TAC [[playmanager-tac-attribute]], match-v2 vision [[playmanager-match-v2-vision]].

## Cross-cutting architecture
- **Match sim** `pm_simulate_league_round(team)` → calls `pm_team_match_profile(team)` (builds effective XI: auto-subs + position-fit + trait bonuses + behavioural, returns lanes + stats + autoSubs + traits + positionFit) → computes xG with tactics/style-fit/TAC → `pm_match_player_events` (goalscorers + ratings, mutates morale) → returns rich `matchEngine` JSONB. Re-applied MANY times this session (each feature touching it); current authoritative version = `20260708`/`20260707` sim body.
- **Time engine** `pm_advance_time` (aging/decay) + `advancePlayManagerTime` (TS) also calls `pm_develop_academy_prospects` + `pm_process_career_ends` each advance.
- **TS mirrors DB**: talent.ts, secondary-positions.ts, traits.ts, behavioral.ts, economy.ts (getStadiumCapacity) MUST stay synced with their DB function counterparts.
- Match modal `MatchEngineBadge` (playmanager-matchday-page.tsx) surfaces xG/tactics/traits/autoSubs/goalscorers/ratings/positionFit. Player page shows TAC/talent-class/traits/behavioural/skill-weak-foot/career panel.

## ⚙️ OPERATIONAL STATE — git / DB / deploy (critical)
- **DB: all migrations + destructive ops were applied to the LIVE REMOTE Supabase** via the Supabase MCP (NOT a local DB — there is no local supabase stack / no config.toml). This includes the one-time DELETIONS: wiped pm_cup_matches/participants/instances + deleted all is_bot teams (their players → owner_id null free agents). Free-agent pool ≈16,105.
- **Code: committed to `master` and PUSHED to origin** (`origin/master`, commit `d46fb177`, ~38 commits ahead pushed 2026-06-27). Path: work was committed on branch `claude/pm-match-v2-economy`, fast-forward merged into master, then `git push origin master`. The session worktree branch `claude/interesting-blackwell-011da6` was EMPTY (do not use the IDE "Create PR" button — it targets that empty branch).
- **Deploy:** pushing master may have triggered a Vercel production deploy (if master is connected). User accepted this.
- **Local dev = remote DB:** `.env.local` `NEXT_PUBLIC_SUPABASE_URL` → remote `…supabase.co`. So `npm run dev` locally runs against the remote DB that holds all our work. No local Supabase. (User chose "Path A".)
- **.gitignore** extended: Unity `Library/`/`My project*/`, `*.log`, root one-off scripts (find_actions*.js, fix_page.js), `.tmp/`, `meshy_output/`, `.codex_tmp*`, local `.claude/` agent config + settings.local.json. Untracked previously-tracked dev logs.
- **Git LFS recommended (not done):** 3 files >50MB pushed with warnings — `public/playmanager/models/meshy/stadium.glb` (87MB), `public/playmanager/models/city_environment.glb` (51MB), `public/playmanager/models/meshy/emerald-tower/emerald-tower.bin` (60MB).

## Pending / not built (excluded or future)
- **Legendary curated icons (Pelé/Messi packs)** — EXPLICITLY EXCLUDED by user.
- **Legend repack admin UI** — non-renewed legends get `pending_repack=true`; admin queries `where pending_repack=true`, no UI yet.
- **Full multi-division league** — promotion/relegation across divisions + registration UI/flow. Divisions + registration_open flag exist (locked); league sim STILL uses 3 hardcoded STRING opponents (North London/Royal Madrid/Milano Black), not real teams. PvP not built.
- **Office "rights/permissions"** — underspecified, not built.
- **Other planned modules:** missions, head-to-head, recovery/injuries (fitness covers risk), capacity/hotel, euro_cups, championships.
- **Git LFS** for the large .glb/.bin model files.

## Conventions reaffirmed this session
- Migrations OK to apply on explicit request; but they hit the REMOTE DB. No git commit/push without explicit ask (user asked here). No Co-Authored-By trailer (project rule).
