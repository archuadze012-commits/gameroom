create table if not exists public.pm_calendar (
  team_id uuid primary key references public.pm_teams(id) on delete cascade,
  week_no integer not null default 1 check (week_no > 0),
  day_no smallint not null default 1 check (day_no between 1 and 7),
  total_days integer not null default 1 check (total_days > 0),
  updated_at timestamptz not null default now()
);

alter table public.pm_calendar enable row level security;

drop policy if exists "pm_calendar_owner_select" on public.pm_calendar;
create policy "pm_calendar_owner_select"
on public.pm_calendar
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create table if not exists public.pm_event_feed (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  category text not null check (category in ('match','medical','finance','academy','media','board','system')),
  accent text not null default 'green' check (accent in ('green','red','gold')),
  title text not null,
  detail text,
  week_no integer not null default 1,
  day_no smallint not null default 1,
  created_at timestamptz not null default now()
);

alter table public.pm_event_feed enable row level security;

drop policy if exists "pm_event_feed_owner_select" on public.pm_event_feed;
create policy "pm_event_feed_owner_select"
on public.pm_event_feed
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create index if not exists pm_event_feed_team_created_idx
  on public.pm_event_feed(team_id, created_at desc);

create or replace function public.pm_ensure_calendar(
  p_team_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pm_calendar (team_id)
  values (p_team_id)
  on conflict (team_id) do nothing;
end;
$$;

create or replace function public.pm_advance_time(
  p_team_id uuid,
  p_days integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calendar public.pm_calendar%rowtype;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_total integer;
begin
  perform public.pm_ensure_calendar(p_team_id);

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id
  for update;

  v_total := v_calendar.total_days + v_days;

  update public.pm_calendar
  set
    total_days = v_total,
    week_no = (((v_total - 1) / 7) + 1),
    day_no = (((v_total - 1) % 7) + 1),
    updated_at = now()
  where team_id = p_team_id
  returning * into v_calendar;

  return jsonb_build_object(
    'weekNo', v_calendar.week_no,
    'dayNo', v_calendar.day_no,
    'totalDays', v_calendar.total_days
  );
end;
$$;

create or replace function public.pm_log_event(
  p_team_id uuid,
  p_category text,
  p_title text,
  p_detail text default null,
  p_accent text default 'green'
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calendar public.pm_calendar%rowtype;
begin
  perform public.pm_ensure_calendar(p_team_id);

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id;

  insert into public.pm_event_feed (
    team_id,
    category,
    accent,
    title,
    detail,
    week_no,
    day_no
  ) values (
    p_team_id,
    coalesce(p_category, 'system'),
    coalesce(p_accent, 'green'),
    p_title,
    p_detail,
    coalesce(v_calendar.week_no, 1),
    coalesce(v_calendar.day_no, 1)
  );
end;
$$;

grant execute on function public.pm_ensure_calendar(uuid) to service_role;
grant execute on function public.pm_advance_time(uuid, integer) to service_role;
grant execute on function public.pm_log_event(uuid, text, text, text, text) to service_role;

revoke insert, update, delete on public.pm_calendar from anon, authenticated;
revoke insert, update, delete on public.pm_event_feed from anon, authenticated;
