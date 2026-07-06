-- rate_limits table cleanup. Rows are keyed by bucket_key and upserted, so the
-- table grows by DISTINCT key (users×endpoints, IPs×endpoints), not per request —
-- but keys that never recur (churned users, one-off IPs) accumulate forever.
-- pg_cron isn't enabled on this project, so we GC without an external scheduler:
--   • rate_limits_gc(): explicit purge of long-expired rows (also runnable
--     manually or from an edge function / app cron), and
--   • an opportunistic purge on ~0.5% of rate_limit_hit calls, which keeps the
--     table bounded automatically at negligible amortized cost.
-- "Long-expired" = reset_at older than 1 hour; live windows are seconds/minutes,
-- so this never drops an active counter.

create or replace function public.rate_limits_gc()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where reset_at < now() - interval '1 hour';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rate_limits_gc() from public, anon, authenticated;
grant execute on function public.rate_limits_gc() to service_role;

-- Re-create rate_limit_hit with the same atomic-upsert semantics plus an
-- opportunistic GC. random() < 0.005 → ~1 in 200 hits sweeps expired rows.
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_ms integer
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_key is null or p_limit is null or p_limit <= 0 or p_window_ms is null or p_window_ms <= 0 then
    raise exception 'invalid rate_limit_hit arguments';
  end if;

  -- Amortized cleanup: cheap, bounded, no scheduler needed.
  if random() < 0.005 then
    delete from public.rate_limits where reset_at < v_now - interval '1 hour';
  end if;

  insert into public.rate_limits (bucket_key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (bucket_key) do update set
    count = case when public.rate_limits.reset_at <= v_now then 1 else public.rate_limits.count + 1 end,
    reset_at = case when public.rate_limits.reset_at <= v_now
                    then v_now + make_interval(secs => p_window_ms / 1000.0)
                    else public.rate_limits.reset_at end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
