-- Perf indexes on hot query paths + wallet non-negative backstop (deep audit).

-- The unread-DM badge polls this every 30s for every logged-in user:
--   conversation_id IN (...) AND sender_id <> me AND read_at IS NULL AND deleted_at IS NULL
-- Existing indexes are (conversation_id, created_at) and (sender_id) — neither
-- covers the unread predicate. Partial index keyed on the exact filter.
create index if not exists conversation_messages_unread_idx
  on public.conversation_messages (conversation_id, sender_id)
  where read_at is null and deleted_at is null;

-- Feed timeline + profile posts query:
--   author_id [IN] ... AND deleted_at IS NULL ORDER BY created_at DESC
-- Existing indexes are single-column (author_id) and (created_at); no composite,
-- no partial on deleted_at.
create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc)
  where deleted_at is null;

-- Defense-in-depth: every wallet deduction path is a SECURITY DEFINER function
-- that pre-checks sufficiency, but there is no DB-level backstop against a
-- future bug/race driving a balance negative. playmanager's own wallet table
-- already carries this (check balance >= 0). Verified 0 existing rows violate
-- it before adding. Guarded so a re-run via `supabase db push` is idempotent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wallets_nc_balance_nonneg') then
    alter table public.wallets add constraint wallets_nc_balance_nonneg check (nc_balance >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wallets_pro_balance_nonneg') then
    alter table public.wallets add constraint wallets_pro_balance_nonneg check (pro_balance >= 0);
  end if;
end $$;
