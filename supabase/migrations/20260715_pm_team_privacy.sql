-- Per-team privacy toggles so a manager can hide competitive intel (squad
-- composition, wallet balance, transfer history) from OTHER managers on the
-- public manager/team/player pages. 1:1 side-table modelled on pm_match_settings
-- (pm_teams is deliberately minimal and its direct writes are revoked, so this
-- lives in its own table written only through a SECURITY DEFINER RPC).

create table if not exists public.pm_team_privacy (
  team_id uuid primary key references public.pm_teams(id) on delete cascade,
  hide_squad boolean not null default false,
  hide_wallet boolean not null default false,
  hide_transfers boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.pm_team_privacy enable row level security;

-- Owner can read their own settings (the settings UI). Other users never read
-- this directly — the public pages resolve it server-side with the service-role
-- client, so no broad SELECT policy is needed.
drop policy if exists "pm_team_privacy_owner_select" on public.pm_team_privacy;
create policy "pm_team_privacy_owner_select" on public.pm_team_privacy
  for select using (
    team_id in (select id from public.pm_teams where user_id = auth.uid())
  );

create or replace function public.pm_set_team_privacy(
  p_team_id uuid,
  p_hide_squad boolean,
  p_hide_wallet boolean,
  p_hide_transfers boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.pm_team_privacy%rowtype;
begin
  insert into public.pm_team_privacy (team_id, hide_squad, hide_wallet, hide_transfers)
  values (p_team_id, p_hide_squad, p_hide_wallet, p_hide_transfers)
  on conflict (team_id) do update set
    hide_squad = excluded.hide_squad,
    hide_wallet = excluded.hide_wallet,
    hide_transfers = excluded.hide_transfers,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'hideSquad', v_row.hide_squad,
    'hideWallet', v_row.hide_wallet,
    'hideTransfers', v_row.hide_transfers
  );
end;
$$;

revoke all on function public.pm_set_team_privacy(uuid, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function public.pm_set_team_privacy(uuid, boolean, boolean, boolean) to service_role;
