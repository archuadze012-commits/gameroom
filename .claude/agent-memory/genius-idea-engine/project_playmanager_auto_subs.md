---
name: playmanager-auto-subs
description: PlayManager match engine — automatic pre-match substitutions for injured starters
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager match engine now auto-subs injured starters (migration `20260701_playmanager_auto_subs.sql`, APPLIED 2026-06-27). Rewrites `pm_team_match_profile`.

**Mechanic (pre-match):** the profile assembles the best AVAILABLE XI instead of always fielding nominal shirt≤11:
- healthy nominal starters play as-is;
- each injured/unavailable starter (injury_matches>0 or status='injured') is replaced by the best healthy depth player (shirt>11, ranked by OVR desc), who INHERITS the vacated slot — so position-fit ([[playmanager-position-fit]]) applies to the sub in that slot;
- injured starter weakest-first paired with best bench (row_number rn join);
- if no healthy cover for a slot, the injured starter still plays with the −18 penalty (empty bench).

In-match injuries are still rolled at the end of `pm_simulate_league_round` (unchanged) → they get auto-subbed NEXT match. No sim function change needed: `v_profile` is already embedded in `matchEngine.profile`, so autoSubs rides along.

**Output:** `profile.autoSubs` = `[{out, in, slot}]` (jsonb_agg over subs CTE). Verified live: injured GK → best bench GK, slot GK, positionFit stayed 1.0, readiness recovered.

**UI:** Match modal `MatchEngineBadge` reads `me.profile?.autoSubs`, renders an "ავტომატური ცვლები" block (slot chip · out→in). Type: `MatchResult.matchEngine.profile.autoSubs` in actions.ts.

**Note:** subs picked by raw OVR (best cover first), NOT yet weighted by per-slot position-fit — a winger could be subbed into a CB slot if he's the best OVR bench player. Future refinement.

Related: [[playmanager-position-fit]], [[playmanager-match-v2-vision]], [[playmanager-tac-attribute]].
