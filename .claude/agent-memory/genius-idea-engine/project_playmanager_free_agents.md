---
name: playmanager-free-agents
description: PlayManager free agents module — was fully built but gated behind status:planned; now active
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager market `free_agents` module — **NOT new, was ~99% built already**, only hidden behind `status:'planned'` (rendered the placeholder). Activated 2026-06-27 by flipping the module to `status:'ready'` in BUILDING_MODULES (playmanager-city-editor.tsx). No DB/API change needed.

**Already-existing backend (do not rebuild):**
- API route `src/app/api/playmanager/market/route.ts` handles `module=free_agents`: scout-gated (reads pm_staff role_key='scout' level; if 0 → meta.freeAgents.scoutHired=false), uses table `pm_free_agent_cycles` (team_id, scout_level, offer_player_ids, generated_at, refresh_at) for a 24h refresh cycle, picks FREE_AGENT_OFFER_COUNT (5) offers from the owner_id-null active player pool weighted by division + scout level. Returns items + meta.freeAgents {scoutHired, scoutLevel, maxScoutLevel, tier, refreshLabel}.
- UI: full free_agents render branch (scout status header, 5 FUT cards, "hire a scout" empty state). Sign via `buyPlayManagerMarketPlayer(player.key)` (same as market — free agents ARE owner_id-null market players).

**Emergent link to contracts:** players released by contract expiry ([[playmanager-contracts]]) get owner_id=null, status stays 'active' → they re-enter the free-agent pool, so a released player can be signed by another club.

Related: [[playmanager-contracts]], [[playmanager-formfeed-scout]] (scout role), [[playmanager-match-v2-vision]].
