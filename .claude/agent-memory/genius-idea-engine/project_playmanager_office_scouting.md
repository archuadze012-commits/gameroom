---
name: playmanager-office-scouting
description: "PlayManager office: scouting-report module (squad deficit analysis) shipped; broader office system pending"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager "office" = the `/playmanager/office` route which redirects to the **finance building** (`[building]/page.tsx`: office→finance). Building modules live in `BUILDING_MODULES` (playmanager-city-editor.tsx); many are `status:'planned'` stubs that render `BuildingModulePlaceholder`.

**Shipped (2026-06-27): Scouting Report module.** The market building's `scouting` module flipped `planned`→`ready`. Pure lib `src/lib/playmanager/scouting.ts` (`buildScoutingReport(squad)`) groups the squad into GK/DEF/MID/ATT, computes count vs recommended depth (2/6/5/4), best/avg OVR, avg age, and returns a per-group need (critical/thin/aging/ok) + priority + Georgian message + overall headline. UI `src/components/playmanager/scouting-report.tsx` (`<ScoutingReport squad={snapshot.squad} />`), wired via an early branch `if (spriteKey==='market' && moduleKey==='scouting')` in FacilityModule. Tests: scouting.test.ts (4) green. Pure/read-only — no DB change.

**STILL PENDING (the "large separate office system" the user flagged):** contracts management, rights/permissions, and the many other `planned` modules (free_agents, missions, daily_reward, head_to_head, fitness, recovery/risk medical, youth_training, capacity/hotel, euro_cups, championships). Each is its own build. Scope before building.

Related: [[playmanager-match-v2-vision]], [[playmanager-stadium]].
