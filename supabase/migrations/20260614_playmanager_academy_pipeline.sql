create table if not exists public.pm_academy_prospects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  position text not null check (position in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST')),
  age smallint not null check (age between 15 and 19),
  talent smallint not null check (talent between 1 and 10),
  ovr_base smallint not null check (ovr_base between 40 and 85),
  potential_ovr smallint not null check (potential_ovr between 50 and 99),
  signing_cost bigint not null default 120000 check (signing_cost >= 0),
  status text not null default 'active' check (status in ('active','signed','expired')),
  created_at timestamptz not null default now()
);

alter table public.pm_academy_prospects enable row level security;

drop policy if exists "pm_academy_prospects_owner_select" on public.pm_academy_prospects;
create policy "pm_academy_prospects_owner_select"
on public.pm_academy_prospects
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create index if not exists pm_academy_prospects_team_status_idx
  on public.pm_academy_prospects(team_id, status, created_at desc);

create or replace function public.pm_ensure_academy_prospects(
  p_team_id uuid,
  p_prospects jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_count integer;
  v_prospect jsonb;
begin
  select count(*) into v_existing_count
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active';

  if v_existing_count >= 3 then
    return;
  end if;

  for v_prospect in
    select *
    from jsonb_array_elements(p_prospects)
  loop
    exit when v_existing_count >= 3;

    insert into public.pm_academy_prospects (
      team_id,
      normalized_name,
      display_name,
      position,
      age,
      talent,
      ovr_base,
      potential_ovr,
      signing_cost
    )
    values (
      p_team_id,
      v_prospect->>'normalized_name',
      v_prospect->>'display_name',
      v_prospect->>'position',
      (v_prospect->>'age')::smallint,
      (v_prospect->>'talent')::smallint,
      (v_prospect->>'ovr_base')::smallint,
      coalesce((v_prospect->>'potential_ovr')::smallint, least(99, (v_prospect->>'ovr_base')::smallint + 18)),
      coalesce((v_prospect->>'signing_cost')::bigint, 120000)
    )
    on conflict do nothing;

    v_existing_count := v_existing_count + 1;
  end loop;
end;
$$;

create or replace function public.pm_sign_academy_prospect(
  p_team_id uuid,
  p_prospect_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prospect public.pm_academy_prospects%rowtype;
  v_player_id uuid;
begin
  select *
  into v_prospect
  from public.pm_academy_prospects
  where id = p_prospect_id
    and team_id = p_team_id
    and status = 'active'
  for update;

  if v_prospect.id is null then
    raise exception 'player_not_found';
  end if;

  if v_prospect.signing_cost > 0 then
    perform public.pm_debit(p_team_id, v_prospect.signing_cost, 'academy_signing');
  end if;

  insert into public.pm_players (
    normalized_name,
    display_name,
    talent,
    ovr_base,
    ovr_current,
    age,
    owner_id
  ) values (
    v_prospect.normalized_name,
    v_prospect.display_name,
    v_prospect.talent,
    v_prospect.ovr_base,
    v_prospect.ovr_base,
    v_prospect.age,
    p_team_id
  )
  on conflict (normalized_name) do nothing
  returning id into v_player_id;

  if v_player_id is null then
    raise exception 'player_unavailable';
  end if;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_prospect.position)
  on conflict (player_id) do nothing;

  update public.pm_academy_prospects
  set status = 'signed'
  where id = p_prospect_id;

  return jsonb_build_object(
    'playerId', v_player_id,
    'cost', v_prospect.signing_cost,
    'position', v_prospect.position
  );
end;
$$;

grant execute on function public.pm_ensure_academy_prospects(uuid, jsonb) to service_role;
grant execute on function public.pm_sign_academy_prospect(uuid, uuid) to service_role;

revoke insert, update, delete on public.pm_academy_prospects from anon, authenticated;
