-- Enable Supabase realtime for pm_transfer_offers so the transfer-market inbox
-- updates live (incoming offers, accept/reject/counter) instead of polling the
-- API every 20s. Row visibility is still governed by the existing owner-scoped
-- pm_transfer_offers_select RLS policy — a manager only receives change events
-- for offers where their team is the from/to side.
--
-- Idempotent: adding a table already in the publication errors, so guard on
-- pg_publication_tables.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pm_transfer_offers'
  ) then
    alter publication supabase_realtime add table public.pm_transfer_offers;
  end if;
end $$;
