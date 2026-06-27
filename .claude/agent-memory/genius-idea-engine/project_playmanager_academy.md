---
name: playmanager-academy
description: PlayManager academy youth development — prospects mature over time toward potential
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager academy pre-existed (table `pm_academy_prospects`: team_id, name, position, age, talent, ovr_base, potential_ovr, signing_cost, status; `pm_ensure_academy_prospects` generates ≤3 active, `pm_sign_academy_prospect` debits + creates a pm_player on the squad). It was an INSTANT pipeline — prospects were static until signed.

**Added 2026-06-27 (migration `playmanager_academy_development`): youth development.** `pm_develop_academy_prospects(team, days)` grows active, below-potential prospects' ovr_base toward potential_ovr — stochastically, chance = least(0.9, (days/10)*(0.5 + academyLevel*0.2 + talent*0.06)), +1 normally / +2 for talent≥8 at academy level≥3. Reads academy level from `pm_facilities` (sprite_key='academy'). Called from `advancePlayManagerTime` (actions.ts) right after pm_advance_time, so prospects mature on every day-advancing action. Returns {academyLevel, developed, readyToPromote}.

**UI:** academy prospects render (playmanager-city-editor.tsx, spriteKey academy/residence) now shows a development bar (ovr→potential) + "მზად" badge when ovr≥potential. Snapshot already exposed ovr (ovr_base) + potential.

**Still unbuilt (future):** prospect aging/expiry, U19 tournaments, contract-expiry mechanics, academy-level effect on prospect GENERATION quality (generation is client-side via pm_ensure_academy_prospects). Core pipeline (generate → develop → sign) is now functional.

Related: [[playmanager-stadium]] (same arena-facility pattern), [[playmanager-match-v2-vision]].
