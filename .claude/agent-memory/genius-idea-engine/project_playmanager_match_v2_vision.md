---
name: playmanager-match-v2-vision
description: "Agreed design vision for PlayManager \"Match Engine v2 + Player Identity\" overhaul (roadmap, mostly not in code yet)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f87508e-95e5-4b85-9ea4-b6f056f6a8ff
---

Long design session (2026-06) agreed a multi-phase PlayManager overhaul so matches are meaningfully determined by tactics + squad + player identity. Full plan file: `C:\Users\LEONSIO\.claude\plans\temporal-baking-flurry.md`.

**Why:** today tactics/lineup barely affect results; player identity is shallow. The user wants depth + collection "მუღამი" + everything to influence the match.

Agreed decisions:
- **Tactics must matter** — rock-paper-scissors style matchup (pressing>possession>counter>pressing); opponent style scoutable from form+round; defensive line = risk/reward; style effectiveness scales with squad **style-fit**. (Drafted in migration 20260627 — see [[playmanager-pending-migrations]].)
- **Match Engine v2 (later)** — remove tactical double-count (profile = pure quality); stadium capacity curve → **100k at level 10** (capacity is currently dead in the SQL engine); home/away advantage tied to stadium + fans; attendance driven by ticket price + form + **playing style** (more attacking → fuller stadium → more income + home boost); bench-depth "fresh legs"; **pre-set auto-subs** (sub→starter map chosen on the lineup page — there is NO live match sim, by user's choice); goalscorers + per-player match ratings feeding form/value; psychologist gets a unique niche (matters in bad runs / under pressure, not when already winning); vibe-variable cleanup (morale/form = sources, readiness/fan_mood = derived).
- **Formation + position-fit (lever 2)** — lineup studio currently saves only ORDER, not slots/formation. Persist slot+formation+subs → engine applies the existing **−1/−2/−9** out-of-position penalty (already in `player-fut-card.tsx`, card-only today) + formation shape.
- **Talent classes 1–12** — Rotation/Starter/Key/Star/World Class/**Rising Star(11)**/**Legendary(12)**. Rising Star = real age ≤21 & base OVR ≥80, label drops to World Class once aged out (reuse runtime wonderkid rule, extend <20→≤21). Legendary = curated icons (Pelé/Maradona/Messi/Ronaldo/Cruyff/Gerrard…), **shop/packs only**, user adds later. Copy limit 1 for 85+ OVR and Rising Stars. Class determines training max OVR via `pm_player_ovr_growth_cap` (extend for 12).
- **Player identity** — [[playmanager-tac-attribute]] + curated ~6 behavioral attributes (Composure, Stamina, Positioning, Vision, Aggression, Consistency) on the player page (NOT the card); named **Traits/PlayStyles** as the headline collectible; EA-style Skill-Moves + Weak-Foot stars; **scout staff reveals hidden attributes** (gives the scout role value, makes the market a puzzle). Two-layer model: rating layer (6 stats + TAC) defines OVR; behavioral layer defines match behavior (not OVR).

Notes: the 3 league opponents (North London / Royal Madrid / Milano Black) are **AI test teams to ignore** — real opponents come with PvP. Season is only 3 rounds.
