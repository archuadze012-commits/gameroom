import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const GOOGLE_AVATAR_HOST = "lh3.googleusercontent.com";
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isGoogleAvatarUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === GOOGLE_AVATAR_HOST;
  } catch {
    return false;
  }
}

export async function cacheGoogleAvatar(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string | null | undefined
) {
  if (!sourceUrl || !isGoogleAvatarUrl(sourceUrl)) return null;

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
    const extension = IMAGE_EXTENSIONS[contentType];
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (!extension || declaredSize > MAX_AVATAR_BYTES) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;

    const path = `${userId}/google-avatar.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(path, bytes, {
      upsert: true,
      cacheControl: "3600",
      contentType,
    });
    if (error) return null;

    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
