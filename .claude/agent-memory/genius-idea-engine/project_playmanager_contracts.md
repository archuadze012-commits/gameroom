---
name: playmanager-contracts
description: "PlayManager player contracts v1 — N-season contracts, season decrement, renewal"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager players have contracts (migration `playmanager_contracts`, APPLIED 2026-06-27). `pm_players.contract_seasons smallint default 3` (check 0–5). The concrete half of the "office full system" the user wanted (contracts + rights).

- **Decrement:** `pm_reset_season_rows` (called on season rollover in the sim) now does `contract_seasons = greatest(0, contract_seasons-1)` for the team's squad. So contracts tick down one per season.
- **Renew:** `pm_renew_player_contract(team, player, seasons)` — adds seasons (cap 5), cost = round(current_value * 0.06 * seasonsAdded), debits wallet, raises `contract_at_max` if already 5. Action `renewPlayManagerContract` (actions.ts).
- **Expiry → free agency (migration `playmanager_contract_expiry_freeagency`):** `pm_reset_season_rows` now, at season rollover, RELEASES squad players already at `contract_seasons<=0` — deletes their pm_squads row, sets owner_id null, and logs a red "X დატოვა კლუბი · კონტრაქტი ამოიწურა" event (pm_log_event). Order: release-then-decrement, so a player at 1 ticks to 0 (warning season) and is released the NEXT rollover if not renewed. Released players just leave (not auto-added to market in v1). Player page still shows the red expiry warning before that.
- **UI:** player page shows a "კონტრაქტი" panel (seasons + expiry warning) + a client `ContractRenewButton` (contract-renew-button.tsx) shown only for `isOwnedByViewer`. PlayerRow type + select updated.

**Office-full remaining (NOT built):** rights/permissions (underspecified — co-manager/board powers?), plus the secondary `planned` modules (free_agents generation, missions, daily_reward, head_to_head, fitness, recovery/risk, capacity/hotel). Each is its own subsystem. The scouting-report office module + contracts are the office pieces shipped so far.

Related: [[playmanager-office-scouting]], [[playmanager-academy]], [[playmanager-match-v2-vision]].
