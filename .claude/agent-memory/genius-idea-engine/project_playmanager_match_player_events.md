---
name: playmanager-match-player-events
description: PlayManager goalscorers + per-player match ratings in the match result
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

Match results now include goalscorers + per-player ratings (migration `20260704_playmanager_match_player_events.sql`, APPLIED 2026-06-27).

**`pm_match_player_events(team, home_goals, result)`** — read-only, pure SQL (volatile for random). Active starters (shirt≤11, status active, injury_matches=0). Each home goal sampled to a starter weighted by attacking factor (ST/CF 1.0 … GK 0.02, +0.05 base) via `order by -ln(random())/weight limit 1` inside a `generate_series` lateral; `goals` CTE is `materialized` so goalscorers list and the rating goal-counts stay consistent. Each starter gets a 5.0–10.0 rating = 6.4 + goals*0.9 + result(W +0.5/L −0.3) + (ovr−squadAvg)*0.04 + ±0.6 variance. Returns `{goalscorers:[{playerId,name,goals}], ratings:[{playerId,name,position,rating}]}`.

`pm_simulate_league_round` calls it after the scoreline, embeds under `matchEngine.playerEvents`. NO mutation / economy impact yet (feeding form/value is a future pass).

**TS:** actions.ts `MatchResult.matchEngine.playerEvents`. Match modal `MatchEngineBadge` (playmanager-matchday-page.tsx) renders "⚽ გოლები" + "⭐ საუკ. შეფასება" (top 3).

Related: [[playmanager-match-v2-vision]], [[playmanager-traits]], [[playmanager-auto-subs]].
