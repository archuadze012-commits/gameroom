alter function public.award_xp(uuid, integer) set search_path = public, pg_temp;
alter function public.equip_item(uuid) set search_path = public, pg_temp;
alter function public.unequip_category(text) set search_path = public, pg_temp;
alter function public.toggle_post_like(uuid, uuid) set search_path = public, pg_temp;
alter function public.create_wallet_for_new_user() set search_path = public, pg_temp;
alter function public.update_last_seen_at() set search_path = public, pg_temp;
alter function public.expire_old_lfg_posts() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.lfg_response_to_comment() set search_path = public, pg_temp;
alter function public.notify_lfg_response() set search_path = public, pg_temp;

create or replace function public.award_xp(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_new_xp integer;
  v_new_level integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid award_xp arguments';
  end if;

  update public.profiles
  set xp = coalesce(xp, 0) + p_amount,
      last_xp_at = now()
  where id = p_user_id
  returning xp into v_new_xp;

  if v_new_xp is null then
    raise exception 'profile not found';
  end if;

  v_new_level := greatest(1, floor(sqrt(v_new_xp::numeric / 100.0))::int + 1);

  update public.profiles
  set level = v_new_level
  where id = p_user_id;

  return v_new_xp;
end;
$function$;

create or replace function public.toggle_post_like(p_post_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  already_liked boolean;
begin
  if v_actor_id is null or p_user_id is distinct from v_actor_id then
    raise exception 'unauthorized';
  end if;

  select exists (
    select 1 from public.post_likes where post_id = p_post_id and user_id = v_actor_id
  ) into already_liked;

  if already_liked then
    delete from public.post_likes where post_id = p_post_id and user_id = v_actor_id;
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = p_post_id;
    return false;
  end if;

  insert into public.post_likes(post_id, user_id) values (p_post_id, v_actor_id);
  update public.posts set likes_count = likes_count + 1 where id = p_post_id;
  return true;
end;
$function$;

revoke execute on function public.award_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, integer) to service_role;

revoke execute on function public.equip_item(uuid) from public, anon;
grant execute on function public.equip_item(uuid) to authenticated, service_role;

revoke execute on function public.unequip_category(text) from public, anon;
grant execute on function public.unequip_category(text) to authenticated, service_role;

revoke execute on function public.toggle_post_like(uuid, uuid) from public, anon;
grant execute on function public.toggle_post_like(uuid, uuid) to authenticated, service_role;

revoke execute on function public.create_wallet_for_new_user() from public, anon, authenticated;
revoke execute on function public.expire_old_lfg_posts() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.lfg_response_to_comment() from public, anon, authenticated;
revoke execute on function public.notify_lfg_response() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "banners_select_public" on storage.objects;
drop policy if exists "post_media_select_public" on storage.objects;

create policy "avatars_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "banners_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "post_media_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'post_media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profiles_insert_public" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "blocked_words_insert_admin" on public.blocked_words;
create policy "blocked_words_insert_admin"
on public.blocked_words
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "blocked_words_delete_admin" on public.blocked_words;
create policy "blocked_words_delete_admin"
on public.blocked_words
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts
for insert
to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts
for delete
to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "lfg_posts_insert_own" on public.lfg_posts;
create policy "lfg_posts_insert_own"
on public.lfg_posts
for insert
to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows
for insert
to authenticated
with check ((select auth.uid()) = follower_id);

drop policy if exists "cracked_games_admin_write" on public.cracked_games;
create policy "cracked_games_admin_insert"
on public.cracked_games
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role)
);
create policy "cracked_games_admin_update"
on public.cracked_games
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role)
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role)
);
create policy "cracked_games_admin_delete"
on public.cracked_games
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role)
);

drop policy if exists "admins can manage games" on public.games;
create policy "games_admin_insert"
on public.games
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);
create policy "games_admin_update"
on public.games
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);
create policy "games_admin_delete"
on public.games
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);

drop policy if exists "admins can manage hidden games" on public.hidden_cracked_games;
create policy "hidden_cracked_games_admin_insert"
on public.hidden_cracked_games
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);
create policy "hidden_cracked_games_admin_update"
on public.hidden_cracked_games
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);
create policy "hidden_cracked_games_admin_delete"
on public.hidden_cracked_games
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::public.user_role, 'moderator'::public.user_role]))
);

drop policy if exists "linked_accounts_modify_own" on public.linked_accounts;
create policy "linked_accounts_insert_own"
on public.linked_accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);
create policy "linked_accounts_update_own"
on public.linked_accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "linked_accounts_delete_own"
on public.linked_accounts
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "purchases_select_own" on public.user_purchases;

drop index if exists public.idx_room_chat_room_id_created;
