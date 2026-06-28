-- Phase 5: assistant-driven skill_moves development.
-- One-time reset: snapshot the current skill_moves as the personal cap, drop the
-- live value to the floor (1). The manager assistant (head_coach) regrows it over
-- time up to that cap — never beyond. Idempotent via `where skill_moves_cap is null`.
update public.pm_players
set skill_moves_cap = skill_moves,
    skill_moves = 1,
    skill_dev_pct = 0
where skill_moves_cap is null;

-- Passive development applied as game-time advances. Completion age by assistant
-- level: L5→25, L4→27, L3→28, L2→29, L1→30, none→31. 84 game-days = 1 virtual year.
-- Progress accumulates (survives level changes); skill_moves is derived from it.
create or replace function public.pm_grant_skill_development(p_team_id uuid, p_days integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_level smallint;
  v_completion smallint;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_step numeric;
begin
  select coalesce(max(level), 0) into v_level
  from public.pm_staff where team_id = p_team_id and role_key = 'head_coach';
  v_completion := case v_level when 5 then 25 when 4 then 27 when 3 then 28 when 2 then 29 when 1 then 30 else 31 end;
  v_step := v_days::numeric / (84.0 * (v_completion - 18));

  update public.pm_players p
  set skill_dev_pct = least(1, p.skill_dev_pct + v_step),
      skill_moves = least(p.skill_moves_cap,
        greatest(1, 1 + round(least(1, p.skill_dev_pct + v_step) * (p.skill_moves_cap - 1))))::smallint
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.skill_moves_cap is not null
    and p.skill_moves_cap > 1
    and p.skill_dev_pct < 1;
end;
$$;
