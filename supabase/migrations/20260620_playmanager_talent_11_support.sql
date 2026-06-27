alter table public.pm_players
  drop constraint if exists pm_players_talent_check;

alter table public.pm_players
  add constraint pm_players_talent_check
  check (talent between 1 and 11);

create or replace function public.pm_player_ovr_growth_cap(
  p_talent smallint
) returns integer
language sql
immutable
as $$
  select case
    when p_talent >= 11 then 30
    when p_talent = 10 then 25
    when p_talent = 9 then 20
    when p_talent = 8 then 15
    else (p_talent * 2) + 1
  end;
$$;
