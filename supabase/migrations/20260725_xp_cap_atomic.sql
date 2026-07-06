-- Close a TOCTOU race in award_xp_capped. The original counted xp_events rows
-- for the (user, source_type, today) window and THEN inserted — two concurrent
-- calls could both read count < cap before either inserted, so a parallel burst
-- (e.g. rapid double-submit across serverless instances) could push a source a
-- few awards past its daily cap. Take a per-(user, source_type) transaction-level
-- advisory lock first: concurrent calls for the SAME key serialize (each sees the
-- other's insert), while different users/sources never contend. The lock is held
-- to COMMIT, so the count and the insert are effectively atomic for a given key.

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

  -- Serialize concurrent awards for this exact (user, source_type) so the
  -- count-then-insert below is race-free. hashtext-based key; other keys don't
  -- contend. Released automatically at end of transaction.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_source_type));

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
