create or replace function public.pm_save_lineup_order(
  p_team_id uuid,
  p_lineup jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid;
  v_order smallint := 1;
begin
  if jsonb_typeof(p_lineup) <> 'array' then
    raise exception 'invalid_lineup';
  end if;

  if jsonb_array_length(p_lineup) = 0 then
    raise exception 'invalid_lineup';
  end if;

  if (
    select count(*)
    from (
      select distinct value::uuid as player_id
      from jsonb_array_elements_text(p_lineup)
    ) dedup
  ) <> jsonb_array_length(p_lineup) then
    raise exception 'duplicate_player';
  end if;

  for v_player_id in
    select value::uuid
    from jsonb_array_elements_text(p_lineup)
  loop
    update public.pm_squads
    set shirt_number = v_order
    where team_id = p_team_id and player_id = v_player_id;

    if not found then
      raise exception 'player_not_found';
    end if;

    v_order := v_order + 1;
  end loop;

  update public.pm_squads
  set shirt_number = v_order + id::smallint
  where team_id = p_team_id
    and player_id not in (
      select value::uuid
      from jsonb_array_elements_text(p_lineup)
    );

  return jsonb_build_object(
    'saved', true,
    'lineupSize', jsonb_array_length(p_lineup)
  );
end;
$$;

grant execute on function public.pm_save_lineup_order(uuid, jsonb) to service_role;
