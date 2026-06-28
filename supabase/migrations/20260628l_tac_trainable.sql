-- Phase 6: tac is now trainable. Stop auto-recomputing it (seed only when null);
-- grow it via the XP development pipeline alongside mini-stats.

CREATE OR REPLACE FUNCTION public.pm_players_sync_card_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_position text := upper(coalesce(nullif(new.primary_position, ''), 'CM'));
  v_should_seed_base boolean := false;
  v_should_seed_current boolean := false;
  v_lock_real_ea_ovr boolean :=
    coalesce(new.is_real, false)
    and lower(coalesce(new.ovr_source, '')) = 'ea_fc'
    and new.ea_fc_ovr is not null;
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
      coalesce(
        case when v_lock_real_ea_ovr then new.ea_fc_ovr end,
        new.ovr_base,
        new.ovr_current,
        40
      )::smallint
    );
  end if;

  if v_lock_real_ea_ovr then
    new.ovr_base := greatest(
      35,
      least(99, coalesce(new.ovr_base, new.ea_fc_ovr, new.ovr_current, 40))
    )::smallint;
  else
    new.ovr_base := public.pm_player_overall_from_stats(
      v_position,
      new.base_card_stats,
      coalesce(new.ovr_base, new.ovr_current, 40)::smallint
    );
  end if;

  if new.owner_id is null then
    new.card_stats := new.base_card_stats;
  elsif v_should_seed_current then
    new.card_stats := coalesce(
      new.base_card_stats,
      public.pm_player_seed_card_stats(
        v_position,
        coalesce(
          case when v_lock_real_ea_ovr then new.ea_fc_ovr end,
          new.ovr_current,
          new.ovr_base,
          40
        )::smallint
      )
    );
  end if;

  if v_lock_real_ea_ovr then
    new.ovr_current := greatest(
      35,
      least(99, coalesce(new.ovr_current, new.ovr_base, new.ea_fc_ovr, 40))
    )::smallint;
  else
    new.ovr_current := public.pm_player_overall_from_stats(
      v_position,
      new.card_stats,
      new.ovr_base
    );
  end if;

  -- tac is now a trained attribute (grows via the XP development pipeline); only
  -- seed it from the formula when unset, so trained values are never overwritten.
  if new.tac is null then
    new.tac := public.pm_player_compute_tac(
      new.ovr_current, new.primary_position, new.normalized_name, new.card_stats
    );
  end if;

  return new;
end;
$function$;

create or replace function public.pm_grant_match_development(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  r record;
  v_pos text;
  v_deadline smallint;
  v_coach_level smallint;
  v_age_mult numeric;
  v_cap smallint;
  v_headroom numeric;
  v_budget integer;
  v_focus text[];
  v_pending jsonb;
  v_label text;
  v_val integer;
  v_cost integer;
  v_raised boolean;
  v_tac smallint;
  v_tac_cap smallint;
begin
  for r in
    select p.id, coalesce(p.age,18) as age, p.ovr_base, p.ovr_current, p.talent,
           coalesce(p.tac, 60) as tac,
           upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
           coalesce(p.pending_card_stats, p.card_stats,
                    public.pm_player_seed_card_stats(upper(coalesce(s.position,p.primary_position,'CM')), p.ovr_base)) as stats,
           coalesce(p.xp, 0) as xp
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11
  loop
    v_pos := r.pos;
    select coalesce(max(level),0) into v_coach_level
    from public.pm_staff
    where team_id = p_team_id and role_key = (case
      when v_pos = 'GK' then 'gk_coach'
      when v_pos in ('CB','LB','RB') then 'defence_coach'
      when v_pos in ('CDM','CM','CAM','AM','LM','RM') then 'midfield_coach'
      else 'attack_coach' end);

    v_deadline := case v_coach_level when 5 then 25 when 4 then 27 when 3 then 28 when 2 then 29 when 1 then 30 else 31 end;
    v_age_mult := greatest(0, least(1, (v_deadline - r.age)::numeric / nullif(v_deadline - 18, 0)));
    v_cap := r.ovr_base + public.pm_player_ovr_growth_cap(r.talent);
    v_headroom := greatest(0.1, least(1, (v_cap - r.ovr_current + 4)::numeric / 12));

    -- Tactical (tac) trains alongside mini-stats: with a position coach and youth
    -- on its side, +1 per match toward a coach-scaled ceiling.
    v_tac := r.tac;
    v_tac_cap := least(99, 60 + v_coach_level * 6);
    if v_age_mult >= 0.6 and v_coach_level >= 1 and v_tac < v_tac_cap then
      v_tac := v_tac + 1;
    end if;

    v_budget := r.xp + round(120 * v_age_mult * (1 + v_coach_level * 0.08) * v_headroom);

    v_focus := public.pm_player_training_focus(v_pos);
    v_pending := r.stats;
    if jsonb_typeof(v_pending) is distinct from 'object' then
      v_pending := public.pm_player_seed_card_stats(v_pos, coalesce(r.ovr_base, r.ovr_current, 60)::smallint);
    end if;
    if jsonb_typeof(v_pending) is distinct from 'object' then
      -- still grant tac even if stats can't be processed
      update public.pm_players set tac = v_tac where id = r.id;
      continue;
    end if;

    if v_budget > 0 then
      loop
        v_raised := false;
        foreach v_label in array v_focus loop
          v_val := coalesce((v_pending->>v_label)::int, 40);
          if v_val < 99 then
            v_cost := 50 + v_val * 3;
            if v_budget >= v_cost then
              v_budget := v_budget - v_cost;
              v_pending := jsonb_set(v_pending, array[v_label], to_jsonb(v_val + 1), true);
              v_raised := true;
            end if;
          end if;
        end loop;
        exit when not v_raised;
      end loop;
    end if;

    update public.pm_players
    set xp = v_budget, pending_card_stats = v_pending, tac = v_tac
    where id = r.id;
  end loop;
end;
$$;
