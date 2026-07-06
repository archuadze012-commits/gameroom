-- XP economy policy: cap create-flow XP per source per day. award_xp_once closed
-- the like/follow toggle farm, but "create content → get XP" flows (feed post +10,
-- LFG post +5) were still uncapped, so create→delete→create farmed XP. This awards
-- create XP only up to p_daily_cap events of that source_type per user per (UTC)
-- day; a distinct ledger row per award means a delete+recreate still counts toward
-- the cap. Returns true if this call awarded, false if the daily cap is reached.

create or replace function public.award_xp_capped(
  p_user_id uuid,
  p_amount integer,
  p_source_type text,
  p_daily_cap integer
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0
     or p_source_type is null or p_daily_cap is null or p_daily_cap <= 0 then
    raise exception 'invalid award_xp_capped arguments';
  end if;

  select count(*) into v_today
  from public.xp_events
  where user_id = p_user_id
    and source_type = p_source_type
    and created_at >= date_trunc('day', now());

  if v_today >= p_daily_cap then
    return false; -- daily cap reached — no more XP from this source today
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (p_user_id, p_source_type, gen_random_uuid()::text, p_amount);

  perform public.award_xp(p_user_id, p_amount);
  return true;
end;
$$;

revoke all on function public.award_xp_capped(uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.award_xp_capped(uuid, integer, text, integer) to service_role;
