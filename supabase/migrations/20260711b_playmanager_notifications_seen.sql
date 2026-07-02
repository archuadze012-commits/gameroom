-- PlayManager · notifications read-state.
-- Tracks when a team last opened its notifications so we can compute an unread
-- count from the existing pm_event_feed (no new feed table needed). Defaults to
-- now() so pre-existing events don't all surface as unread on rollout.

alter table public.pm_teams
  add column if not exists notifications_seen_at timestamptz not null default now();

-- ⚠️ SECURITY DEFINER RPC: revoke from anon/authenticated/public, grant only to
-- service_role (see 20260710a — this class of grant has regressed twice).
create or replace function public.pm_mark_notifications_seen(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  update public.pm_teams set notifications_seen_at = now() where id = p_team_id;
end;
$function$;

revoke execute on function public.pm_mark_notifications_seen(uuid) from anon, authenticated, public;
grant  execute on function public.pm_mark_notifications_seen(uuid) to service_role;
