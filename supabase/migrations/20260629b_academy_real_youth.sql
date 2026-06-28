-- Academy moves from generated VIRTUAL prospects to the real unowned pool.
-- Academy youth = unowned real players with real_age <= 19 AND talent <= 8
-- (below elite). They are reserved as prospects (owner_id stays null until signed)
-- and enter the squad at the fixed youth age 15. Elite+ youth and all 20+ players
-- stay in the free-agent channel.

-- 1. Reference the real player a prospect points to (null = legacy virtual row).
alter table public.pm_academy_prospects
  add column if not exists player_id uuid references public.pm_players(id) on delete cascade;

-- 2. Clear leftover virtual (unsigned, no real player) prospects so academies
--    refill from the real youth pool.
delete from public.pm_academy_prospects
where status = 'active' and player_id is null;

-- 3. Top a team's academy up to 3 active prospects drawn from the real youth pool.
create or replace function public.pm_ensure_academy_youth(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing integer;
  v_need integer;
begin
  select count(*) into v_existing
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active';

  v_need := 3 - v_existing;
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
    and p.talent between 1 and 8
    and not exists (
      select 1 from public.pm_academy_prospects ap
      where ap.player_id = p.id and ap.status = 'active'
    )
  order by random()
  limit v_need;
end;
$$;

-- 4. Sign: assign the reserved real player to the team at youth age 15. Falls back
--    to the legacy create-new-player path for old virtual rows (player_id null).
create or replace function public.pm_sign_academy_prospect(p_team_id uuid, p_prospect_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_prospect public.pm_academy_prospects%rowtype;
  v_player_id uuid;
  v_updated integer;
begin
  select * into v_prospect
  from public.pm_academy_prospects
  where id = p_prospect_id and team_id = p_team_id and status = 'active'
  for update;

  if v_prospect.id is null then
    raise exception 'player_not_found';
  end if;

  if v_prospect.signing_cost > 0 then
    perform public.pm_debit(p_team_id, v_prospect.signing_cost, 'academy_signing');
  end if;

  if v_prospect.player_id is not null then
    -- Reserved real player: claim it only if still unowned (guards against a
    -- concurrent free-agent/market purchase of the same card).
    update public.pm_players
    set owner_id = p_team_id, age = 15, status = 'active'
    where id = v_prospect.player_id and owner_id is null;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'player_unavailable';
    end if;
    v_player_id := v_prospect.player_id;
  else
    insert into public.pm_players (
      normalized_name, display_name, talent, ovr_base, ovr_current, age, owner_id
    ) values (
      v_prospect.normalized_name,
      v_prospect.display_name,
      v_prospect.talent,
      v_prospect.ovr_base,
      v_prospect.ovr_base,
      v_prospect.age,
      p_team_id
    )
    returning id into v_player_id;
  end if;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_prospect.position)
  on conflict (player_id) do nothing;

  update public.pm_academy_prospects set status = 'signed' where id = p_prospect_id;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_prospect.signing_cost, 'position', v_prospect.position);
end;
$function$;
