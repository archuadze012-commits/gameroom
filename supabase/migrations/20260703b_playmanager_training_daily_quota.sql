-- Training no longer burns a full calendar day per player. Instead each team has
-- a DAILY training-session quota; sessions reset when the game-day advances.
-- Capacity = 4 + head_coach level + training-facility level, so the assistant
-- (head_coach) and the training building both give more sessions/day. This kills
-- the old illogic where developing 18 players cost 18 game-days while buying XP
-- packs cost none.
--
-- This migration only adds the quota primitives (calendar columns + capacity fn).
-- pm_train_player itself — which enforces the quota AND now banks gains into
-- pending_card_stats — is (re)defined in 20260703d_playmanager_training_feeds_pending.sql.

-- Per-day session counter, stored on the 1:1 calendar row.
alter table public.pm_calendar
  add column if not exists train_used smallint not null default 0,
  add column if not exists train_day  integer  not null default 0;

-- Daily session capacity for a team.
create or replace function public.pm_training_capacity(p_team_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select 4
    + coalesce((select level from public.pm_staff
                where team_id = p_team_id and role_key = 'head_coach'), 0)
    + coalesce((select level from public.pm_facilities
                where team_id = p_team_id and sprite_key = 'training'), 0);
$function$;

revoke execute on function public.pm_training_capacity(uuid) from anon, authenticated, public;
grant  execute on function public.pm_training_capacity(uuid) to service_role;
