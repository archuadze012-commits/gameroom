---
name: playmanager-tac-attribute
description: "PlayManager TAC (tactical intelligence) attribute — chosen formula, key finding, code written not applied"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f87508e-95e5-4b85-9ea4-b6f056f6a8ff
---

TAC = a 7th "tactical / footballing intelligence" attribute that names the gap between a player's OVR and the simple average of his 6 face stats (e.g. Salah OVR 91 vs 6-stat avg ~79). Shown on the **player page only** (never on the FUT card). Part of [[playmanager-match-v2-vision]].

**Key finding:** an EXACT math back-solve (TAC chosen so a weighted average reproduces OVR) FAILS — real `card_stats` are seeded from OVR in our DB, so back-solved TAC clusters tightly per position and overflows >99. Also: a 7th equal-weight stat can never raise an average from ~79 to 91 (needs >99). Chosen instead: **designed derivation**, validated on the live pool:

```
TAC = clamp(45, 99, round( 0.62*OVR + 18 + 1.2*gap + role_bias + seed ))
gap = OVR − avg(PAC,SHO,PAS,DRI,DEF,PHY)
role_bias: CB/CDM +3 ; CM/CAM/AM +2 ; LB/RB/LWB/RWB +1 ; LW/RW/LM/RM −1 ; ST/CF −2 ; else 0
seed = (abs(hashtext(normalized_name)) % 7) − 3        -- deterministic ±3
GK branch = 0.66*OVR + 20 + seed
```

Validated: Wirtz 92 · Salah 87 · Van Dijk 78 · low pros ~50. OVR is NOT changed (`ea_fc_ovr` stays the anchor for real players). EA's real OVR is a position-weighted blend of ~35 sub-stats, not an average of the 6 face stats — that is why the gap exists.

**APPLIED + now TRAINABLE (2026-06-28).** Migration `20260628_playmanager_player_tac.sql` live (column + `pm_player_compute_tac` + trigger + backfill). Engine hook `20260627_..._tactical_depth.sql` live. Display in `src/app/playmanager/players/[playerId]/page.tsx`.

Then (`20260628l_tac_trainable.sql`) the formula became only the INITIAL seed: `pm_players_sync_card_stats` now seeds TAC only when null (stops overwriting), and TAC grows via the XP development pipeline (`pm_grant_match_development`) alongside mini-stats. See [[playmanager-development-system]].
