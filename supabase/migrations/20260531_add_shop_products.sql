-- Public marketplace products for /shop.
-- Writes are restricted both by route handlers and by RLS for direct Supabase access.

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  title varchar(140) not null check (char_length(trim(title)) > 0),
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text check (image_url is null or image_url ~ '^(https?://|/)'),
  category varchar(80) not null default 'general' check (char_length(trim(category)) > 0),
  is_active boolean not null default true,
  status varchar(24) not null default 'in_stock' check (status in ('in_stock', 'out_of_stock', 'preorder')),
  stock integer check (stock is null or stock >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_products_active_idx
  on public.shop_products (created_at desc)
  where is_active = true;

create index if not exists shop_products_category_idx
  on public.shop_products (category, is_active);

create or replace function public.set_shop_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shop_products_updated_at on public.shop_products;
create trigger set_shop_products_updated_at
before update on public.shop_products
for each row
execute function public.set_shop_products_updated_at();

create or replace function public.can_manage_shop_products()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'moderator')
      and coalesce(banned, false) = false
  );
$$;

revoke all on function public.can_manage_shop_products() from public;
grant execute on function public.can_manage_shop_products() to authenticated;

alter table public.shop_products enable row level security;

drop policy if exists "shop_products_select_active" on public.shop_products;
create policy "shop_products_select_active"
on public.shop_products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "shop_products_insert_manage_shop" on public.shop_products;
create policy "shop_products_insert_manage_shop"
on public.shop_products
for insert
to authenticated
with check (public.can_manage_shop_products());

drop policy if exists "shop_products_update_manage_shop" on public.shop_products;
create policy "shop_products_update_manage_shop"
on public.shop_products
for update
to authenticated
using (public.can_manage_shop_products())
with check (public.can_manage_shop_products());

drop policy if exists "shop_products_delete_manage_shop" on public.shop_products;
create policy "shop_products_delete_manage_shop"
on public.shop_products
for delete
to authenticated
using (public.can_manage_shop_products());

grant select on table public.shop_products to anon, authenticated;
grant insert, update, delete on table public.shop_products to authenticated;
