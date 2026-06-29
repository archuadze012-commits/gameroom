-- Academy was underpriced for the value it delivers (cheapest path to elite via
-- high-potential youth). Steeper pricing:
--   signing  = 200k + talent*35k + max(0, potential-60)*12k   (was 80k + t*10k + growth*2.5k)
--   academy facility upgrade base 380k → 800k
-- (TS getFacilityUpgradeCostGel mirrors the new base for display.)

-- 1. Facility upgrade cost (DB is the source of truth for the charge).
create or replace function public.pm_facility_upgrade_cost(p_sprite_key text, p_level smallint)
 returns bigint
 language plpgsql
 immutable
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_base bigint;
begin
  v_base := case p_sprite_key
    when 'arena' then 620000
    when 'market' then 420000
    when 'academy' then 800000
    when 'training' then 510000
    when 'finance' then 300000
    when 'league' then 260000
    when 'media' then 220000
    else 300000
  end;
  return round(v_base * power(1.42, greatest(1, p_level)::numeric - 1))::bigint;
end;
$function$;

-- 2. Prospect signing cost — new formula in the generator.
create or replace function public.pm_ensure_academy_youth(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing integer;
  v_level smallint := 1;
  v_scout smallint := 0;
  v_target integer;
  v_cap integer;
  v_need integer;
begin
  select coalesce(level, 1) into v_level
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = 'academy';
  v_level := coalesce(v_level, 1);

  select coalesce(max(level), 0) into v_scout
  from public.pm_staff
  where team_id = p_team_id and role_key = 'youth_scout';
  v_scout := coalesce(v_scout, 0);

  v_target := 2 + v_level;
  v_cap := least(8, 3 + v_scout);

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
    (200000 + p.talent * 35000
      + greatest(0, least(99, p.ovr_base + public.pm_player_ovr_growth_cap(p.talent)) - 60) * 12000)::bigint,
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

-- 3. Reprice currently-listed prospects to the new formula.
update public.pm_academy_prospects
set signing_cost = (200000 + talent * 35000 + greatest(0, potential_ovr - 60) * 12000)::bigint
where status = 'active';
