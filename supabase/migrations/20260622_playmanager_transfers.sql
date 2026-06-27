create table if not exists public.pm_transfer_offers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.pm_players(id) on delete cascade,
  from_team_id uuid not null references public.pm_teams(id) on delete cascade,
  to_team_id uuid not null references public.pm_teams(id) on delete cascade,
  offer_type text not null check (offer_type in ('transfer', 'loan')),
  amount_gel bigint not null,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'cancelled')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicate pending offers from same team for same player
create unique index if not exists pm_transfer_offers_unique_pending 
on public.pm_transfer_offers (player_id, from_team_id) 
where status = 'pending';

-- RLS
alter table public.pm_transfer_offers enable row level security;

drop policy if exists "pm_transfer_offers_select" on public.pm_transfer_offers;
create policy "pm_transfer_offers_select"
on public.pm_transfer_offers
for select
using (
  from_team_id in (select id from public.pm_teams where user_id = auth.uid()) or
  to_team_id in (select id from public.pm_teams where user_id = auth.uid())
);

drop policy if exists "pm_transfer_offers_insert" on public.pm_transfer_offers;
create policy "pm_transfer_offers_insert"
on public.pm_transfer_offers
for insert
with check (
  from_team_id in (select id from public.pm_teams where user_id = auth.uid())
);

drop policy if exists "pm_transfer_offers_update" on public.pm_transfer_offers;
create policy "pm_transfer_offers_update"
on public.pm_transfer_offers
for update
using (
  from_team_id in (select id from public.pm_teams where user_id = auth.uid()) or
  to_team_id in (select id from public.pm_teams where user_id = auth.uid())
);

revoke insert, update, delete on public.pm_transfer_offers from anon, authenticated;

-- Ensure triggers to update updated_at if needed, but not strictly required for MVP if we rely on RPCs.
