-- PlayManager fix: canonical pm_create_team
--
-- Problem: two `pm_create_team` definitions existed
--   * 20260613_playmanager_real_football_economy.sql  -> balance 1_000_000, full real-football columns
--   * 20260613_playmanager_rpcs.sql                    -> balance 1000, missing is_real/ea_fc columns
-- Supabase applies migrations in lexicographic filename order, so `...rpcs.sql`
-- (the simplified, 1000-balance version) ran last and won — contradicting the app
-- constant STARTING_TEAM_BALANCE_GEL = 1_000_000 and dropping the real-football data.
--
-- This migration re-asserts the intended canonical version so it wins regardless of
-- earlier ordering, and adds a loud guard: if any generated player fails to insert
-- (e.g. a global normalized_name collision), the whole team creation rolls back with
-- `squad_incomplete` instead of silently producing a team with fewer than 15 players.

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
  v_team_id     uuid;
  v_player      jsonb;
  v_player_id   uuid;
  v_pack_id     int;
  v_player_ids  uuid[] := '{}';
  v_is_real     boolean;
  v_ea_fc_ovr   smallint;
  v_ovr_base    smallint;
  v_ovr_current smallint;
  v_expected    int;
begin
  if auth.uid() != p_user_id then raise exception 'forbidden'; end if;
  if exists (select 1 from pm_teams where user_id = p_user_id) then
    raise exception 'team_exists';
  end if;

  v_expected := coalesce(jsonb_array_length(p_players), 0);

  insert into pm_teams (user_id, name) values (p_user_id, p_team_name)
    returning id into v_team_id;

  -- Welcome wallet: 1,000,000 PM₾ (matches STARTING_TEAM_BALANCE_GEL).
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

  -- Loud failure instead of silent corruption: never hand back a partial squad.
  if coalesce(array_length(v_player_ids, 1), 0) <> v_expected then
    raise exception 'squad_incomplete';
  end if;

  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, v_player_ids);

  return v_team_id;
end;
$$;

grant execute on function public.pm_create_team(uuid, text, jsonb) to authenticated;
