alter table public.user_purchases enable row level security;
alter table public.user_equipped enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all on table public.user_purchases from anon;
revoke insert, update, delete on table public.user_purchases from authenticated;
grant select on table public.user_purchases to authenticated;

revoke all on table public.user_equipped from anon;
revoke insert, update, delete on table public.user_equipped from authenticated;
grant select on table public.user_equipped to authenticated;

revoke all on table public.wallets from anon;
revoke insert, update, delete on table public.wallets from authenticated;
grant select on table public.wallets to authenticated;

revoke all on table public.wallet_transactions from anon;
revoke insert, update, delete on table public.wallet_transactions from authenticated;
grant select on table public.wallet_transactions to authenticated;

drop policy if exists "user_purchases_select_own" on public.user_purchases;
create policy "user_purchases_select_own"
on public.user_purchases
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_equipped_select_own" on public.user_equipped;
create policy "user_equipped_select_own"
on public.user_equipped
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own"
on public.wallets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own"
on public.wallet_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);
