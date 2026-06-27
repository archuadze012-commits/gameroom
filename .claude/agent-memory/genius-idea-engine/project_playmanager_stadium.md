---
name: playmanager-stadium
description: PlayManager stadium 22k–100k driven by arena facility level; attendance scales with capacity
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager stadium capacity is the **arena facility level** (migration `20260703_playmanager_stadium.sql`, APPLIED 2026-06-27). NOT a separate column — `pm_facilities.sprite_key='arena'.level` IS the stadium. (A first attempt added a duplicate `pm_finance_state.stadium_level` + `pm_upgrade_stadium` RPC — REVERTED in same session; do not reintroduce.)

**Capacity tiers** (arena level → seats): 1→22k, 2→38k, 3→55k, 4→75k, 5+→100k (plateaus). DB `pm_stadium_capacity(smallint)` MUST mirror TS `getStadiumCapacity` in economy.ts.

**Attendance** in `pm_simulate_league_round` is now a DEMAND FRACTION of capacity (was hard-capped 45k): `demand = 0.763 + form*0.00093 + readiness*0.00044 + clamp((28-ticket)*0.0115,-0.155,0.10)`, attendance = clamp(round(cap*demand), cap*0.40, cap). This EXACTLY mirrors TS `getProjectedAttendance` (economy.ts) so the projected gate == actual gate. Bigger ground ⇒ more gate income; ticket price is a real lever. Sim reads arena level via `select level from pm_facilities where sprite_key='arena'`, returns `capacity` + `stadiumLevel` in payload.

**Upgrades** use the EXISTING arena facility upgrade flow (getFacilityUpgradeCostGel('arena', level) = 620k*1.42^(n-1)) + the "სტადიონის მენეჯმენტი" tickets module in playmanager-city-editor.tsx (already wired to facilities.arena.level). No new upgrade action needed.

**TS:** economy.ts getStadiumCapacity (5-tier) + unused helpers getStadiumUpgradeCost/STADIUM_MAX_LEVEL. city-data.ts buildSnapshot loads arena level (pm_facilities query) → finance.stadiumLevel/stadiumCapacity/stadiumCapacityLabel. economy.test.ts (8 tests) green.

Related: [[playmanager-match-v2-vision]], [[playmanager-position-fit]].
