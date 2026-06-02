-- UI stores public URLs for avatars, banners, and feed attachments.
-- Keep owner-only writes, but restore anonymous/authenticated reads so
-- deployed pages can render media without a signed URL flow.

drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "banners_select_own" on storage.objects;
drop policy if exists "banners_read_public" on storage.objects;
create policy "banners_read_public"
on storage.objects
for select
using (bucket_id = 'banners');

drop policy if exists "post_media_select_own" on storage.objects;
drop policy if exists "post_media_read_public" on storage.objects;
drop policy if exists "post_media_select_public" on storage.objects;
create policy "post_media_read_public"
on storage.objects
for select
using (bucket_id = 'post_media');
