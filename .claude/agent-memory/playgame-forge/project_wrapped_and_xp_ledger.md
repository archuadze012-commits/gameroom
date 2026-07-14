---
name: wrapped-and-xp-ledger
description: PlayGame Wrapped seasonal recap shipped 2026-07-14; which stats are real vs cumulative, and the xp_events ledger is de-facto empty
metadata:
  type: project
---

PlayGame Wrapped — quarterly personal stats recap with shareable OG image, shipped 2026-07-14 (localhost only). Route: `/wrapped/[username]` (+ colocated `opengraph-image.tsx`). Data layer `src/lib/wrapped/data.ts` (`getWrappedData`), season math `src/lib/wrapped/season.ts` (`getSeason`, UTC quarter boundaries). Share entry added to `/g/[username]` owner CTA ("ნახე შენი Wrapped"). No migration/RPC — all aggregates via admin-client plain queries (zero grant-leak surface).

**Windowed (REAL per-season) stats**: new followers (`follows.created_at`, following_id), posts (`posts.created_at`, author_id), comments (`post_comments`), LFG activity (`lfg_posts` + `lfg_responses`), messages sent (`conversation_messages`, owner-only/private), NC earned (`wallet_transactions` amount>0, owner-only/private), top game (most-frequent `lfg_posts.game_slug` in window → fallback `favorite_game_slugs[0]` → clan game_slug), clan joined-this-season (`clan_members.joined_at`).

**NOT windowed — shown as current-state, honestly labeled**: `profiles.level` ("მიმდინარე დონე") + `daily_streak_count` ("სტრიკი") are cumulative, NOT per-quarter.

**Why:** ⚠️ `xp_events` table EXISTS as a real XP ledger (user_id, amount, created_at, source_type) BUT is de-facto empty — only 1 row in the entire table (2026-07-10). `awardXp` does not reliably write to it. Summing it for "XP this season" would show ~0 for everyone → misleading, so it's deliberately NOT used. Revisit only if `awardXp`/gamification starts populating `xp_events` consistently.

**How to apply:** If asked to add "XP earned this season" or any XP-delta feature, first check `select count(*) from xp_events` — if still near-empty, the ledger can't back it; use activity proxies or current-level instead. `post_likes` has NO `created_at` → "likes given/received this season" is also NOT windowable. Thin-data guard: `activityScore < 3` (public metrics sum) → "სეზონი ჯერ გრძელდება" warm-up state instead of empty card; `joinedMidSeason` note when `profiles.created_at >= season.start`. See [[referral-gamer-card]] for the OG/share pattern this reuses.
