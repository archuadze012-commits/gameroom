import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SiteContent = {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
};

// Tag used to invalidate this cache on save (see /api/admin/content POST).
export const SITE_CONTENT_CACHE_TAG = "site-content";

// site_content is public, non-personalized copy (guest hero, CTAs, section
// titles) that almost never changes — cache it across requests with
// next/cache's persistent store (survives `export const dynamic =
// "force-dynamic"` on callers like the home page, which only forces `fetch()`
// to skip caching, not unstable_cache). Uses the admin client rather than the
// per-request server client: unstable_cache scopes can't read cookies(), and
// this data isn't user-scoped anyway.
const fetchSiteContentFromDb = unstable_cache(
  async (key: string): Promise<SiteContent | null> => {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("site_content")
        .select("key, value, updated_at")
        .eq("key", key)
        .maybeSingle();
      if (error || !data) return null;
      return {
        key: data.key,
        value: (data.value ?? {}) as Record<string, unknown>,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },
  ["site-content"],
  { tags: [SITE_CONTENT_CACHE_TAG], revalidate: 300 },
);

export const getSiteContent = cache(async (key: string): Promise<SiteContent | null> => {
  const k = key.trim();
  if (!k) return null;
  return fetchSiteContentFromDb(k);
});

export async function getSiteContentValue<T extends Record<string, unknown>>(
  key: string,
  fallback: T
): Promise<T> {
  const row = await getSiteContent(key);
  const val = row?.value;
  if (!val || typeof val !== "object" || Array.isArray(val)) return fallback;
  return { ...fallback, ...(val as T) };
}

