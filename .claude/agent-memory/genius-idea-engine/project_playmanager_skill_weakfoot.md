---
name: playmanager-skill-weakfoot
description: PlayManager EA-style Skill Moves + Weak Foot star ratings (1-5)
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager players have `skill_moves` + `weak_foot` smallint columns (1–5, default 3, checks) — migration `20260706_playmanager_skill_weakfoot.sql`, APPLIED 2026-06-27.

- **skill_moves**: from DRI (≥90→5 … <62→1) +1 for LW/RW/CAM/ST/CF, −1 for GK/CB. Pyramid: most draftees 1-2, ~46 elites at 5.
- **weak_foot**: stable per-player from `hashtext(id)` biased toward the middle (range 2-5 in practice).

Display only (no match hook yet). Player page shows ★ rows ("ოსტატობა" / "სუსტი ფეხი") via a `Stars` helper. PlayerRow type + select updated in players/[playerId]/page.tsx.

Related: [[playmanager-behavioral]], [[playmanager-match-v2-vision]].
