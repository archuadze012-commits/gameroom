-- Backfill drift: the clan-finder feature (src/app/clans/finder/actions.ts) lets
-- a user toggle profiles.looking_for_clan, but the column and its authenticated
-- column-level UPDATE grant were applied to live without a migration. Because
-- profiles UPDATE is a column whitelist (see 20260529_profiles_update_grant_
-- lockdown), a column with no authenticated UPDATE grant makes the WHOLE update
-- fail with "permission denied for table profiles". Add the column and the grant
-- so the migration tree matches live and the clan-finder toggle can write.
--
-- Idempotent: on live (where both already exist) this is a no-op; on a fresh
-- replay it creates the column and adds looking_for_clan to the authenticated
-- update whitelist (GRANT is additive, so the 20260529 grants are preserved).
alter table public.profiles
  add column if not exists looking_for_clan boolean not null default false;

grant update (looking_for_clan) on table public.profiles to authenticated;
