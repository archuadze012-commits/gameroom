-- PlayManager: real-players-only economy — 4th division, low-level EAFC draft.
--
-- The game is moving to a real-players-only world. Instead of generating virtual
-- starter squads, new teams are drafted from the already-seeded pool of unowned
-- real EAFC players (pm_players where is_real=true and owner_id is null).
--
-- This migration:
--   1. Adds a 4th division (needed by the academy talent×division bands).
--   2. pm_draft_squad(team) — fills a team up to a full 4-3-3 + subs squad with
--      low-level (OVR 55-64) real players from the free pool. Career-start rule:
--      every drafted player's in-game age is set to 18.
--   3. pm_create_team_v2(user, name) — creates team + wallet + drafts the squad.

-- 1. Fourth division (top→bottom = level 1..4). Academy bands key off level.
insert into public.pm_divisions (name, level) values ('დივიზიონი 4', 4)
on conflict do nothing;

-- 2. Draft helper: assign unowned real players from the pool to fill the squad.
create or replace function public.pm_draft_squad(
  p_team_id uuid,
  p_min_ovr smallint default 55,
  p_max_ovr smallint default 64
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- target multiset: GK2 CB3 LB1 RB1 CDM1 CM3 LW1 RW1 ST2 = 15 (4-3-3 + 4 subs)
  v_targets jsonb := '{"GK":2,"CB":3,"LB":1,"RB":1,"CDM":1,"CM":3,"LW":1,"RW":1,"ST":2}';
  v_pos     text;
  v_need    int;
  v_have    int;
  v_pid     uuid;
  v_drafted int := 0;
begin
  for v_pos, v_need in select key, value::int from jsonb_each_text(v_targets) loop
    select count(*) into v_have
      from pm_squads s
      where s.team_id = p_team_id and s.position = v_pos;

    while v_have < v_need loop
      select id into v_pid
        from pm_players
        where is_real = true
          and owner_id is null
          and status = 'active'
          and primary_position = v_pos
          and ovr_base between p_min_ovr and p_max_ovr
        order by random()
        limit 1
        for update skip locked;

      exit when v_pid is null; -- pool exhausted for this position

      update pm_players set owner_id = p_team_id, age = 18 where id = v_pid;
      insert into pm_squads (team_id, player_id, position)
        values (p_team_id, v_pid, v_pos)
        on conflict do nothing;

      v_have := v_have + 1;
      v_drafted := v_drafted + 1;
    end loop;
  end loop;

  return v_drafted;
end;
$$;

-- 3. Create a team and draft its starter squad from the real pool.
create or replace function public.pm_create_team_v2(
  p_user_id   uuid,
  p_team_name text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id uuid;
  v_pack_id int;
  v_ids     uuid[];
  v_filled  int;
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

  perform public.pm_draft_squad(v_team_id);

  select count(*) into v_filled from pm_squads where team_id = v_team_id;
  if v_filled < 11 then
    raise exception 'draft_incomplete';
  end if;

  select array_agg(player_id) into v_ids from pm_squads where team_id = v_team_id;
  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, coalesce(v_ids, '{}'));

  return v_team_id;
end;
$$;

grant execute on function public.pm_create_team_v2(uuid, text) to authenticated;
