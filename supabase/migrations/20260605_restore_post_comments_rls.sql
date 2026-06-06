alter table public.post_comments enable row level security;

revoke all on table public.post_comments from anon;
grant select, insert on table public.post_comments to authenticated;

drop policy if exists "post_comments_select_auth" on public.post_comments;
create policy "post_comments_select_auth"
on public.post_comments
for select
to authenticated
using (true);

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own"
on public.post_comments
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.banned = true
  )
);
