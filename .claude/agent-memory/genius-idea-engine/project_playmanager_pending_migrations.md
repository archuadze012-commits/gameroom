---
name: playmanager-pending-migrations
description: Status of PlayManager engine/TAC/talent migrations — all applied as of 2026-06-26
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f87508e-95e5-4b85-9ea4-b6f056f6a8ff
---

**All applied to the live Supabase DB (2026-06-26 session).** No PlayManager migrations are pending. History:

- `20260627_playmanager_preserve_real_ea_ovr.sql` — APPLIED. Locks real EA-FC players to their ea_fc_ovr.
- `20260627_playmanager_match_engine_tactical_depth.sql` — APPLIED. Big match-engine tactical rebalance (style matchup, style-fit, defensive-line risk/reward, TAC style-execution hook). Changes live match results. See [[playmanager-match-v2-vision]].
- `20260628_playmanager_player_tac.sql` — APPLIED. TAC attribute (`tac` column + compute fn + trigger + backfill). See [[playmanager-tac-attribute]].
- `20260629_playmanager_talent_classes.sql` — APPLIED. Talent Classes overhaul: talent range 1→12, `pm_player_talent_class()` + `pm_player_talent_class_age_offset()` helpers, growth cap legend=+34, and `pm_advance_time` rebuilt with class-aware decay thresholds (pro 31/35 … legend 36/40). See [[playmanager-talent-classes]].

**2026-06-27 mega-overhaul batch — ALL APPLIED to the remote Supabase** (see [[playmanager-overhaul-session]] for full detail):
- `20260630` position-fit · `20260701` auto-subs · `20260702` traits · `20260703` stadium · `20260704` match-player-events · `20260705` behavioral · `20260706` skill/weak-foot · `20260707` psychologist-niche + lineup-formation · `20260708` career-end · `20260709` divisions-locked. Plus one-time data ops (cups wipe + AI-team delete).

**No pending migrations.** Code committed + pushed to origin/master (commit d46fb177).

**How to apply (future):** user is fine with applying migrations on explicit request ("2 მიგრაცია" → applied 3). Migrations hit the REMOTE Supabase (no local stack). Never auto-deploy without ask.
