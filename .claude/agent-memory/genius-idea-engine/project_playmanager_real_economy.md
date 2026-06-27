---
name: project_playmanager_real_economy
description: "PlayManager moved to a real-players-only economy — draft/listing rules and what's still unbuilt"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7b2bb27b-96fa-4d26-8461-e0d622ea732c
---

PlayManager is now **real-players-only** (no `is_real=false` players). Done & live on the DB (2026-06-26 migrations):

- **Purged** all virtual players; **re-drafted** every team to a full 15–16-man squad from the unowned real EAFC pool (`pm_players where is_real and owner_id is null`, ~16k).
- **Draft rule** (`pm_draft_squad`): OVR band **55–64**, by position (4-3-3 + GK/CB/CM/ST subs), drafted players' in-game **age set to 18** (career-start rule, `PLAYMANAGER_REAL_PLAYER_RESET_AGE`). `real_age` keeps the EAFC age.
- New-team flow uses **`pm_create_team_v2`** (create-team/actions.ts); old `pm_create_team` + `generateStarterSquad` are dead.
- **Transfer market = manager listings** (`pm_transfer_listings` + `pm_list_player`/`pm_unlist_player`/`pm_buy_listed_player`, all service_role-only). Distinct from the pre-existing `pm_transfer_offers` (team→team bids). Server actions added: `listPlayManagerPlayer`/`unlistPlayManagerPlayer`/`buyPlayManagerListedPlayer`.
- Added **4th division** (level 4) for academy talent bands.

**Still unbuilt (next):**
- Market route `module=transfer_market` should read `pm_transfer_listings` (currently still EAFC pool); add a "list for sale" UI on player cards.
- **Office (finance) building** modules: `transfer_market` (listings), `free_agents` (unowned real pool), `young_free_agents` (unowned real `age<18`). City-editor `BUILDING_MODULES.finance` + `FacilityModule()`.
- **Academy** = team's owned `age<18` players (replace `pm_academy_prospects` query in city-data.ts); **talent×division gating**: elite 9–11 any division; talent 1–8 capped by division level — **div1=1–8, div2=1–6, div3=1–3** in DB terms (user spoke A/B/C/D=1–8/1–8/1–6/1–3; only 3 numbered divisions existed so a 4th was added — confirm final level→band map). Reconcile `getPlayManagerDisplayAge` so `age<18` reals show their young age (reset applies only at entry).
- **City sprites** (Part F): a separate **shop** building + `/playmanager/shop` page, and 5 route sprites (search/teams/staff/cups/announcements) — needs user-provided building images.

Plan file: `~/.claude/plans/lovely-finding-tide.md`. See also [[feedback_opus_for_migration]].
