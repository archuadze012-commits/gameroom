---
name: clan-tables-live-only-drift
description: clan_announcements (and clan subsystem tables) exist only on live, not in the migration replay tree — new migrations referencing them must use plpgsql
metadata:
  type: project
---

The clan subsystem tables (confirmed for `clan_announcements`; likely also `clan_members`, `clan_requests`, `clan_invites`, etc.) exist on the **live** Supabase DB but are **not created by any migration** in `supabase/migrations/`. The pglite replay tree (`npm run test:migrations`) therefore does not have them.

**Why:** historical drift — the clan feature was built directly on live without backfilled migration files.

**How to apply:** any NEW migration that references a clan_* table in a function body will FAIL `test:migrations` if written as `language sql` (SQL bodies are catalog-checked at CREATE time → "relation does not exist" on fresh replay). Write such functions as `language plpgsql` instead — plpgsql defers name resolution to first execution, so replay passes and live (where the table exists) works at runtime. Example: `clan_announcement_teaser` in `20260731_leaderboard_and_referral_resilience.sql`. Same trick applies to any live-only-table reference. See also [[profiles-update-grant-whitelist]] for the related `looking_for_clan` grant drift (flagged as its own task).
