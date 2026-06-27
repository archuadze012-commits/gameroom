---
name: playmanager-psych-formation
description: PlayManager psychologist pressure-niche + formation/slot persistence
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

Two Match-v2 levers shipped 2026-06-27:

**Psychologist niche** (migration `20260707_playmanager_psychologist_niche.sql`, sim re-applied). Added `v_pressure` to `pm_simulate_league_round` from team form: <50→1.6, <60→1.3, <72→1.0, <85→0.7, else 0.4. The psychologist-derived morale terms scale by it — `v_morale_delta`: W → +round(win_bonus*least(1,pressure)), D → +round(draw_bonus*pressure), L → −(5−round(loss_reduction*pressure)). So the psychologist matters most in a bad run, barely when flying. Only the morale block changed vs the 20260704 sim.

**Formation + slot persistence** (migration `20260707...lineup_formation` / file `20260707_playmanager_lineup_formation.sql`... actually applied as playmanager_lineup_formation). Added `pm_match_settings.formation text default '4-3-3'` + RPC `pm_save_lineup_formation(team, formation, slots jsonb)` where slots=[{playerId, slot}] ordered; writes shirt_number by order AND `position=slot` for the XI (slot≤11), formation onto match_settings. Before this, pm_save_lineup_order only wrote shirt_number, so position-fit never saw the manager's chosen slot. New action `savePlayManagerLineupFormation`; lineup-tactics-studio.tsx save() builds slots from board.slots+slotDefs (starters get formation slot, bench/reserve slot=null → position untouched). pm_save_lineup_order + savePlayManagerLineup now unused (left in place).

Note: studio still defaults formation UI to '4-3-3' on load (saved formation name not yet restored into the picker; board auto-fills from saved positions regardless).

Related: [[playmanager-position-fit]], [[playmanager-match-v2-vision]].
