---
name: playmanager-traits
description: PlayManager player traits — 8 behavioural specialisms that bonus match-engine lanes
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager players carry up to 3 traits (migration `20260702_playmanager_traits.sql`, APPLIED 2026-06-27). `pm_players.traits text[]` (default '{}').

**8 traits → lane bonus (per holder in effective XI, capped):** poacher(მონადირე)+attack · magician(ჯადოქარი)+central/wing/attack · playmaker(დირიჟორი)+central/midfield · speedster(ელვა)+wing · wall(კედელი)+defense · rock(გრანიტი)+defense/midfield · engine(ძრავა)+midfield/readiness · leader(ლიდერი)+team readiness. Bonuses aggregated in `pm_team_match_profile` over the post-auto-sub XI, added to lanes (capped 5-7 each), emitted as `profile.traits` = [{key,count}].

**Backfill** is from card_stats + position thresholds (poacher SHO≥76, magician DRI≥80, playmaker PAS≥78, speedster PAC≥84, wall DEF≥78, rock PHY≥82, engine PHY≥76&PAC≥74, leader ovr≥86), top-3 by array order.

**Admin editor (added 2026-06-27):** the player admin editor (player-admin-editor.tsx) now has a traits toggle-chips block (max 3) wired through `PlayManagerPlayerAdminDraft.traits` → `updatePlayManagerPlayerAdmin` (validated subset of TRAIT_KEYS, capped 3) → pm_players.traits. So traits can be hand-assigned to ANY player, including squad draftees. (Same edit fixed a bug: the admin save clamped talent to 11, now 12 — legend was unsaveable.)

**Current-state note:** drafted squad players (band 55-64) have `card_stats = NULL`, so the auto-backfill skipped them — assign via the admin editor or sign real players (card_stats present) for traits to show. 

**Source of truth:** TS `src/lib/playmanager/traits.ts` (TRAITS registry, getTrait/getTraits) MUST mirror DB keys + bonuses. UI: `src/components/playmanager/trait-badge.tsx` (TraitBadge/TraitList); player page shows "თვისებები"; match modal MatchEngineBadge shows team traits via getTrait. Type: actions.ts `MatchResult.matchEngine.profile.traits`.

Related: [[playmanager-position-fit]], [[playmanager-auto-subs]], [[playmanager-tac-attribute]], [[playmanager-match-v2-vision]].
