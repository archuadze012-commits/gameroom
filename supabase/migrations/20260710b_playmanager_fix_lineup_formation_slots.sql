-- PlayManager: fix lineup/formation persistence (was broken for every user).
--
-- pm_save_lineup_formation wrote the raw slot label into pm_squads.position.
-- The preset formations (src/lib/playmanager/formations.ts) use visual labels
-- like LCB/RCB/LWB/RWB/LM/RM/CF, but pm_squads.position has a CHECK constraint
-- allowing only the 10 canonical slots (GK,CB,LB,RB,CDM,CM,CAM,LW,RW,ST).
-- Every save therefore hit a check_violation on the first LCB write, aborted the
-- whole transaction, and the user saw "შემადგენლობა ვერ შეინახა" — lineup and
-- formation persistence never succeeded, which also silently disabled the
-- position-fit / psychologist pipeline that reads saved slots.
--
-- Fix: normalise each slot label to a canonical position before writing, so the
-- CHECK always passes and stored positions stay canonical (the match engine
-- reads canonical labels). Wing-back / wide-mid labels collapse to the same
-- mapping pm_open_pack already uses (LM->LW, RM->RW, LWB->LB, RWB->RB, CF->ST).

create or replace function public.pm_save_lineup_formation(p_team_id uuid, p_formation text, p_slots jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ord smallint := 1;
  v_elem jsonb;
  v_pid uuid;
  v_slot text;
begin
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 then
    raise exception 'invalid_lineup';
  end if;

  if (select count(distinct (value->>'playerId')) from jsonb_array_elements(p_slots)) <> jsonb_array_length(p_slots) then
    raise exception 'duplicate_player';
  end if;

  perform public.pm_ensure_match_settings(p_team_id);

  for v_elem in select value from jsonb_array_elements(p_slots) loop
    v_pid := (v_elem->>'playerId')::uuid;
    v_slot := nullif(upper(trim(coalesce(v_elem->>'slot', ''))), '');

    if v_slot is not null then
      v_slot := case v_slot
        when 'GK'  then 'GK'
        when 'CB'  then 'CB'
        when 'LCB' then 'CB'
        when 'RCB' then 'CB'
        when 'LB'  then 'LB'
        when 'LWB' then 'LB'
        when 'RB'  then 'RB'
        when 'RWB' then 'RB'
        when 'CDM' then 'CDM'
        when 'CM'  then 'CM'
        when 'LCM' then 'CM'
        when 'RCM' then 'CM'
        when 'CAM' then 'CAM'
        when 'AM'  then 'CAM'
        when 'LW'  then 'LW'
        when 'LM'  then 'LW'
        when 'RW'  then 'RW'
        when 'RM'  then 'RW'
        when 'ST'  then 'ST'
        when 'CF'  then 'ST'
        else 'CM'
      end;
    end if;

    update public.pm_squads
    set
      shirt_number = v_ord,
      position = case when v_ord <= 11 and v_slot is not null then v_slot else position end
    where team_id = p_team_id and player_id = v_pid;

    if not found then
      raise exception 'player_not_found';
    end if;

    v_ord := v_ord + 1;
  end loop;

  update public.pm_squads
  set shirt_number = v_ord + id::smallint
  where team_id = p_team_id
    and player_id not in (select (value->>'playerId')::uuid from jsonb_array_elements(p_slots));

  update public.pm_match_settings
  set formation = coalesce(nullif(trim(p_formation), ''), '4-3-3'),
      updated_at = now()
  where team_id = p_team_id;

  return jsonb_build_object('saved', true, 'lineupSize', jsonb_array_length(p_slots), 'formation', p_formation);
end;
$function$;

revoke execute on function public.pm_save_lineup_formation(uuid, text, jsonb) from anon, authenticated, public;
grant  execute on function public.pm_save_lineup_formation(uuid, text, jsonb) to service_role;
