update public.pm_players
set
  status = 'active',
  retired_at = null
where is_real = true
  and owner_id is null
  and status = 'retired';
