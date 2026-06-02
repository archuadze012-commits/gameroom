-- Security hardening pass (applied to production rpmzlkjqyncusbptzics)
-- Driven by Supabase security advisor findings. See review notes per item.

-- 1. badge_unlocks: remove the always-true public INSERT policy.
--    Previously any anon/authenticated client could POST to
--    /rest/v1/badge_unlocks and grant themselves (or others) any badge,
--    bypassing the server-side eligibility check in /api/badges/check.
--    Eligibility is computed server-side; the route now inserts via the
--    service-role client (bypasses RLS), so no client INSERT policy is needed.
DROP POLICY IF EXISTS "bu_insert_service" ON public.badge_unlocks;

-- 2. rls_auto_enable(): leftover no-op function with a mutable search_path.
ALTER FUNCTION public.rls_auto_enable() SET search_path = '';

-- 3. Public storage buckets exposed a broad SELECT (list) policy on
--    storage.objects, letting clients enumerate every file path. The app
--    only uses getPublicUrl() (no .list()/.download()/createSignedUrl), and
--    public buckets serve objects via the public CDN endpoint without an RLS
--    SELECT policy, so these are safe to drop.
DROP POLICY IF EXISTS "avatars_read_public"    ON storage.objects;
DROP POLICY IF EXISTS "banners_read_public"    ON storage.objects;
DROP POLICY IF EXISTS "post_media_read_public" ON storage.objects;

-- Reviewed and intentionally NOT changed:
--  * is_admin() SECURITY DEFINER — referenced by 8 RLS policies; only returns
--    the caller's own admin boolean. Revoking EXECUTE would break those
--    policies for authenticated users.
--  * open_box_bundle(), toggle_post_like() SECURITY DEFINER — both guard on
--    auth.uid() internally (correct pattern); DEFINER is required to mutate
--    wallets / likes_count under controlled conditions.
--  * Leaked Password Protection — enable in Auth dashboard (not SQL).
