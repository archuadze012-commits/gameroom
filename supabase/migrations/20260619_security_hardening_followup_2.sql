-- Final security follow-up: move admin RLS checks to private.is_admin(),
-- then lock the public wrapper and unused like helper to service_role only.

drop policy if exists "aa_admin_all" on public.admin_actions;
create policy "aa_admin_all"
on public.admin_actions
for all
using (private.is_admin());

drop policy if exists "featured_admin_write" on public.featured_content;
create policy "featured_admin_write"
on public.featured_content
for all
using (private.is_admin());

drop policy if exists "hidden_cg_select_admin" on public.hidden_cracked_games;
create policy "hidden_cg_select_admin"
on public.hidden_cracked_games
for select
using (private.is_admin());

drop policy if exists "mq_admin_all" on public.moderation_queue;
create policy "mq_admin_all"
on public.moderation_queue
for all
using (private.is_admin());

drop policy if exists "pinned_admin_write" on public.pinned_content;
create policy "pinned_admin_write"
on public.pinned_content
for all
using (private.is_admin());

drop policy if exists "rep_select_own" on public.reports;
create policy "rep_select_own"
on public.reports
for select
using (
  ((select auth.uid()) = reporter_id)
  or private.is_admin()
);

drop policy if exists "rep_update_admin" on public.reports;
create policy "rep_update_admin"
on public.reports
for update
using (private.is_admin());

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;

revoke execute on function public.toggle_post_like(uuid, uuid) from public, anon, authenticated;
grant execute on function public.toggle_post_like(uuid, uuid) to service_role;
