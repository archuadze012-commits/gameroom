# PlayManager — Design Document
_2026-06-13_

## Overview

Browser-based online football manager game in Georgian, accessible at `/playmanager`.  
Stack: Next.js App Router + Supabase (DB/Auth/Realtime) + PixiJS (match presentation only).  
All game authority lives server-side; PixiJS is a pure presentational layer.

---

## 1. Data Model (core tables, prefix `pm_`)

| Table | Key columns |
|---|---|
| `pm_players` | `id`, `normalized_name` UNIQUE, `display_name`, `is_real` bool, `talent` 1–10, `ovr_base`, `ovr_current`, `age`, `born_season`, `retired_at`, `owner_id` (nullable), `fatigue` 0–100, `status` (active/injured/retired) |
| `pm_teams` | `id`, `user_id` UNIQUE, `name`, `division_id`, `budget_pm` (PM₾ balance) |
| `pm_wallets` | `team_id`, `balance` | ledger: `pm_transactions` |
| `pm_squads` | `team_id`, `player_id`, `position`, `shirt_number` |
| `pm_transfers` | `id`, `player_id`, `seller_id`, `type` (listing/auction/free-agent), `price`, `expires_at`, `status` |
| `pm_seasons` | `id`, `division_id`, `started_at`, `ended_at` |
| `pm_fixtures` | `id`, `season_id` nullable, `cup_id` nullable, `home_team_id`, `away_team_id`, `scheduled_at`, `status`, `result_home`, `result_away` |
| `pm_match_events` | `fixture_id`, `minute`, `type` (goal/chance/card), `player_id`, `team_id` |
| `pm_divisions` | `id`, `name`, `level` |
| `pm_cups` | `id`, `name`, `type` (daily/seasonal), `bracket` JSONB |
| `pm_packs` | `id`, `name`, `cost_pm`, `cost_coins` nullable, `rarity_weights` JSONB |
| `pm_pack_openings` | `id`, `team_id`, `pack_id`, `players_received` JSONB, `opened_at` |
| `pm_real_drops` | `id`, `player_id`, `auction_start`, `auction_end`, `highest_bid`, `winner_team_id` |

---

## 2. Player Lifecycle

### Age & Career
- Real-world 3 months = full career (age 18 → 40).
- Cron runs every ~4 days: increments age by 1 year for all active players.
- At age 40: player retires → `status = retired`, `owner_id = null`.

### OVR Growth
- Talent caps total OVR gain: T10=+25, T9=+20, T8=+15, T7–1 = `talent × 2 + 1` (T7=+15, T1=+3).
- Growth rate ∝ talent: T10 reaches peak in ~10 in-game years, T1 in ~18.
- Sources: match minutes played (primary), training (secondary, max once/day).
- Peak age ~27, decline starts ~33 (−0.5 OVR/year after peak).

### Uniqueness
- `normalized_name` = `lower(trim(display_name))` (diacritics stripped, Jokic → jokic).
- UNIQUE constraint enforced at DB level.
- Virtual player names generated from Georgian/international name pool with collision check.

### Fatigue
- Each match: fatigue += `16 - talent` (T1=+15%, T10=+5%, linear).
- Effective OVR in match = `ovr_current × (1 − fatigue/200)` (max −50% at 100%).
- Fatigue > 80% → injury risk 10% per match.
- Recovery: cron −5%/day while not playing.

---

## 3. Acquisition Systems

### Packs
- Virtual players only in packs (rarity-weighted talent distribution).
- PM₾ packs (grindable) and optional premium packs (site coins).
- Pack opening reveals 3–5 players; each checked against `normalized_name` uniqueness; collision → replaced with fresh virtual.

### Free Agents
- Released/retired players (real and virtual) with available `owner_id = null`.
- Signed for a weekly salary (deducted from team wallet by cron).

### Transfer Market
- Any team can list a player with buy-now price or open bids.
- 24h listing; highest bid wins; PM₾ escrow on bid.

### Real Player Rotational Drops
- Weekly cron releases a batch of real players (including regen) to `pm_real_drops`.
- Each drop is a 24h auction open to all managers simultaneously.
- Regen: retired real player returns as 18yo with fresh OVR base, same talent.

---

## 4. Economy

**PM₾ (PlayManager Lari)** — isolated from site coins.

| Income | Expense |
|---|---|
| Match win/draw reward | Pack purchase |
| League final standings prize | Transfer bid / buy |
| Cup prize money | Player salary (weekly, cron) |
| Daily login bonus | Friendly match fee |
| Transfer listing sale | Training facility upgrade (future) |

---

## 5. Competition

### League
- Season starts on the 1st of each real-world month.
- 10 teams per division, round-robin (home + away = 18 matchdays).
- Matchday resolved by cron daily.
- Top 2 promoted, bottom 2 relegated; new teams enter Division 1 (lowest).

### Daily Cup
- 8-team knockout; brackets filled by matchmaking (team strength level).
- Opens and starts immediately when 8 teams registered.
- New brackets rotate throughout the day; multiple per day possible.
- Prize: PM₾ + cup point (leaderboard).

### Friendly
- On-demand, challenger pays fee; result does not affect league/cup.
- Fatigue still applies.

---

## 6. Match Engine

**Server-side deterministic simulation** (no client trust):

1. Calculate effective OVR per team: `sum(starter_effective_ovr) × tactic_multiplier`.
2. Seed = `fixture_id + timestamp_floor_5min` (reproducible).
3. Generate event timeline: goals, chances, cards distributed probabilistically by OVR delta.
4. Persist `pm_match_events`; update `pm_fixtures` result.
5. Apply fatigue delta to all participants.
6. Distribute rewards.

**PixiJS layer** (presentation only):
- 5 min before `scheduled_at`: countdown timer scene.
- On match completion: results screen — score, goal minute markers, MOTM card.
- No physics, no realtime player movement in MVP.

---

## 7. Routes (under `/playmanager`)

| Route | Description |
|---|---|
| `/playmanager` | Dashboard: team overview, next fixture, wallet |
| `/playmanager/squad` | Squad management, lineup builder |
| `/playmanager/transfers` | Market listings + free agents |
| `/playmanager/packs` | Pack shop |
| `/playmanager/drops` | Weekly real-player auction |
| `/playmanager/league` | Division table + fixtures |
| `/playmanager/cups` | Active daily cup brackets |
| `/playmanager/match/[id]` | PixiJS countdown + results scene |
| `/playmanager/player/[id]` | Player profile + stats |

---

## 8. MVP Phases

| Phase | Scope |
|---|---|
| 1 | Schema migrations, PM₾ wallet, team creation, virtual player generation pool, starter pack (free) |
| 2 | Pack shop, free agents, transfer market |
| 3 | Match engine (simulation), friendly, PixiJS countdown + results screen |
| 4 | League system (monthly season start cron), daily cups |
| 5 | Rotational real-player drops + auction, regen system |
| 6 | OVR development/training, fatigue/injury system, leaderboards |

---

## 9. Key Constraints

- Real player names: curated list in DB seed; no external API dependency in MVP.
- Match simulation must be idempotent (same seed → same result on replay).
- All financial operations go through ledger (debit + credit rows); no direct balance mutation.
- PixiJS bundle loaded lazily (dynamic import) only on `/playmanager/match/[id]`.
