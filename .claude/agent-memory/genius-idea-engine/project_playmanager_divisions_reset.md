---
name: playmanager-divisions-reset
description: "PlayManager division ladder, locked registration, AI-team + cups wipe"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager competitive structure reset (2026-06-27, migration `20260709_playmanager_divisions_locked.sql` + one-time data ops).

- **Divisions** (`pm_divisions`, pre-existing): 4 levels, **level 1 = A (top) … level 4 = D (bottom)**. Used by free-agent class gating (D→pro, C→pro+star, A/B→≤elite — see [[playmanager-career-end]]).
- **Registration locked:** added `pm_divisions.registration_open boolean default false` (all false). The admin will open each division later. Full registration UI/flow is a FUTURE build — only the data flag exists now.
- **New managers start in D:** `pm_teams.division_id` default set to 4. (Existing 8 real test teams left in division 1.)
- **One-time data ops (user-approved "clean competitive slate"):** wiped `pm_cup_matches` / `pm_cup_participants` / `pm_cup_instances` (kept pm_cup_templates), then deleted all `is_bot=true` teams (8). AI teams were woven into cups (3202 participants, 5374 matches) so cups had to be cleared first. Deleted AI teams' players fell to `owner_id=null` (FK SET NULL) → joined the free-agent pool (15985 → 16105). Only 8 real teams remain.

**Caveat:** the per-team league sim still uses 3 hardcoded STRING opponents (North London / Royal Madrid / Milano Black) in pm_reset_season_rows — not real pm_teams. A real multi-division league with promotion/relegation across divisions + registration is still unbuilt.

Related: [[playmanager-career-end]], [[playmanager-free-agents]].
