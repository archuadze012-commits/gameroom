---
name: playmanager-formfeed-scout
description: PlayManager match-rating form feed + scout-gated hidden attribute reveal
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

Two player-identity levers shipped 2026-06-27:

**Form feed** (migration `playmanager_rating_form_feed`). `pm_match_player_events` converted from `language sql` to `plpgsql`: it now computes goalscorers+ratings into a variable, then UPDATEs each rated player's morale by performance — rating ≥8.0 → +2, ≤6.0 → −2 — on TOP of the team result delta the sim applies afterward. Same return shape (goalscorers/ratings), so no TS change. Side effect lives in the helper, called from the sim before its bulk morale update.

**Scout-gated reveal** (no migration — player-page logic). On `players/[playerId]/page.tsx`, a player's hidden identity (TraitList + behavioural profile) is only shown when `attributesRevealed = isOwnedByViewer || hasScout`. isOwnedByViewer = the player's owner team.user_id === the viewer's user id. hasScout = viewer's team (pm_teams by user_id) has a `pm_staff` row with `role_key='scout'`. Otherwise a 🔒 notice ("დაიქირავე სკაუტი") replaces them (only when the player actually has hidden attrs). Gives the scout staff role real value. (pm_staff role_keys: doctor, finance_manager, head_coach, scout.)

Related: [[playmanager-match-player-events]], [[playmanager-behavioral]], [[playmanager-traits]], [[playmanager-match-v2-vision]].
