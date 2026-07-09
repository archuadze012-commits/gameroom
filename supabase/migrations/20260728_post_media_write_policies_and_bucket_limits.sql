-- post_media write policies + bucket size/MIME limits (playgame media buckets)
--
-- Fixes two issues found in the deep audit pass:
--
-- 1. FUNCTIONAL BUG (post images broken): post_media's owner-scoped SELECT
--    policy was dropped in 20260619_security_hardening_followup.sql and no
--    INSERT/UPDATE/DELETE policy was ever created for it. With RLS enabled on
--    storage.objects and NO post_media policy of any kind, authenticated
--    client-side uploads to post_media (feed post images — post-composer.tsx,
--    feed-client.tsx, both anon-key browser clients writing `${uid}/...`) are
--    denied by RLS (403), so attaching images to posts is silently broken.
--    avatars/banners have proper owner-scoped write policies; post_media never
--    got them back. These policies restore uploads AND enforce that a user can
--    only write inside their own `{uid}/` folder (no cross-user writes).
--
-- 2. HARDENING (unbounded uploads): avatars/banners/post_media are PUBLIC
--    buckets with file_size_limit = null and allowed_mime_types = null, so the
--    only gate on size/type is client-side JS. A user calling storage.upload()
--    directly could store an arbitrarily large file, or an executable
--    content-type (svg/html) served publicly with that type (stored XSS).
--    Enforce size + raster-image-only MIME at the bucket level.

-- ── post_media owner-scoped write policies (mirror avatars_/banners_upload_own) ──
drop policy if exists "post_media_insert_own" on storage.objects;
drop policy if exists "post_media_update_own" on storage.objects;
drop policy if exists "post_media_delete_own" on storage.objects;

create policy "post_media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post_media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "post_media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'post_media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "post_media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post_media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── bucket-level size + MIME enforcement (was null = unbounded) ──
-- Raster image types only; image/svg+xml is intentionally excluded (public
-- bucket + SVG can carry inline <script> → stored XSS). Limits mirror the
-- existing client-side checks so no legitimate upload path is tightened.
update storage.buckets
  set file_size_limit = 5242880, -- 5 MB, matches avatar-upload.tsx
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']
  where id = 'avatars';

update storage.buckets
  set file_size_limit = 8388608, -- 8 MB, matches banner-upload.tsx
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']
  where id = 'banners';

update storage.buckets
  set file_size_limit = 8388608, -- 8 MB, matches post-composer.tsx
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']
  where id = 'post_media';
