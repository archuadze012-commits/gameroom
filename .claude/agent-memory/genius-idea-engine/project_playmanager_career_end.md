---
name: playmanager-career-end
description: PlayManager career-end system (replaced contracts) + free-agent class/division gating
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager replaced the contract_seasons system with an age-based **career-end** model (migrations `playmanager_career_end_schema` / `_functions` / `playmanager_reset_season_no_contracts`, APPLIED 2026-06-27). User-designed.

**Career-end age by talent class** (`pm_player_career_end_age(talent)`): legend(12)→42 · world_class/rising_star(10-11)→40 · elite(7-9)→38 · star(4-6)→35 · pro(1-3)→32. Backfilled to `pm_players.career_end_age`. Other new cols: `career_notified`, `available_via_career`, `pending_repack` (all bool). `contract_seasons` column + pm_renew_player_contract DROPPED; pm_reset_season_rows reverted (no contract logic).

**Flow:** `pm_process_career_ends(team,days)` (called in advancePlayManagerTime after academy dev): at age = end−1 → notify (pm_log_event gold "X კარიერას ასრულებს") once via career_notified. At age ≥ end with no decision → auto-resolve (no limbo): legend→owner_id null + pending_repack (admin pack); world_class/rising_star→owner_id null + available_via_career (free agents); others→status 'retired'. squad row deleted.

**Decisions (player page career panel, owned + in window only):** `pm_career_renew` = ½ base_transfer_value, career_end_age+=2, re-arm notice. `pm_career_release` = ⅓ base comp credited, player leaves (routed by class as above). TS actions `renewPlayManagerCareer`/`releasePlayManagerCareer`; UI `CareerDecisionButtons` (contract-renew-button.tsx). Player page select: career_end_age (replaced contract_seasons).

**Free-agent class/division gating** (market API route.ts `getFreeAgentTalentCap(divisionId)`): div level 4(D)→talent≤3, 3(C)→≤6, 1-2(A/B)→≤9. Pool = owner_id null active AND NOT pending_repack AND (available_via_career OR talent≤cap). So world_class/rising_star only via career-end; legend never (pending_repack excluded from ALL markets). pm_players select gained available_via_career, pending_repack. pm_divisions has 4 divisions (level 1=A top … 4=D bottom).

**Legend repack:** non-renewed legends get pending_repack=true (owner_id null) — admin queries `where pending_repack=true` to re-place into packs. No admin UI yet.

Related: [[playmanager-contracts]] (superseded), [[playmanager-free-agents]], [[playmanager-talent-classes]], [[playmanager-academy]].
