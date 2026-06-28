---
name: playmanager-pending-migrations
description: PlayManager migrations — status (both prior pending migrations are now APPLIED)
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f87508e-95e5-4b85-9ea4-b6f056f6a8ff
---

**RESOLVED (2026-06-28 session).** The two previously-pending migrations are now LIVE on the Supabase DB:
- `20260628_playmanager_player_tac.sql` — TAC attribute: **applied** (tac column + pm_player_compute_tac + trigger + backfill all live). Since then TAC was made **trainable** — see [[playmanager-tac-attribute]].
- `20260627_playmanager_match_engine_tactical_depth.sql` — tactical rebalance (style matchup/fit, defensive-line risk): **applied** (v_style_matchup etc. live in pm_team_match_profile / pm_simulate_league_round).

Many further migrations also shipped after them (traits, position-fit, auto-subs, stadium, behavioral, skill/weak-foot, psychologist niche, career-end, divisions) up to `20260709_*`, plus this session's `20260628e–m` (see [[playmanager-development-system]]).

**Migration runner:** apply via `DATABASE_DIRECT_URL` with `postgres` + `sql.unsafe(file)` (pgbouncer pooler can't parse dollar-quoted function bodies). Editing a live big function = dump `pg_get_functiondef`, patch, re-apply as `create or replace`. No deferred migrations outstanding.
