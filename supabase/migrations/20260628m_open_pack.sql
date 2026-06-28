-- Phase 7: shop pack opening — the main GEL sink + fodder source.
-- Draws players from the unowned real-player pool, weighted by the pack's
-- rarity_weights (talent). In-game GEL only. Pro-heavy packs feed the OVR-upgrade
-- fodder economy; a premium pack offers a shot at better cards.

create or replace function public.pm_open_pack(p_team_id uuid, p_pack_id integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
    -- roll a talent tier by weight
    v_roll := random() * v_total;
    v_acc := 0;
    v_talent := null;
    for k in select key from jsonb_each_text(v_weights) order by key::int loop
      v_acc := v_acc + (v_weights->>k)::numeric;
      if v_roll <= v_acc then v_talent := k::int; exit; end if;
    end loop;
    v_talent := coalesce(v_talent, 1);

    -- draw an unowned active player of that talent (fallback: nearest talent)
    select id into v_pid from public.pm_players
      where owner_id is null and status = 'active' and talent = v_talent
      order by random() limit 1 for update skip locked;
    if v_pid is null then
      select id into v_pid from public.pm_players
        where owner_id is null and status = 'active'
        order by abs(coalesce(talent, 1) - v_talent), random() limit 1 for update skip locked;
    end if;
    exit when v_pid is null;

    update public.pm_players set owner_id = p_team_id, age = 18 where id = v_pid;
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
$$;

-- Shop packs (idempotent inserts keyed by name).
insert into public.pm_packs (name, description, cost_pm, rarity_weights, player_count)
select 'Pro ფოდერ პაკი', 'იაფი Pro-კლასის ბარათები მოთამაშეების OVR აფგრეიდისთვის.',
       60000, '{"1":45,"2":35,"3":18,"4":2}'::jsonb, 5
where not exists (select 1 from public.pm_packs where name = 'Pro ფოდერ პაკი');

insert into public.pm_packs (name, description, cost_pm, rarity_weights, player_count)
select 'პრემიუმ პაკი', 'ნაკლები ბარათი, მაგრამ უკეთესი კლასის შანსი.',
       250000, '{"3":10,"4":25,"5":30,"6":20,"7":10,"8":4,"10":1}'::jsonb, 3
where not exists (select 1 from public.pm_packs where name = 'პრემიუმ პაკი');
