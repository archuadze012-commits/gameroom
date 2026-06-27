---
name: playmanager-position-fit
description: PlayManager match engine — formation/position-fit penalty (natural vs slot)
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager match engine now penalises out-of-position starters (migration `20260630_playmanager_position_fit.sql`, APPLIED 2026-06-27).

**Mechanic:** each starter's effective rating × a position-fit multiplier from how familiar their NATURAL position (pm_players.primary_position) is with the SLOT they're fielded in (pm_squads.position):
- natural × 1.00 · secondary × 0.94 · tertiary × 0.86 · out-of-position × 0.74 · GK↔outfield × 0.50 (overrides)

**DB:** `pm_normalize_position(text)`, `pm_secondary_positions(text)→text[]`, `pm_position_fit(natural,slot)→numeric`. `pm_team_match_profile` multiplies every per-stat eff value by pos_fit and exposes `positionFit` (XI avg). `pm_simulate_league_round` surfaces it in `matchEngine.tactics.positionFit`.

**Source of truth:** SQL helpers MUST mirror `src/lib/playmanager/secondary-positions.ts` (SECONDARY_POSITION_MAP + normalizePlayManagerPosition) and the getPositionStatus tiers in lineup-tactics-studio.tsx — the familiarity rings players already see now actually change the result. Keep maps synced.

**UI:** Match result modal `MatchEngineBadge` (playmanager-matchday-page.tsx) shows a "პოზიცია NN%" chip + a red warning line when fit < 0.9. Type in actions.ts `MatchResult.matchEngine.tactics.positionFit?`.

Related: [[playmanager-match-v2-vision]], [[playmanager-tac-attribute]], [[playmanager-talent-classes]].
