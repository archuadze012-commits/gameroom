alter table public.pm_players
  add column if not exists base_card_stats jsonb;

create or replace function public.pm_players_sync_card_stats()
returns trigger
language plpgsql
as $$
declare
  v_position text := upper(coalesce(nullif(new.primary_position, ''), 'CM'));
  v_should_seed_base boolean := false;
  v_should_seed_current boolean := false;
begin
  if tg_op = 'INSERT' then
    v_should_seed_base := new.base_card_stats is null or new.base_card_stats = '{}'::jsonb;
    v_should_seed_current := new.card_stats is null or new.card_stats = '{}'::jsonb;
  else
    v_should_seed_base :=
      new.base_card_stats is null
      or new.base_card_stats = '{}'::jsonb
      or (
        new.ovr_base is distinct from old.ovr_base
        and coalesce(new.base_card_stats, '{}'::jsonb) = coalesce(old.base_card_stats, '{}'::jsonb)
      )
      or (
        new.primary_position is distinct from old.primary_position
        and coalesce(new.base_card_stats, '{}'::jsonb) = coalesce(old.base_card_stats, '{}'::jsonb)
      );

    v_should_seed_current :=
      new.card_stats is null
      or new.card_stats = '{}'::jsonb
      or (
        new.ovr_current is distinct from old.ovr_current
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      )
      or (
        new.owner_id is distinct from old.owner_id
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      );
  end if;

  if v_should_seed_base then
    new.base_card_stats := public.pm_player_seed_card_stats(
      v_position,
      coalesce(new.ovr_base, new.ovr_current, 40)::smallint
    );
  end if;

  new.ovr_base := public.pm_player_overall_from_stats(
    v_position,
    new.base_card_stats,
    coalesce(new.ovr_base, new.ovr_current, 40)::smallint
  );

  if new.owner_id is null then
    new.card_stats := new.base_card_stats;
  elsif v_should_seed_current then
    new.card_stats := coalesce(
      new.base_card_stats,
      public.pm_player_seed_card_stats(v_position, new.ovr_base)
    );
  end if;

  new.ovr_current := public.pm_player_overall_from_stats(
    v_position,
    new.card_stats,
    new.ovr_base
  );

  return new;
end;
$$;

drop trigger if exists pm_players_sync_card_stats on public.pm_players;
create trigger pm_players_sync_card_stats
before insert or update of primary_position, owner_id, ovr_base, ovr_current, base_card_stats, card_stats
on public.pm_players
for each row
execute function public.pm_players_sync_card_stats();

with prepared as (
  select
    p.id,
    upper(coalesce(nullif(p.primary_position, ''), 'CM')) as position_key,
    coalesce(
      p.base_card_stats,
      p.card_stats,
      public.pm_player_seed_card_stats(
        upper(coalesce(nullif(p.primary_position, ''), 'CM')),
        p.ovr_base::smallint
      )
    ) as next_base_stats,
    case
      when p.owner_id is null then coalesce(
        p.base_card_stats,
        p.card_stats,
        public.pm_player_seed_card_stats(
          upper(coalesce(nullif(p.primary_position, ''), 'CM')),
          p.ovr_base::smallint
        )
      )
      else coalesce(
        p.card_stats,
        p.base_card_stats,
        public.pm_player_seed_card_stats(
          upper(coalesce(nullif(p.primary_position, ''), 'CM')),
          p.ovr_base::smallint
        )
      )
    end as next_current_stats
  from public.pm_players p
)
update public.pm_players p
set
  base_card_stats = prepared.next_base_stats,
  card_stats = prepared.next_current_stats,
  ovr_base = public.pm_player_overall_from_stats(
    prepared.position_key,
    prepared.next_base_stats,
    p.ovr_base::smallint
  ),
  ovr_current = public.pm_player_overall_from_stats(
    prepared.position_key,
    prepared.next_current_stats,
    public.pm_player_overall_from_stats(
      prepared.position_key,
      prepared.next_base_stats,
      p.ovr_base::smallint
    )
  ),
  base_transfer_value_gel = public.pm_player_base_transfer_value_gel(
    public.pm_player_overall_from_stats(
      prepared.position_key,
      prepared.next_base_stats,
      p.ovr_base::smallint
    )
  ),
  current_transfer_value_gel = public.pm_player_current_transfer_value_gel(
    public.pm_player_overall_from_stats(
      prepared.position_key,
      prepared.next_base_stats,
      p.ovr_base::smallint
    ),
    public.pm_player_overall_from_stats(
      prepared.position_key,
      prepared.next_current_stats,
      public.pm_player_overall_from_stats(
        prepared.position_key,
        prepared.next_base_stats,
        p.ovr_base::smallint
      )
    )
  )
from prepared
where p.id = prepared.id;

create or replace function public.pm_buy_market_player(
  p_team_id uuid,
  p_player jsonb
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player_id uuid;
  v_owner_id uuid;
  v_price bigint;
  v_position text;
  v_current_total_days integer := 1;
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');

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
    18,
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
$$;

create or replace function public.pm_sell_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_value bigint;
  v_sale bigint;
begin
  select * into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_value := v_player.current_transfer_value_gel;
  v_sale := greatest(0, floor(v_value * 0.85)::bigint);

  update public.pm_players
  set
    owner_id = null,
    age = case when is_real then 18 else age end,
    age_started_total_days = case when is_real then null else age_started_total_days end,
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = p_player_id;

  delete from public.pm_squads
  where player_id = p_player_id and team_id = p_team_id;

  if v_sale > 0 then
    perform public.pm_credit(p_team_id, v_sale, 'transfer_sell:' || v_player.normalized_name);
  end if;

  return jsonb_build_object('playerId', v_player.id, 'amount', v_sale);
end;
$$;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_squad_position text;
  v_position text;
  v_staff_training_pct integer := 0;
  v_extra_roll_applied boolean := false;
  v_rolls integer := 1;
  v_old_ovr smallint;
  v_new_ovr smallint;
  v_cap_ovr smallint;
  v_focus text[];
  v_label text;
  v_current_value integer;
  v_stat_gain integer := 0;
  v_candidate jsonb;
  v_card_stats jsonb;
  v_improved_stats text[] := '{}';
begin
  select p.*
  into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  select s.position
  into v_squad_position
  from public.pm_squads s
  where s.player_id = p_player_id and s.team_id = p_team_id
  order by s.id asc
  limit 1;

  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then
    raise exception 'player_unavailable';
  end if;

  v_position := upper(coalesce(nullif(v_player.primary_position, ''), v_squad_position, 'CM'));

  select coalesce(sum(
    case
      when s.role_key = 'gk_coach' and v_position = 'GK' then s.level * 6
      when s.role_key = 'defence_coach' and v_position in ('CB', 'LB', 'RB', 'CDM') then s.level * 5
      when s.role_key = 'attack_coach' and v_position in ('LW', 'RW', 'ST', 'CF', 'CAM', 'AM', 'LM', 'RM') then s.level * 5
      else 0
    end
  ), 0)::integer
  into v_staff_training_pct
  from public.pm_staff s
  where s.team_id = p_team_id;

  if v_staff_training_pct > 0 and random() < least(0.9, v_staff_training_pct::numeric / 100.0) then
    v_extra_roll_applied := true;
    v_rolls := 2;
  end if;

  v_old_ovr := v_player.ovr_current;
  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);
  v_card_stats := coalesce(
    v_player.card_stats,
    v_player.base_card_stats,
    public.pm_player_seed_card_stats(v_position, v_player.ovr_base)
  );

  if v_old_ovr >= v_cap_ovr then
    raise exception 'player_maxed';
  end if;

  v_focus := public.pm_player_training_focus(v_position);

  foreach v_label in array v_focus loop
    exit when v_stat_gain >= v_rolls;

    v_current_value := coalesce((v_card_stats ->> v_label)::integer, 35);
    if v_current_value >= 99 then
      continue;
    end if;

    v_candidate := jsonb_set(v_card_stats, array[v_label], to_jsonb(v_current_value + 1), true);
    v_new_ovr := public.pm_player_overall_from_stats(v_position, v_candidate, v_old_ovr);

    if v_new_ovr > v_cap_ovr then
      continue;
    end if;

    v_card_stats := v_candidate;
    v_stat_gain := v_stat_gain + 1;
    v_improved_stats := array_append(v_improved_stats, v_label);
  end loop;

  if v_stat_gain = 0 then
    raise exception 'player_maxed';
  end if;

  v_new_ovr := public.pm_player_overall_from_stats(v_position, v_card_stats, v_old_ovr);

  update public.pm_players
  set
    card_stats = v_card_stats,
    ovr_current = v_new_ovr,
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr),
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id
  returning * into v_player;

  return jsonb_build_object(
    'playerId', v_player.id,
    'ovrCurrent', v_player.ovr_current,
    'currentTransferValueGel', v_player.current_transfer_value_gel,
    'fatigue', v_player.fatigue,
    'morale', v_player.morale,
    'ovrGain', greatest(0, v_player.ovr_current - v_old_ovr),
    'statGain', v_stat_gain,
    'improvedStats', v_improved_stats,
    'staffTrainingBonusPct', v_staff_training_pct,
    'positionCoachApplied', v_extra_roll_applied
  );
end;
$$;
