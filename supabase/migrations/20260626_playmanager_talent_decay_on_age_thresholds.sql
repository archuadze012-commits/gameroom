create or replace function public.pm_advance_time(
  p_team_id uuid,
  p_days integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calendar public.pm_calendar%rowtype;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_total integer;
  v_prev_total integer;
  v_prev_week integer;
  v_new_week integer;
  v_doctor_recovery_pct integer := 0;
  v_physio_recovery_pct integer := 0;
  v_psychologist_morale_pct integer := 0;
  v_fatigue_recovery integer := 0;
  v_morale_recovery integer := 0;
begin
  perform public.pm_ensure_calendar(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);

  select
    coalesce(sum(case when role_key = 'doctor' then level * 8 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'physiotherapist' then level * 7 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'psychologist' then level * 6 else 0 end), 0)::integer
  into v_doctor_recovery_pct, v_physio_recovery_pct, v_psychologist_morale_pct
  from public.pm_staff
  where team_id = p_team_id;

  v_fatigue_recovery := greatest(2, (v_days * 3) + floor((v_physio_recovery_pct * v_days)::numeric / 14.0)::integer);
  v_morale_recovery := greatest(0, floor((v_psychologist_morale_pct * v_days)::numeric / 12.0)::integer);

  update public.pm_players p
  set
    injury_matches = greatest(0, p.injury_matches - v_days - recovery.extra_days),
    status = case
      when greatest(0, p.injury_matches - v_days - recovery.extra_days) = 0 then 'active'
      else 'injured'
    end,
    morale = least(100, p.morale + least(8, v_days * 2) + v_morale_recovery)
  from public.pm_squads s
  cross join lateral (
    select case
      when v_doctor_recovery_pct > 0
       and random() < least(0.85, (v_doctor_recovery_pct::numeric / 100.0) * greatest(1, v_days))
      then 1
      else 0
    end as extra_days
  ) recovery
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.injury_matches > 0;

  update public.pm_players p
  set
    fatigue = greatest(0, p.fatigue - v_fatigue_recovery),
    morale = least(100, p.morale + v_morale_recovery)
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id
  for update;

  v_prev_week := v_calendar.week_no;
  v_prev_total := v_calendar.total_days;
  v_total := v_calendar.total_days + v_days;
  v_new_week := (((v_total - 1) / 7) + 1);

  update public.pm_calendar
  set
    total_days = v_total,
    week_no = v_new_week,
    day_no = (((v_total - 1) % 7) + 1),
    updated_at = now()
  where team_id = p_team_id
  returning * into v_calendar;

  update public.pm_players p
  set age_started_total_days = v_prev_total
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.age_started_total_days is null;

  update public.pm_players p
  set
    age = least(50, p.age + age_progress.years_gained),
    talent = greatest(
      1,
      p.talent
      - case when p.age < 32 and p.age + age_progress.years_gained >= 32 then 1 else 0 end
      - case when p.age < 36 and p.age + age_progress.years_gained >= 36 then 1 else 0 end
    )
  from public.pm_squads s
  cross join lateral (
    select greatest(
      0,
      floor(greatest(0, v_total - coalesce(p.age_started_total_days, v_prev_total))::numeric / 84.0)::integer
      - floor(greatest(0, v_prev_total - coalesce(p.age_started_total_days, v_prev_total))::numeric / 84.0)::integer
    ) as years_gained
  ) age_progress
  where s.player_id = p.id
    and s.team_id = p_team_id
    and age_progress.years_gained > 0;

  if v_new_week > v_prev_week then
    while v_prev_week < v_new_week loop
      v_prev_week := v_prev_week + 1;
      perform public.pm_apply_weekly_finance(p_team_id, v_prev_week);
    end loop;
  end if;

  return jsonb_build_object(
    'weekNo', v_calendar.week_no,
    'dayNo', v_calendar.day_no,
    'totalDays', v_calendar.total_days
  );
end;
$$;

grant execute on function public.pm_advance_time(uuid, integer) to service_role;
