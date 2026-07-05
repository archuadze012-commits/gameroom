-- Close the XP-farming exploit: awardBonusXp was purely additive with no ledger,
-- so a follow→unfollow→follow loop (+5 each) or like→unlike→like loop (+1 each)
-- against an alt account farmed unbounded XP/levels. This adds a per-relationship
-- idempotency ledger so a given (source_type, source_id) awards XP exactly once,
-- ever — re-toggling never re-awards.

create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,            -- the XP recipient
  source_type text not null,        -- 'follow' | 'post_like' | ...
  source_id text not null,          -- encodes the unique relationship, e.g. "<follower>:<following>"
  amount integer not null,
  created_at timestamptz not null default now(),
  constraint xp_events_source_uniq unique (source_type, source_id)
);

-- Only the service-role award path (below, SECURITY DEFINER) writes here. RLS on
-- with no policy = deny-all for anon/authenticated (defense in depth); service_role
-- bypasses RLS.
alter table public.xp_events enable row level security;

-- Award p_amount to p_user_id at most once per (p_source_type, p_source_id).
-- Returns true if this call awarded, false if it was a duplicate. Reuses the
-- existing award_xp for the actual xp/level math so behaviour stays identical.
create or replace function public.award_xp_once(
  p_user_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0
     or p_source_type is null or p_source_id is null then
    raise exception 'invalid award_xp_once arguments';
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (p_user_id, p_source_type, p_source_id, p_amount)
  on conflict (source_type, source_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false; -- already awarded for this relationship — no re-farming
  end if;

  perform public.award_xp(p_user_id, p_amount);
  return true;
end;
$$;

revoke all on function public.award_xp_once(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.award_xp_once(uuid, integer, text, text) to service_role;
