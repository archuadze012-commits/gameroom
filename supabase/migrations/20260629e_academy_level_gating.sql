-- Academy facility level now drives prospect COUNT and QUALITY (talent cap), not
-- just development speed. Distinct from the scout (which gates free agents).
--   count   = 2 + academy_level   (L1→3 … L5→7)
--   talent cap = least(8, 3 + academy_level)  (L1→≤4 … L5→≤8)
-- real_age <= 19 and below-elite (<=8) still hold; the pool stays per-team and
-- only fills empty slots.
create or replace function public.pm_ensure_academy_youth(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing integer;
  v_level smallint := 1;
  v_target integer;
  v_cap integer;
  v_need integer;
begin
  select coalesce(level, 1) into v_level
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = 'academy';
  v_level := coalesce(v_level, 1);

  v_target := 2 + v_level;                 -- L1→3 … L5→7
  v_cap := least(8, 3 + v_level);          -- L1→≤4 … L5→≤8

  select count(*) into v_existing
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active';

  v_need := v_target - v_existing;
  if v_need <= 0 then
    return;
  end if;

  insert into public.pm_academy_prospects (
    team_id, player_id, normalized_name, display_name, position,
    age, talent, ovr_base, potential_ovr, signing_cost, status
  )
  select
    p_team_id,
    p.id,
    p.normalized_name,
    p.display_name,
    upper(coalesce(nullif(p.primary_position, ''), 'CM')),
    15,
    p.talent,
    p.ovr_base,
    least(99, p.ovr_base + public.pm_player_ovr_growth_cap(p.talent)),
    (80000 + p.talent * 10000
      + (least(99, p.ovr_base + public.pm_player_ovr_growth_cap(p.talent)) - p.ovr_base) * 2500)::bigint,
    'active'
  from public.pm_players p
  where p.owner_id is null
    and p.status = 'active'
    and p.is_real
    and coalesce(p.pending_repack, false) = false
    and coalesce(p.real_age, 99) <= 19
    and p.talent between 1 and v_cap
    and not exists (
      select 1 from public.pm_academy_prospects ap
      where ap.player_id = p.id and ap.status = 'active'
    )
  order by random()
  limit v_need;
end;
$$;
