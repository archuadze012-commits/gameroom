-- PlayManager: career-end system (replaces contract_seasons) + free-agent gating
-- support columns. Career-end age scales with talent class; one season before it the
-- manager is notified and must renew (½ base value) or part ways (⅓ base comp).
-- High-tier non-renewals route specially: world_class/rising_star → free agents
-- (available_via_career), legend → admin repack (pending_repack, never on market).

-- ── Drop the old contract system ────────────────────────────────────────────
drop function if exists public.pm_renew_player_contract(uuid, uuid, integer);
alter table public.pm_players drop column if exists contract_seasons;

-- ── Career-end fields ───────────────────────────────────────────────────────
alter table public.pm_players
  add column if not exists career_end_age smallint,
  add column if not exists career_notified boolean not null default false,
  add column if not exists available_via_career boolean not null default false,
  add column if not exists pending_repack boolean not null default false;

create or replace function public.pm_player_career_end_age(p_talent smallint)
returns smallint language sql immutable as $$
  select case
    when p_talent >= 12 then 42
    when p_talent in (10, 11) then 40
    when p_talent between 7 and 9 then 38
    when p_talent between 4 and 6 then 35
    else 32
  end::smallint;
$$;
grant execute on function public.pm_player_career_end_age(smallint) to authenticated, service_role;

update public.pm_players
set career_end_age = public.pm_player_career_end_age(talent)
where career_end_age is null;

-- ── Processing: notify on final season, auto-resolve when window passes ──────
create or replace function public.pm_process_career_ends(p_team_id uuid, p_days integer default 1)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rec record; v_notified integer := 0; v_released integer := 0;
begin
  for v_rec in
    select p.id, p.display_name from public.pm_players p join public.pm_squads s on s.player_id = p.id
    where s.team_id = p_team_id and not coalesce(p.career_notified, false)
      and p.age >= p.career_end_age - 1 and p.age < p.career_end_age
  loop
    perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' კარიერას ასრულებს',
      'ბოლო სეზონია — გააგრძელე (½ ფასი) ან დაემშვიდობე (⅓ კომპენსაცია)', 'gold');
    update public.pm_players set career_notified = true where id = v_rec.id;
    v_notified := v_notified + 1;
  end loop;

  for v_rec in
    select p.id, p.display_name, p.talent from public.pm_players p join public.pm_squads s on s.player_id = p.id
    where s.team_id = p_team_id and p.age >= p.career_end_age
  loop
    if v_rec.talent >= 12 then
      update public.pm_players set owner_id = null, pending_repack = true, available_via_career = false, career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დაასრულა კარიერა', 'ლეგენდა — ადმინს გადაეცა pack-ისთვის', 'red');
    elsif v_rec.talent in (10, 11) then
      update public.pm_players set owner_id = null, available_via_career = true, pending_repack = false, career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დატოვა კლუბი', 'თავისუფალი აგენტი (კარიერის დასასრული)', 'red');
    else
      update public.pm_players set owner_id = null, status = 'retired', career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დაასრულა კარიერა', 'პენსიაზე გავიდა', 'red');
    end if;
    delete from public.pm_squads where team_id = p_team_id and player_id = v_rec.id;
    v_released := v_released + 1;
  end loop;

  return jsonb_build_object('notified', v_notified, 'released', v_released);
end; $$;
grant execute on function public.pm_process_career_ends(uuid, integer) to service_role;

-- ── Renew (½ base, +2 years) / Release (⅓ base comp, routed by class) ────────
create or replace function public.pm_career_renew(p_team_id uuid, p_player_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_player public.pm_players%rowtype; v_cost bigint;
begin
  if not exists (select 1 from public.pm_squads s where s.team_id = p_team_id and s.player_id = p_player_id) then raise exception 'player_not_found'; end if;
  select * into v_player from public.pm_players where id = p_player_id for update;
  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.age < v_player.career_end_age - 1 then raise exception 'not_in_career_window'; end if;
  v_cost := round(coalesce(v_player.base_transfer_value_gel, 0) * 0.5)::bigint;
  if v_cost > 0 then perform public.pm_debit(p_team_id, v_cost, 'career_renewal'); end if;
  update public.pm_players set career_end_age = career_end_age + 2, career_notified = false where id = p_player_id;
  return jsonb_build_object('careerEndAge', v_player.career_end_age + 2, 'cost', v_cost);
end; $$;
grant execute on function public.pm_career_renew(uuid, uuid) to service_role;

create or replace function public.pm_career_release(p_team_id uuid, p_player_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_player public.pm_players%rowtype; v_comp bigint; v_dest text;
begin
  if not exists (select 1 from public.pm_squads s where s.team_id = p_team_id and s.player_id = p_player_id) then raise exception 'player_not_found'; end if;
  select * into v_player from public.pm_players where id = p_player_id for update;
  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.age < v_player.career_end_age - 1 then raise exception 'not_in_career_window'; end if;
  v_comp := round(coalesce(v_player.base_transfer_value_gel, 0) / 3.0)::bigint;
  if v_comp > 0 then perform public.pm_credit(p_team_id, v_comp, 'career_release_comp'); end if;
  if v_player.talent >= 12 then
    update public.pm_players set owner_id = null, pending_repack = true, available_via_career = false, career_notified = false where id = p_player_id; v_dest := 'repack';
  elsif v_player.talent in (10, 11) then
    update public.pm_players set owner_id = null, available_via_career = true, pending_repack = false, career_notified = false where id = p_player_id; v_dest := 'free_agent';
  else
    update public.pm_players set owner_id = null, status = 'retired', career_notified = false where id = p_player_id; v_dest := 'retired';
  end if;
  delete from public.pm_squads where team_id = p_team_id and player_id = p_player_id;
  return jsonb_build_object('comp', v_comp, 'destination', v_dest);
end; $$;
grant execute on function public.pm_career_release(uuid, uuid) to service_role;

-- ── Season rollover: drop the old contract decrement (career-end replaces it) ─
create or replace function public.pm_reset_season_rows(p_team_id uuid, p_season_no integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team_name text;
begin
  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then raise exception 'team_not_found'; end if;
  delete from public.pm_match_history where team_id = p_team_id;
  delete from public.pm_season_rows where team_id = p_team_id;
  insert into public.pm_season_rows (team_id, club_name, played, won, drawn, lost, goals_for, goals_against, points, form_percent, row_order) values
    (p_team_id, v_team_name, 0, 0, 0, 0, 0, 0, 0, 100, 1),
    (p_team_id, 'North London', 0, 0, 0, 0, 0, 0, 0, 92, 2),
    (p_team_id, 'Royal Madrid', 0, 0, 0, 0, 0, 0, 0, 88, 3),
    (p_team_id, 'Milano Black', 0, 0, 0, 0, 0, 0, 0, 81, 4);
  update public.pm_season_state set season_no = p_season_no, is_completed = false, updated_at = now() where team_id = p_team_id;
end; $$;
