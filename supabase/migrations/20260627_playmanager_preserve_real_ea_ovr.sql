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

  return new;
end;
$$;

alter table public.pm_players disable trigger pm_players_sync_card_stats;

update public.pm_players
set
  ovr_base = greatest(35, least(99, ea_fc_ovr))::smallint,
  ovr_current = greatest(35, least(99, ea_fc_ovr))::smallint
where coalesce(is_real, false)
  and lower(coalesce(ovr_source, '')) = 'ea_fc'
  and ea_fc_ovr is not null
  and (
    ovr_base is distinct from greatest(35, least(99, ea_fc_ovr))::smallint
    or ovr_current is distinct from greatest(35, least(99, ea_fc_ovr))::smallint
  );

alter table public.pm_players enable trigger pm_players_sync_card_stats;
