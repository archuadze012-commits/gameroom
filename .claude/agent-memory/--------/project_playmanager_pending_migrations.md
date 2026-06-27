---
name: playmanager-pending-migrations
description: PlayManager migrations written this session but NOT yet applied to the DB (awaiting user consent)
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f87508e-95e5-4b85-9ea4-b6f056f6a8ff
---

Two PlayManager migrations are written + verified (tsc/eslint clean) but **NOT applied to the live Supabase DB** (per the no-deploy-without-explicit-request rule). End of 2026-06 session, awaiting the user's choice of which to apply:

- `20260628_playmanager_player_tac.sql` — the TAC attribute (safe/additive: `tac` column + compute fn + trigger + backfill). Deliberately **decoupled** (adds the `tac` column idempotently itself) so it can ship ALONE without the engine rebalance. See [[playmanager-tac-attribute]].
- `20260627_playmanager_match_engine_tactical_depth.sql` — the big match-engine tactical rebalance (style matchup, style-fit, defensive-line risk/reward + the TAC style-execution hook). Applying it **changes live match results**. The user repeatedly chose to **defer** this.

**Why:** the user wants to control when the engine rebalance goes live separately from shipping TAC. **How to apply:** offer to apply 20260628 alone (TAC live) or both together; never auto-apply. Related: [[playmanager-match-v2-vision]].
