-- PlayManager: TAC (tactical / footballing intelligence) — a 7th attribute that
-- names the gap between a player's OVR and the simple average of his 6 face
-- stats. Designed derivation (validated on the live pool): anchored on OVR + the
-- real stat-gap + a position role-bias + a deterministic name-seed. OVR is NOT
-- changed (ea_fc_ovr stays the anchor for real players). TAC is shown only on the
-- player page (never on the FUT card) and feeds the match engine (style execution).
--
-- The `tac` column is created in 20260627_playmanager_match_engine_tactical_depth.sql
-- (the engine reads it); this migration adds the computation, auto-maintenance and
-- backfill. Validated samples: Wirtz 92 · Salah 87 · Van Dijk 78 · low pros ~50.

-- TAC column (idempotent — also declared by the engine migration). Adding it here
-- lets this migration ship TAC on its own, without applying the engine rebalance.
alter table public.pm_players add column if not exists tac smallint;

create or replace function public.pm_player_compute_tac(
  p_ovr smallint,
  p_position text,
  p_normalized_name text,
  p_card_stats jsonb
) returns smallint
language sql
stable
set search_path = public, pg_temp
as $$
  select greatest(45, least(99, round(
    case
      when coalesce(p_card_stats, '{}'::jsonb) ? 'PAC' then
        0.62 * coalesce(p_ovr, 60)
        + 18
        + 1.2 * (coalesce(p_ovr, 60) - (
            ( coalesce((p_card_stats->>'PAC')::numeric, p_ovr)
            + coalesce((p_card_stats->>'SHO')::numeric, p_ovr)
            + coalesce((p_card_stats->>'PAS')::numeric, p_ovr)
            + coalesce((p_card_stats->>'DRI')::numeric, p_ovr)
            + coalesce((p_card_stats->>'DEF')::numeric, p_ovr)
            + coalesce((p_card_stats->>'PHY')::numeric, p_ovr) ) / 6.0
          ))
        + case upper(coalesce(nullif(p_position, ''), 'CM'))
            when 'CB' then 3 when 'LCB' then 3 when 'RCB' then 3 when 'CDM' then 3
            when 'CM' then 2 when 'LCM' then 2 when 'RCM' then 2 when 'CAM' then 2 when 'AM' then 2
            when 'LB' then 1 when 'RB' then 1 when 'LWB' then 1 when 'RWB' then 1
            when 'LW' then -1 when 'RW' then -1 when 'LM' then -1 when 'RM' then -1
            when 'ST' then -2 when 'CF' then -2
            else 0
          end
        + ((abs(hashtext(coalesce(p_normalized_name, ''))) % 7) - 3)
      else
        -- GK (different stat keys): anchor on OVR only.
        0.66 * coalesce(p_ovr, 60) + 20 + ((abs(hashtext(coalesce(p_normalized_name, ''))) % 7) - 3)
    end
  )))::smallint;
$$;

grant execute on function public.pm_player_compute_tac(smallint, text, text, jsonb) to authenticated, service_role;

-- Keep TAC in sync whenever a player's stats / OVR / position change. This is the
-- existing stats→OVR sync trigger (latest version from
-- 20260627_playmanager_preserve_real_ea_ovr.sql) with one extra line that sets tac.
create or replace function public.pm_players_sync_card_stats()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
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

  new.tac := public.pm_player_compute_tac(
    new.ovr_current, new.primary_position, new.normalized_name, new.card_stats
  );

  return new;
end;
$$;

-- Backfill every existing player.
update public.pm_players
set tac = public.pm_player_compute_tac(ovr_current, primary_position, normalized_name, card_stats)
where tac is distinct from public.pm_player_compute_tac(ovr_current, primary_position, normalized_name, card_stats);
