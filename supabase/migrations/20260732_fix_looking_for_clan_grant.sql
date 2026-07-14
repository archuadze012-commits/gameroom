-- Add UPDATE grant for looking_for_clan to authenticated role
-- The column may not exist in migrations but exists in the DB, or is meant to be added.
-- The check-profile-write-grants.mjs script checks all columns used in code against grants.
alter table public.profiles add column if not exists looking_for_clan boolean default false;
grant update (looking_for_clan) on table public.profiles to authenticated;
