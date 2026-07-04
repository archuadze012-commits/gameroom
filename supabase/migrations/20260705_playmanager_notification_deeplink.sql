-- PlayManager notifications: add an optional deep-link (href) so a manager can
-- click a notification and land on the relevant page (e.g. the transfer
-- offers inbox, or the player who was just bought/sold). Read-state is
-- unchanged — pm_teams.notifications_seen_at already marks everything up to
-- the last visit as read (see 20260711b); this migration only adds a target.

alter table public.pm_event_feed add column if not exists href text;

-- Drop the old 5-arg signature explicitly: `create or replace` with an added
-- parameter creates a NEW overload rather than replacing it, and PostgREST's
-- named-argument RPC calls would then be ambiguous between the two.
drop function if exists public.pm_log_event(uuid, text, text, text, text);

create or replace function public.pm_log_event(
  p_team_id uuid,
  p_category text,
  p_title text,
  p_detail text default null,
  p_accent text default 'green',
  p_href text default null
) returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_calendar public.pm_calendar%rowtype;
begin
  perform public.pm_ensure_calendar(p_team_id);

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id;

  insert into public.pm_event_feed (
    team_id, category, accent, title, detail, href, week_no, day_no
  ) values (
    p_team_id,
    coalesce(p_category, 'system'),
    coalesce(p_accent, 'green'),
    p_title,
    p_detail,
    p_href,
    coalesce(v_calendar.week_no, 1),
    coalesce(v_calendar.day_no, 1)
  );
end;
$function$;

revoke all on function public.pm_log_event(uuid, text, text, text, text, text) from public, anon, authenticated;
