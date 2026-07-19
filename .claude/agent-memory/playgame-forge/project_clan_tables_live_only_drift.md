---
name: clan-tables-live-only-drift
description: clan_announcements (and clan subsystem tables) exist only on live, not in the migration replay tree — new migrations referencing them must use plpgsql
metadata:
  type: project
---

**RESOLVED 2026-07-14** — the clan subsystem drift was backfilled in `supabase/migrations/20260732_clan_subsystem_backfill.sql`: 9 live-only tables (clan_announcements, clan_cosmetic_catalog, clan_cosmetics, clan_event_rsvps, clan_events, clan_fixture_rsvps, clan_invites, clan_messages, clan_treasury_ledger), 4 functions (award_clan_xp, clan_buy_cosmetic, clan_donate_nc, is_clan_member), 10 RLS policies, 18 indexes, and the drifted columns on clans (6), clan_members (5), tournament_participants (clan_id). Replayed tree now == live exactly. `clans`/`clan_members`/`clan_requests` base tables + clan_role/clan_status enums were already in the tree (`20260526_phase3_clans.sql`); the backfill only ADDs their drift columns.

**Historical context (pre-backfill):** these tables existed on **live** but were not created by any migration — the clan feature was built directly on live. That's why `clan_announcement_teaser` in `20260731_leaderboard_and_referral_resilience.sql` was written `language plpgsql` (deferred name resolution → replay-clean despite the missing table). With the backfill in place at `20260732` (sorts after `20260731b`), the tables now exist in the tree too.

**SECURITY DEFINER handling (important for future clan RPCs):**
- `is_clan_member(uuid,uuid)` is `SECURITY DEFINER` and is called by 8 clan RLS policies (`clan_announcements/events/fixture_rsvps/invites/treasury_ledger/event_rsvps` selects). It **keeps** `execute` for anon+authenticated (mirrors is_admin/can_manage) and is **allowlisted** in `scripts/audit-security-definer.mjs` as `public.is_clan_member/2`. Do NOT revoke it — clan RLS goes inert. See [[rls-helper-donotrevoke]].
- `award_clan_xp` / `clan_buy_cosmetic` / `clan_donate_nc` are DEFINER + mutating → revoked from public/anon/authenticated, granted only to service_role. All four pin `search_path = public, pg_temp` (award_clan_xp and is_clan_member were on live with `public` only — no pg_temp — which the audit gate rejects; the backfill hardens them and the create-or-replace apply brought live into alignment).

See also [[profiles-update-grant-whitelist]] for the related `looking_for_clan` grant drift.
