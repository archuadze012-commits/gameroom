---
name: playmanager-fitness
description: PlayManager medical risk/fitness module — squad fatigue + injury-risk analysis
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager medical building's `risk` module flipped `planned`→`ready` (2026-06-27). Pure read-only, no migration.

`src/lib/playmanager/fitness.ts` `buildFitnessReport(players)` classifies each squad player: injured→'out', fatigue≥70→'high', ≥50→'elevated', else 'low'; sorts worst-first; returns rows + highRiskCount, injuredCount, avgFatigue (excludes injured), headline. Tests: fitness.test.ts (3). UI `src/components/playmanager/fitness-report.tsx` `<FitnessReport players={snapshot.squad} />`, wired via `if (spriteKey==='medical' && moduleKey==='risk')` branch in FacilityModule (playmanager-city-editor.tsx). snapshot.squad already carries fatigue/morale/injuryMatches/availability.

Same pattern as the scouting-report office module ([[playmanager-office-scouting]]). Other medical modules (injuries, recovery, doctor) still planned.

Related: [[playmanager-office-scouting]], [[playmanager-match-v2-vision]].
