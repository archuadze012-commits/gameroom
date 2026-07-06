-- Distributed rate limiter. The in-memory limiter (src/lib/rate-limit.ts) is
-- per-instance, so on multi-instance serverless (Vercel) the effective limit is
-- N× the intended one. This shared Postgres counter makes the limit hold across
-- all instances. The app calls it via rateLimitShared(), falling back to the
-- in-memory limiter if this RPC ever errors (degraded, but never fail-open).

create table if not exists public.rate_limits (
  bucket_key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

-- Only the service-role limiter path writes here; RLS on + no policy = deny-all
-- for anon/authenticated (service_role bypasses RLS).
alter table public.rate_limits enable row level security;

-- Atomic hit: increment the bucket for p_key within a p_window_ms window and
-- return whether the caller is still under p_limit. A single upserting statement,
-- so concurrent hits across instances can't race the counter. Expired windows
-- reset to 1 on the next hit.
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
