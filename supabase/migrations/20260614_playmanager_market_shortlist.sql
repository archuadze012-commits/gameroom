create table if not exists public.pm_market_shortlist (
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  player_key text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, player_key)
);

alter table public.pm_market_shortlist enable row level security;

drop policy if exists "pm_market_shortlist_owner_select" on public.pm_market_shortlist;
create policy "pm_market_shortlist_owner_select"
on public.pm_market_shortlist
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create or replace function public.pm_toggle_market_shortlist(
  p_team_id uuid,
  p_player_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1
    from public.pm_market_shortlist
    where team_id = p_team_id and player_key = p_player_key
  ) into v_exists;

  if v_exists then
    delete from public.pm_market_shortlist
    where team_id = p_team_id and player_key = p_player_key;

    return jsonb_build_object('shortlisted', false, 'playerKey', p_player_key);
  end if;

  insert into public.pm_market_shortlist (team_id, player_key)
  values (p_team_id, p_player_key)
  on conflict do nothing;

  return jsonb_build_object('shortlisted', true, 'playerKey', p_player_key);
end;
$$;

grant execute on function public.pm_toggle_market_shortlist(uuid, text) to service_role;

revoke insert, update, delete on public.pm_market_shortlist from anon, authenticated;
