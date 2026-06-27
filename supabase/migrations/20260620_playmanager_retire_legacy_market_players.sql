create or replace function public.pm_retire_legacy_market_players()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_retired integer := 0;
begin
  update public.pm_players p
  set status = 'retired',
      retired_at = now()
  where p.is_real = true
    and p.owner_id is null
    and p.status = 'active'
    and not exists (
      select 1
      from public.pm_players canonical
      where canonical.is_real = true
        and canonical.owner_id is null
        and canonical.status = 'active'
        and canonical.normalized_name = p.normalized_name
        and canonical.ea_fc_ovr is not null
        and canonical.primary_position is not null
        and canonical.age > 18
        and canonical.id <> p.id
    )
    and (
      p.primary_position is null
      or p.ea_fc_ovr is null
      or p.age = 18
      or p.display_name ~ '[A-Za-z].*[؀-ۿ]'
      or p.display_name ~ '[؀-ۿ].*[A-Za-z]'
    );

  get diagnostics v_retired = row_count;
  return v_retired;
end;
$$;

select public.pm_retire_legacy_market_players();
