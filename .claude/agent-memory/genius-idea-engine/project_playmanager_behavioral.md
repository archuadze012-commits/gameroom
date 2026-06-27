---
name: playmanager-behavioral
description: PlayManager behavioural attribute layer — 6 attrs (composure/vision/stamina/positioning/aggression/consistency)
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager players have a behavioural layer separate from the rating layer (migration `20260705_playmanager_behavioral.sql`, APPLIED 2026-06-27). `pm_players.behavioral jsonb` (default '{}').

**6 attrs (1–99):** composure(სიმშვიდე)←SHO+TAC · vision(ხედვა)←PAS+DRI · stamina(გამძლეობა)←PHY+PAC−age · positioning(პოზიციონირება)←TAC+DEF/SHO by role · aggression(აგრესია)←PHY+DEF · consistency(სტაბილურობა)←talent+TAC. Backfilled from ovr_current with card_stats deltas + ovr fallback, so EVERY player has values (unlike traits which need real card_stats).

**Match hook:** `pm_match_player_events` reads `behavioral->>'consistency'` → damps each player's match-rating variance: `(random()-0.5)*0.6*(1 - consistency/100*0.6)`. Steady players swing less week-to-week.

**TS:** `src/lib/playmanager/behavioral.ts` (BEHAVIORAL_META, getBehavioral, behavioralTone). Player page shows "ქცევითი პროფილი" section (bars). Type: player page PlayerRow.behavioral.

**Limitation:** behavioral is backfilled, NOT recomputed on stat edits (the pm_players_sync_card_stats trigger sets tac but not behavioral) → can go stale after admin OVR/stat edits. Recompute-on-edit is a future enhancement.

Related: [[playmanager-tac-attribute]], [[playmanager-traits]], [[playmanager-match-player-events]], [[playmanager-match-v2-vision]].
