-- Site content key/value store for small copy & image URLs editable by admins.
-- NOTE: apply this migration in Supabase (prod) before using /admin/content.

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id) on delete set null
);

create index if not exists site_content_updated_at_idx on public.site_content (updated_at desc);

alter table public.site_content enable row level security;

-- Public read (pages can render without auth).
drop policy if exists site_content_select_all on public.site_content;
create policy site_content_select_all
on public.site_content
for select
using (true);

-- Admin-only writes (based on profiles.role).
drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write
on public.site_content
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

