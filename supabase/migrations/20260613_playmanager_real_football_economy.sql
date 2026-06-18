-- PlayManager: real-football GEL economy and OVR-based player values

create or replace function public.pm_player_base_transfer_value_gel(
  p_ovr smallint
) returns bigint
language sql
immutable
set search_path = public, pg_temp
as $$
  select greatest(
    100000,
    least(
      100000000,
      round(
        (
          100000
          + (100000000 - 100000)
            * power(
                ((least(greatest(p_ovr::int, 40), 91) - 40)::numeric / (91 - 40)),
                5
              )
        ) / 50000
      )::bigint * 50000
    )
  );
$$;

create or replace function public.pm_player_current_transfer_value_gel(
  p_ovr_base smallint,
  p_ovr_current smallint
) returns bigint
language sql
immutable
set search_path = public, pg_temp
as $$
  select least(
    150000000,
    public.pm_player_base_transfer_value_gel(p_ovr_base)
      + least(greatest(p_ovr_current::int - p_ovr_base::int, 0), 25) * 2000000
  );
$$;

alter table public.pm_players
  add column if not exists ea_fc_ovr smallint check (ea_fc_ovr between 40 and 99),
  add column if not exists ovr_source text not null default 'generated'
    check (ovr_source in ('generated', 'ea_fc')),
  add column if not exists base_transfer_value_gel bigint not null default 100000
    check (base_transfer_value_gel > 0),
  add column if not exists current_transfer_value_gel bigint not null default 100000
    check (current_transfer_value_gel > 0);

create or replace function public.pm_sync_player_transfer_values()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_real then
    new.ea_fc_ovr := coalesce(new.ea_fc_ovr, new.ovr_base);
    new.ovr_source := 'ea_fc';
    new.ovr_base := new.ea_fc_ovr;
    if new.ovr_current is null or new.ovr_current < new.ovr_base then
      new.ovr_current := new.ovr_base;
    end if;
  else
    new.ea_fc_ovr := null;
    new.ovr_source := 'generated';
  end if;

  new.base_transfer_value_gel := public.pm_player_base_transfer_value_gel(new.ovr_base);
  new.current_transfer_value_gel :=
    public.pm_player_current_transfer_value_gel(new.ovr_base, new.ovr_current);

  return new;
end;
$$;

drop trigger if exists pm_players_sync_transfer_values on public.pm_players;
create trigger pm_players_sync_transfer_values
before insert or update of is_real, ea_fc_ovr, ovr_base, ovr_current
on public.pm_players
for each row
execute function public.pm_sync_player_transfer_values();

update public.pm_players
set
  ea_fc_ovr = case when is_real then coalesce(ea_fc_ovr, ovr_base) else null end,
  ovr_source = case when is_real then 'ea_fc' else 'generated' end,
  base_transfer_value_gel = public.pm_player_base_transfer_value_gel(
    case when is_real then coalesce(ea_fc_ovr, ovr_base) else ovr_base end
  ),
  current_transfer_value_gel = public.pm_player_current_transfer_value_gel(
    case when is_real then coalesce(ea_fc_ovr, ovr_base) else ovr_base end,
    ovr_current
  );

create index if not exists pm_players_real_ovr_idx
  on public.pm_players(is_real, ovr_base desc)
  where status = 'active';

-- pm_create_team: create team + GEL wallet + award starter pack in one transaction
create or replace function public.pm_create_team(
  p_user_id   uuid,
  p_team_name text,
  p_players   jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id    uuid;
  v_player     jsonb;
  v_player_id  uuid;
  v_pack_id    int;
  v_player_ids uuid[] := '{}';
  v_is_real     boolean;
  v_ea_fc_ovr   smallint;
  v_ovr_base    smallint;
  v_ovr_current smallint;
begin
  if auth.uid() != p_user_id then raise exception 'forbidden'; end if;
  if exists (select 1 from pm_teams where user_id = p_user_id) then
    raise exception 'team_exists';
  end if;

  insert into pm_teams (user_id, name) values (p_user_id, p_team_name)
    returning id into v_team_id;

  insert into pm_wallets (team_id, balance) values (v_team_id, 1000000);
  insert into pm_transactions (team_id, amount, reason)
    values (v_team_id, 1000000, 'სტარტერ ბონუსი');

  for v_player in select * from jsonb_array_elements(p_players) loop
    v_player_id := null;
    v_is_real := coalesce((v_player->>'is_real')::boolean, false);
    v_ea_fc_ovr := nullif(v_player->>'ea_fc_ovr', '')::smallint;
    v_ovr_base := coalesce(v_ea_fc_ovr, (v_player->>'ovr_base')::smallint);
    v_ovr_current := coalesce((v_player->>'ovr_current')::smallint, v_ovr_base);

    insert into pm_players (
      normalized_name,
      display_name,
      is_real,
      talent,
      ea_fc_ovr,
      ovr_source,
      ovr_base,
      ovr_current,
      age
    ) values (
      v_player->>'normalized_name',
      v_player->>'display_name',
      v_is_real,
      (v_player->>'talent')::smallint,
      case when v_is_real then v_ovr_base else null end,
      case when v_is_real then 'ea_fc' else 'generated' end,
      v_ovr_base,
      v_ovr_current,
      (v_player->>'age')::smallint
    )
    on conflict (normalized_name) do nothing
    returning id into v_player_id;

    if v_player_id is not null then
      update pm_players set owner_id = v_team_id where id = v_player_id;
      insert into pm_squads (team_id, player_id, position)
        values (v_team_id, v_player_id, v_player->>'position')
        on conflict do nothing;
      v_player_ids := v_player_ids || v_player_id;
    end if;
  end loop;

  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, v_player_ids);

  return v_team_id;
end;
$$;

grant execute on function public.pm_player_base_transfer_value_gel(smallint)
  to authenticated, service_role;
grant execute on function public.pm_player_current_transfer_value_gel(smallint, smallint)
  to authenticated, service_role;
grant execute on function public.pm_create_team(uuid, text, jsonb)
  to authenticated;
