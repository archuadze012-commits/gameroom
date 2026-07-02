-- PlayManager: fix career_end_age population + legend repack leak.
--
-- Bug A (immortal careers + fail-open career window): career_end_age was only
-- backfilled once at migration time; pm_buy_market_player and pm_open_pack mint
-- / assign players without setting it. A NULL career_end_age player is never
-- retired by pm_process_career_ends (age >= NULL-1 is never true) and the
-- renew/release window guard (age < NULL-1 → NULL → not raised) FAILS OPEN, so
-- renew/release run outside any valid window. Fix: populate career_end_age on
-- every acquisition, backfill existing NULLs, and add an explicit NULL guard to
-- the window checks.
--
-- Bug B (legend repack leak): pm_open_pack draws unowned active players but did
-- not exclude pending_repack=true legends (admin-reserved after a legend career
-- end). The market API already excludes them; the pack did not, so a reserved
-- legend could be handed to a pack opener and reset to age 18. Fix: exclude
-- pending_repack from both pack draw queries.

-- 0. Backfill any pre-existing NULLs across the whole pool.
update public.pm_players
set career_end_age = public.pm_player_career_end_age(coalesce(talent, 8)::smallint)
where career_end_age is null;

-- 1. pm_buy_market_player — set career_end_age on acquisition.
create or replace function public.pm_buy_market_player(p_team_id uuid, p_player jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_player_id uuid;
  v_owner_id uuid;
  v_price bigint;
  v_position text;
  v_age smallint;
  v_current_total_days integer := 1;
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');
  v_age := greatest(15, least(50, coalesce((p_player->>'age')::smallint, 18)));

  if v_price <= 0 then raise exception 'invalid_price'; end if;
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  perform public.pm_ensure_calendar(p_team_id);

  select total_days
  into v_current_total_days
  from public.pm_calendar
  where team_id = p_team_id;

  insert into public.pm_players (
    normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source,
    ovr_base, ovr_current, age, base_transfer_value_gel, current_transfer_value_gel
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    coalesce((p_player->>'is_real')::boolean, true),
    coalesce((p_player->>'talent')::smallint, 8),
    nullif(p_player->>'ea_fc_ovr', '')::smallint,
    coalesce(p_player->>'ovr_source', 'ea_fc'),
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_base')::smallint,
    v_age,
    v_price,
    v_price
  )
  on conflict (normalized_name) where is_real = true do update
    set display_name = excluded.display_name
  returning id, owner_id into v_player_id, v_owner_id;

  if v_owner_id = p_team_id then
    raise exception 'player_owned';
  end if;

  if v_owner_id is not null and v_owner_id != p_team_id then
    raise exception 'player_unavailable';
  end if;

  perform public.pm_debit(p_team_id, v_price, 'transfer_buy:' || (p_player->>'normalized_name'));

  update public.pm_players
  set
    owner_id = p_team_id,
    age_started_total_days = v_current_total_days,
    career_end_age = coalesce(career_end_age, public.pm_player_career_end_age(coalesce(talent, 8)::smallint)),
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), v_position, 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_price);
end;
$function$;

-- 2. pm_open_pack — exclude pending_repack legends and set career_end_age.
create or replace function public.pm_open_pack(p_team_id uuid, p_pack_id integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pack public.pm_packs%rowtype;
  v_cost bigint;
  v_count int;
  v_weights jsonb;
  v_total numeric;
  v_i int;
  v_roll numeric;
  v_acc numeric;
  v_talent int;
  v_pid uuid;
  v_received uuid[] := '{}';
  k text;
begin
  select * into v_pack from public.pm_packs where id = p_pack_id;
  if v_pack.id is null then raise exception 'pack_not_found'; end if;

  v_cost := coalesce(v_pack.cost_pm, 0);
  if v_cost > 0 then
    perform public.pm_debit(p_team_id, v_cost, 'pack_open:' || v_pack.id);
  end if;

  v_count := coalesce(v_pack.player_count, 5);
  v_weights := coalesce(v_pack.rarity_weights, '{"1":1}'::jsonb);
  select coalesce(sum(value::numeric), 0) into v_total from jsonb_each_text(v_weights);
  if v_total <= 0 then v_total := 1; end if;

  for v_i in 1..v_count loop
    v_roll := random() * v_total;
    v_acc := 0;
    v_talent := null;
    for k in select key from jsonb_each_text(v_weights) order by key::int loop
      v_acc := v_acc + (v_weights->>k)::numeric;
      if v_roll <= v_acc then v_talent := k::int; exit; end if;
    end loop;
    v_talent := coalesce(v_talent, 1);

    select id into v_pid from public.pm_players
      where owner_id is null and status = 'active' and talent = v_talent
        and coalesce(pending_repack, false) = false
      order by random() limit 1 for update skip locked;
    if v_pid is null then
      select id into v_pid from public.pm_players
        where owner_id is null and status = 'active'
          and coalesce(pending_repack, false) = false
        order by abs(coalesce(talent, 1) - v_talent), random() limit 1 for update skip locked;
    end if;
    exit when v_pid is null;

    update public.pm_players
      set owner_id = p_team_id, age = 18,
          career_end_age = coalesce(career_end_age, public.pm_player_career_end_age(coalesce(talent, 1)::smallint))
      where id = v_pid;
    insert into public.pm_squads (team_id, player_id, position)
      select p_team_id, v_pid, (case upper(coalesce(primary_position, 'CM'))
        when 'LM' then 'LW' when 'RM' then 'RW' when 'CF' then 'ST'
        when 'LWB' then 'LB' when 'RWB' then 'RB' when 'AM' then 'CAM'
        when 'GK' then 'GK' when 'CB' then 'CB' when 'LB' then 'LB' when 'RB' then 'RB'
        when 'CDM' then 'CDM' when 'CM' then 'CM' when 'CAM' then 'CAM'
        when 'LW' then 'LW' when 'RW' then 'RW' when 'ST' then 'ST'
        else 'CM' end)
      from public.pm_players where id = v_pid
      on conflict do nothing;
    v_received := array_append(v_received, v_pid);
  end loop;

  insert into public.pm_pack_openings (team_id, pack_id, players_received)
    values (p_team_id, p_pack_id, v_received);

  return jsonb_build_object(
    'packId', p_pack_id, 'cost', v_cost,
    'received', v_received, 'count', coalesce(array_length(v_received, 1), 0)
  );
end;
$function$;

-- 3. pm_career_renew — explicit NULL guard on the career window.
create or replace function public.pm_career_renew(p_team_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_player public.pm_players%rowtype;
  v_cost bigint;
begin
  if not exists (select 1 from public.pm_squads s where s.team_id = p_team_id and s.player_id = p_player_id) then
    raise exception 'player_not_found';
  end if;
  select * into v_player from public.pm_players where id = p_player_id for update;
  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.career_end_age is null or v_player.age < v_player.career_end_age - 1 then
    raise exception 'not_in_career_window';
  end if;

  v_cost := round(coalesce(v_player.base_transfer_value_gel, 0) * 0.5)::bigint;
  if v_cost > 0 then
    perform public.pm_debit(p_team_id, v_cost, 'career_renewal');
  end if;

  update public.pm_players
  set career_end_age = career_end_age + 2,
      career_notified = false
  where id = p_player_id;

  return jsonb_build_object('careerEndAge', v_player.career_end_age + 2, 'cost', v_cost);
end;
$function$;

-- 4. pm_career_release — explicit NULL guard on the career window.
create or replace function public.pm_career_release(p_team_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_player public.pm_players%rowtype;
  v_comp bigint;
  v_dest text;
begin
  if not exists (select 1 from public.pm_squads s where s.team_id = p_team_id and s.player_id = p_player_id) then
    raise exception 'player_not_found';
  end if;
  select * into v_player from public.pm_players where id = p_player_id for update;
  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.career_end_age is null or v_player.age < v_player.career_end_age - 1 then
    raise exception 'not_in_career_window';
  end if;

  v_comp := round(coalesce(v_player.base_transfer_value_gel, 0) / 3.0)::bigint;
  if v_comp > 0 then
    perform public.pm_credit(p_team_id, v_comp, 'career_release_comp');
  end if;

  if v_player.talent >= 12 then
    update public.pm_players set owner_id = null, pending_repack = true, available_via_career = false, career_notified = false where id = p_player_id;
    v_dest := 'repack';
  elsif v_player.talent in (10, 11) then
    update public.pm_players set owner_id = null, available_via_career = true, pending_repack = false, career_notified = false where id = p_player_id;
    v_dest := 'free_agent';
  else
    update public.pm_players set owner_id = null, status = 'retired', career_notified = false where id = p_player_id;
    v_dest := 'retired';
  end if;

  delete from public.pm_squads where team_id = p_team_id and player_id = p_player_id;

  return jsonb_build_object('comp', v_comp, 'destination', v_dest);
end;
$function$;

-- Preserve the tightened grants from 20260710a for the replaced functions.
revoke execute on function public.pm_buy_market_player(uuid, jsonb) from anon, authenticated, public;
grant  execute on function public.pm_buy_market_player(uuid, jsonb) to service_role;
revoke execute on function public.pm_open_pack(uuid, integer)       from anon, authenticated, public;
grant  execute on function public.pm_open_pack(uuid, integer)       to service_role;
revoke execute on function public.pm_career_renew(uuid, uuid)       from anon, authenticated, public;
grant  execute on function public.pm_career_renew(uuid, uuid)       to service_role;
revoke execute on function public.pm_career_release(uuid, uuid)     from anon, authenticated, public;
grant  execute on function public.pm_career_release(uuid, uuid)     to service_role;
