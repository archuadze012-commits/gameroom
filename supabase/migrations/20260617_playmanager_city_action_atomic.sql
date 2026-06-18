-- PlayManager fix #1: make a city action atomic.
--
-- Problem: runPlayManagerCityAction (TS) fired the action and its follow-ups as
-- separate, independent RPC calls — pm_run_city_action, pm_simulate_league_round,
-- award_xp, pm_credit, pm_advance_time, pm_log_event. They are NOT in one transaction,
-- so a failure midway leaves inconsistent state (cost debited but reward/XP lost, or
-- a simulated match with no calendar advance).
--
-- Fix: a single wrapper that runs the whole sequence inside one plpgsql function (=
-- one transaction). It rolls back as a unit on any failure. The heavy bonus engine
-- (getCombinedClubEffects) stays in TS; only the resulting *percentages* are passed in
-- and applied here as simple arithmetic, so no business logic is duplicated in SQL.
--
-- ⚠️ Requires `supabase db push` + testing of every city action (incl. league_sim).
--    The TS caller (runPlayManagerCityAction) is updated to call this in the same change.

create or replace function public.pm_run_city_action_full(
  p_team_id                 uuid,
  p_sprite_key              text,
  p_action                  text,
  p_user_id                 uuid,
  p_action_reward_bonus_pct numeric,
  p_season_reward_bonus_pct numeric,
  p_xp_base                 integer,
  p_training_xp_pct         numeric,
  p_training_affected       boolean,
  p_advance_days            integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action         jsonb;
  v_reward         bigint;
  v_season         jsonb := null;
  v_season_summary jsonb;
  v_extra_credit   bigint := 0;
  v_xp             integer := 0;
  v_calendar       jsonb;
begin
  -- Core action (atomic debit/credit + facility progress).
  v_action := public.pm_run_city_action(p_team_id, p_sprite_key, p_action);
  v_reward := coalesce((v_action->>'reward')::bigint, 0);

  -- League simulation (only for league_sim).
  if p_action = 'league_sim' then
    v_season := public.pm_simulate_league_round(p_team_id);
    v_season_summary := v_season -> 'seasonSummary';
    if v_season_summary is not null and v_season_summary <> 'null'::jsonb then
      v_extra_credit := v_extra_credit
        + floor(coalesce((v_season_summary->>'reward')::numeric, 0)
                * coalesce(p_season_reward_bonus_pct, 0) / 100)::bigint;
    end if;
  end if;

  -- Action reward bonus (percentage of the base reward).
  v_extra_credit := v_extra_credit
    + floor(v_reward * coalesce(p_action_reward_bonus_pct, 0) / 100)::bigint;

  -- XP (with optional training bonus, mirroring getXpRewardWithTrainingBonus).
  if coalesce(p_xp_base, 0) > 0 then
    if coalesce(p_training_affected, false) and coalesce(p_training_xp_pct, 0) > 0 then
      v_xp := p_xp_base + round(p_xp_base * p_training_xp_pct / 100)::integer;
    else
      v_xp := p_xp_base;
    end if;
  end if;

  if v_xp > 0 then
    perform public.award_xp(p_user_id, v_xp);
  end if;
  if v_extra_credit > 0 then
    perform public.pm_credit(p_team_id, v_extra_credit, 'city_bonus:' || p_action);
  end if;

  v_calendar := public.pm_advance_time(p_team_id, greatest(1, coalesce(p_advance_days, 1)));

  return jsonb_build_object(
    'action', v_action,
    'season', v_season,
    'extraCredit', v_extra_credit,
    'xp', v_xp,
    'calendar', v_calendar
  );
end;
$$;

grant execute on function public.pm_run_city_action_full(
  uuid, text, text, uuid, numeric, numeric, integer, numeric, boolean, integer
) to service_role;
