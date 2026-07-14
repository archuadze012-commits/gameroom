---
name: discover-page
description: /discover people-discovery page exists (built 2026-07-13) — don't rebuild/duplicate
metadata:
  type: project
---

`/discover` gvverdi ("აღმოაჩინე") ashenda 2026-07-13. Recommendation-driven find-people page, /search-is (text search) shemavსebeli.

- File: `src/app/discover/page.tsx` (server component, auth-gated).
- Data: reuses `get_suggested_follows` RPC (p_limit 18) + fallback query (active players by last_seen_at/level) when suggestions < 6, so new users never see a dead page.
- Sections: "შესაძლოა იცნობდე" (ranked) + "აქტიური მოთამაშეები" (fallback). Online dot via `isOnline`, reason chip, level, `FollowButton compact`.
- No new RPC/migration. Design: violet base (PageHeader/CinematicBackground don't support "lime" ColorKey) + lime accents in cards.
- Nav links added: `site-header.tsx` navItems + `mobile-top-nav.tsx` MORE_LINKS (Compass icon).

**Why:** fulfills the parked "discovery" backlog item; don't duplicate the home-sidebar widget [[project_referral_gamer_card]] or /search.
**How to apply:** future discovery/find-people asks → extend this page, not a new route.
