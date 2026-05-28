import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SiteContent = {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
};

export const getSiteContent = cache(async (key: string): Promise<SiteContent | null> => {
  const k = key.trim();
  if (!k) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value, updated_at")
      .eq("key", k)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return {
      key: data.key,
      value: (data.value ?? {}) as Record<string, unknown>,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
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

