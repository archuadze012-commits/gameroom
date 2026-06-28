---
name: playmanager-development-system
description: PlayManager player-development & fodder/pack economy — built and live (2026-06-28)
metadata:
  node_type: memory
  type: project
---

Built + applied this session (branch `fix/set-piece-coach-holes`, migrations `20260628e`–`m`). Two separate currencies, no conflict:

**XP path (game-time + coaches → mini-stats + tac, up to talent ceiling):**
- Starting XI earns XP each match (age curve toward coach deadline age, coach level, talent headroom). Bench = 0 (game-time gate). `pm_grant_match_development` — called inside `pm_simulate_league_round` (league) and from `cups.ts` (cups).
- XP fills `pending_card_stats` (round-robin over `pm_player_training_focus`). Pending stats are INACTIVE in matches until confirmed.

**Fodder path (sacrifice → OVR):**
- When pending stats would raise OVR, an upgrade is "available". `pm_confirm_ovr_upgrade(team, player, fodder_ids)` realizes it: consumes Pro-class (talent 1-3) fodder, commits pending→active, OVR +1.
- Cost = curve keyed to CURRENT OVR (`pm_ovr_upgrade_cost`, floor 49): 1,2,4,6,8,12,16,20,24,30,35,40,45,50,60,70,80,90,100,120 then +20/level. Confirms ALL pending levels at once (sum). Pure function of OVR → bought-high players are expensive, cost carries across transfers, no per-owner counter.

**Coaches:** gk/defence/**midfield (new)**/attack. Position taxonomy: gk→GK, def→CB/LB/RB, mid→CDM/CM/CAM/AM/LM/RM, att→LW/RW/ST/CF (fixed the CM gap). Coach level → deadline age (L5→25, L4→27, L3→28, L2→29, L1→30, none→31).

**Manager assistant (head_coach):** readiness + auto-lineup repair (built earlier) + **skill_moves passive dev**. One-time reset: skill_moves→skill_moves_cap snapshot, live→floor 1 (recoverable). `pm_grant_skill_development(team,days)` in advancePlayManagerTime grows skill_dev_pct by assistant level (same completion ages); skill_moves derived, capped at snapshot. skill_moves match effect: ±1.5%/star to attack/wing/central (TS playerLane + league pm_team_match_profile).

**Packs (GEL sink + fodder):** `pm_open_pack(team, pack_id)` draws from the unowned real-player pool weighted by `rarity_weights` (talent), debits in-game GEL. Packs added: "Pro ფოდერ პაკი" (60k, 5, pro-heavy), "პრემიუმ პაკი" (250k, 3). Players were always DRAFTED from the pool (`pm_draft_squad`), never generated. Full loop verified: matches→pending→buy packs→fodder→confirm→OVR↑.

**New columns** on pm_players: xp, pending_card_stats, skill_moves_cap, skill_dev_pct.
**TS actions:** confirmPlayManagerOvrUpgrade, openPlayManagerPack.

⏭️ **TODO next session:** (1) UI — pack shop, OVR-confirm button + fodder picker, "upgrade available"/pending-stats display on player page. (2) finance_manager is a display-only bug (projectedIncomePct never affects real income — fix or repurpose). Related: [[playmanager-tac-attribute]] [[playmanager-match-v2-vision]]
