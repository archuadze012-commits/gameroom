drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
)
with check (
  id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "profiles_admin_update" on public.profiles;
